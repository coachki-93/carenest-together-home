
-- 1. edited_at column on handovers (populated by Batch C trigger; readable now for UI)
ALTER TABLE public.handovers
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

-- 2. handover_reads table — one row per (handover, reader). Immutable audit trail.
CREATE TABLE public.handover_reads (
  handover_id uuid NOT NULL REFERENCES public.handovers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (handover_id, user_id)
);

CREATE INDEX handover_reads_user_id_idx ON public.handover_reads(user_id);

GRANT SELECT, INSERT ON public.handover_reads TO authenticated;
GRANT ALL ON public.handover_reads TO service_role;

ALTER TABLE public.handover_reads ENABLE ROW LEVEL SECURITY;

-- SELECT: any family member (owners AND caregivers — is_family_member checks
-- membership regardless of role) of the handover's family can see all reads
-- for that handover.
CREATE POLICY "Family members can view handover reads"
ON public.handover_reads FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.handovers h
    WHERE h.id = handover_reads.handover_id
      AND public.is_family_member(h.family_id, auth.uid())
  )
);

-- INSERT: caregivers and owners can mark their own read receipt on any
-- handover in a family they belong to.
CREATE POLICY "Family members can insert own read receipt"
ON public.handover_reads FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.handovers h
    WHERE h.id = handover_reads.handover_id
      AND public.is_family_member(h.family_id, auth.uid())
  )
);

-- No UPDATE, no DELETE policies → table is append-only / immutable per user.

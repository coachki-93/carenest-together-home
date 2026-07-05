-- Add caregiver_profile_id to handover_reads so each caregiver profile on a
-- shared account gets its own read receipt.

-- 1. New column (nullable — legacy rows and non-shared accounts stay NULL).
ALTER TABLE public.handover_reads
  ADD COLUMN caregiver_profile_id UUID
    REFERENCES public.caregiver_profiles(id) ON DELETE SET NULL;

-- 2. Replace composite PK with surrogate id so we can key uniqueness on the
--    (handover, user, profile) triple instead.
ALTER TABLE public.handover_reads DROP CONSTRAINT handover_reads_pkey;
ALTER TABLE public.handover_reads
  ADD COLUMN id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY;

-- 3. One receipt per (handover, user, caregiver profile). NULL profile is
--    treated as a single bucket via COALESCE so a non-shared account still
--    gets exactly one row per handover.
CREATE UNIQUE INDEX handover_reads_unique_reader
  ON public.handover_reads (
    handover_id,
    user_id,
    COALESCE(caregiver_profile_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- 4. Tighten the INSERT policy: when a caregiver_profile_id is supplied it
--    must belong to the same family as the handover. FK alone would allow
--    linking a profile from a different family.
DROP POLICY IF EXISTS "Family members can insert own read receipt"
  ON public.handover_reads;

CREATE POLICY "Family members can insert own read receipt"
  ON public.handover_reads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.handovers h
      WHERE h.id = handover_reads.handover_id
        AND public.is_family_member(h.family_id, auth.uid())
        AND (
          handover_reads.caregiver_profile_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.caregiver_profiles cp
            WHERE cp.id = handover_reads.caregiver_profile_id
              AND cp.family_id = h.family_id
          )
        )
    )
  );
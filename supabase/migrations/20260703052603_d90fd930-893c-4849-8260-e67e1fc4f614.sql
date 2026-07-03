
CREATE TABLE public.handover_times (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  time_of_day TIME NOT NULL,
  label TEXT,
  grace_minutes INTEGER NOT NULL DEFAULT 30,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.handover_times TO authenticated;
GRANT ALL ON public.handover_times TO service_role;

ALTER TABLE public.handover_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view handover times"
  ON public.handover_times FOR SELECT TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Family owners can insert handover times"
  ON public.handover_times FOR INSERT TO authenticated
  WITH CHECK (public.is_family_owner(family_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Family owners can update handover times"
  ON public.handover_times FOR UPDATE TO authenticated
  USING (public.is_family_owner(family_id, auth.uid()))
  WITH CHECK (public.is_family_owner(family_id, auth.uid()));

CREATE POLICY "Family owners can delete handover times"
  ON public.handover_times FOR DELETE TO authenticated
  USING (public.is_family_owner(family_id, auth.uid()));

CREATE TRIGGER handover_times_set_updated_at
  BEFORE UPDATE ON public.handover_times
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX handover_times_family_idx ON public.handover_times(family_id, active);

CREATE TABLE public.caregiver_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  caregiver_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  color TEXT,
  category TEXT,
  recurrence_freq TEXT CHECK (recurrence_freq IN ('daily','weekly')),
  recurrence_interval INTEGER CHECK (recurrence_interval IS NULL OR recurrence_interval >= 1),
  recurrence_days_of_week INTEGER[],
  recurrence_until TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.caregiver_shifts TO authenticated;
GRANT ALL ON public.caregiver_shifts TO service_role;

ALTER TABLE public.caregiver_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view shifts"
  ON public.caregiver_shifts FOR SELECT TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Owners can insert shifts"
  ON public.caregiver_shifts FOR INSERT TO authenticated
  WITH CHECK (public.is_family_owner(family_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Owners can update shifts"
  ON public.caregiver_shifts FOR UPDATE TO authenticated
  USING (public.is_family_owner(family_id, auth.uid()))
  WITH CHECK (public.is_family_owner(family_id, auth.uid()));

CREATE POLICY "Owners can delete shifts"
  ON public.caregiver_shifts FOR DELETE TO authenticated
  USING (public.is_family_owner(family_id, auth.uid()));

CREATE TRIGGER caregiver_shifts_set_updated_at
  BEFORE UPDATE ON public.caregiver_shifts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX caregiver_shifts_family_start_idx ON public.caregiver_shifts (family_id, start_at);
CREATE INDEX caregiver_shifts_caregiver_idx ON public.caregiver_shifts (caregiver_user_id);
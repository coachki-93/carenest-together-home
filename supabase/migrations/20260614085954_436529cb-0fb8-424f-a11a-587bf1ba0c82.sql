-- 1. Extend med_log_status enum with 'postponed'
ALTER TYPE public.med_log_status ADD VALUE IF NOT EXISTS 'postponed';

-- 2. Add reason + postponed_to to med_logs
ALTER TABLE public.med_logs
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS postponed_to timestamptz;

-- 3. Reusable enum for appointment completions (mirrors med_log_status semantics)
DO $$ BEGIN
  CREATE TYPE public.appointment_completion_status AS ENUM ('done', 'skipped', 'postponed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4. Appointment completions table — one row per (appointment, occurrence_at)
CREATE TABLE IF NOT EXISTS public.appointment_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  occurrence_at timestamptz NOT NULL,
  status public.appointment_completion_status NOT NULL,
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  caregiver_profile_id uuid REFERENCES public.caregiver_profiles(id) ON DELETE SET NULL,
  completed_at timestamptz,
  reason text,
  postponed_to timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, occurrence_at)
);

CREATE INDEX IF NOT EXISTS idx_appointment_completions_family_occ
  ON public.appointment_completions (family_id, occurrence_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_completions TO authenticated;
GRANT ALL ON public.appointment_completions TO service_role;

ALTER TABLE public.appointment_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can read appointment completions"
  ON public.appointment_completions FOR SELECT TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Family members can insert appointment completions"
  ON public.appointment_completions FOR INSERT TO authenticated
  WITH CHECK (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Family members can update appointment completions"
  ON public.appointment_completions FOR UPDATE TO authenticated
  USING (public.is_family_member(family_id, auth.uid()))
  WITH CHECK (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Family members can delete appointment completions"
  ON public.appointment_completions FOR DELETE TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));

CREATE TRIGGER appointment_completions_set_updated_at
  BEFORE UPDATE ON public.appointment_completions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

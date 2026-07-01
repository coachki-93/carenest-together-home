
CREATE TABLE public.tidy_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  time_of_day time NOT NULL,
  label text,
  grace_minutes integer NOT NULL DEFAULT 30,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tidy_times TO authenticated;
GRANT ALL ON public.tidy_times TO service_role;

ALTER TABLE public.tidy_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view tidy times"
  ON public.tidy_times FOR SELECT TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Owners can insert tidy times"
  ON public.tidy_times FOR INSERT TO authenticated
  WITH CHECK (public.is_family_owner(family_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Owners can update tidy times"
  ON public.tidy_times FOR UPDATE TO authenticated
  USING (public.is_family_owner(family_id, auth.uid()))
  WITH CHECK (public.is_family_owner(family_id, auth.uid()));

CREATE POLICY "Owners can delete tidy times"
  ON public.tidy_times FOR DELETE TO authenticated
  USING (public.is_family_owner(family_id, auth.uid()));

CREATE TRIGGER update_tidy_times_updated_at
  BEFORE UPDATE ON public.tidy_times
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.tidy_submissions
  ADD COLUMN IF NOT EXISTS slot_date date,
  ADD COLUMN IF NOT EXISTS slot_time time,
  ADD COLUMN IF NOT EXISTS tidy_time_id uuid REFERENCES public.tidy_times(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tidy_submissions_slot_idx
  ON public.tidy_submissions(family_id, slot_date, slot_time);

ALTER TABLE public.tidy_settings DROP COLUMN IF EXISTS lead_minutes;

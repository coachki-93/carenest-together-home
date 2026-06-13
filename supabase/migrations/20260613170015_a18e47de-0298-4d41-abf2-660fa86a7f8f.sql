-- ENUMS
DO $$ BEGIN
  CREATE TYPE public.med_route AS ENUM ('oral','g_tube','injection','topical','inhaled','other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.med_log_status AS ENUM ('given','skipped','missed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- MEDICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dose_amount NUMERIC(10,3),
  dose_unit TEXT,
  route public.med_route NOT NULL DEFAULT 'oral',
  instructions TEXT,
  -- times of day as 'HH:MM' strings, e.g. ARRAY['08:00','16:00','22:00']
  times TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  color TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.medications TO authenticated;
GRANT ALL ON public.medications TO service_role;

ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view medications"
  ON public.medications FOR SELECT TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Family members can insert medications"
  ON public.medications FOR INSERT TO authenticated
  WITH CHECK (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Family members can update medications"
  ON public.medications FOR UPDATE TO authenticated
  USING (public.is_family_member(family_id, auth.uid()))
  WITH CHECK (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Family members can delete medications"
  ON public.medications FOR DELETE TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));

CREATE TRIGGER medications_set_updated_at
  BEFORE UPDATE ON public.medications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS medications_family_id_idx ON public.medications(family_id);
CREATE INDEX IF NOT EXISTS medications_child_id_idx ON public.medications(child_id);

-- MED LOGS TABLE
CREATE TABLE IF NOT EXISTS public.med_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  given_at TIMESTAMPTZ,
  status public.med_log_status NOT NULL DEFAULT 'given',
  given_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (medication_id, scheduled_for)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.med_logs TO authenticated;
GRANT ALL ON public.med_logs TO service_role;

ALTER TABLE public.med_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view med logs"
  ON public.med_logs FOR SELECT TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Family members can insert med logs"
  ON public.med_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Family members can update med logs"
  ON public.med_logs FOR UPDATE TO authenticated
  USING (public.is_family_member(family_id, auth.uid()))
  WITH CHECK (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Family members can delete med logs"
  ON public.med_logs FOR DELETE TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));

CREATE TRIGGER med_logs_set_updated_at
  BEFORE UPDATE ON public.med_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS med_logs_family_id_scheduled_idx
  ON public.med_logs(family_id, scheduled_for DESC);
CREATE INDEX IF NOT EXISTS med_logs_medication_idx
  ON public.med_logs(medication_id, scheduled_for DESC);
CREATE TYPE public.appointment_kind AS ENUM ('appointment', 'therapy', 'task', 'other');

CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  location TEXT,
  kind public.appointment_kind NOT NULL DEFAULT 'appointment',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  all_day BOOLEAN NOT NULL DEFAULT false,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX appointments_family_starts_idx ON public.appointments (family_id, starts_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Appointments: members read"
  ON public.appointments FOR SELECT TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Appointments: members insert"
  ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (public.is_family_member(family_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Appointments: members update"
  ON public.appointments FOR UPDATE TO authenticated
  USING (public.is_family_member(family_id, auth.uid()))
  WITH CHECK (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Appointments: members delete"
  ON public.appointments FOR DELETE TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));

CREATE TRIGGER set_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
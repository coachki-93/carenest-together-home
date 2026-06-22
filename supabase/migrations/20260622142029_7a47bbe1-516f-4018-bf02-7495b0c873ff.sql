
-- Per-task late/missed thresholds
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS late_after_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS missed_after_minutes integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS late_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS missed_notified_at timestamptz;

ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS late_after_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS missed_after_minutes integer NOT NULL DEFAULT 15;

-- Per-dose lifecycle tracking (doses are virtual rows, no row in med_logs until taken)
CREATE TABLE IF NOT EXISTS public.med_dose_events (
  medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  started_notified_at timestamptz,
  late_notified_at timestamptz,
  missed_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (medication_id, scheduled_for)
);

GRANT SELECT ON public.med_dose_events TO authenticated;
GRANT ALL ON public.med_dose_events TO service_role;

ALTER TABLE public.med_dose_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can read med dose events"
  ON public.med_dose_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.medications m
      WHERE m.id = medication_id
        AND public.is_family_member(m.family_id, auth.uid())
    )
  );

CREATE TRIGGER set_med_dose_events_updated_at
  BEFORE UPDATE ON public.med_dose_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

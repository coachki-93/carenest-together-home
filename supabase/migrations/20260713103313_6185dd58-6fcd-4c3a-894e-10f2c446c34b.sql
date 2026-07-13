CREATE TABLE public.appointment_notifications (
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  occurrence_at timestamptz NOT NULL,
  pass text NOT NULL CHECK (pass IN ('start','late','missed','reminder')),
  notified_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (appointment_id, occurrence_at, pass)
);

GRANT ALL ON public.appointment_notifications TO service_role;

ALTER TABLE public.appointment_notifications ENABLE ROW LEVEL SECURITY;
-- No client policies: service_role bypasses RLS; no other role can read/write.
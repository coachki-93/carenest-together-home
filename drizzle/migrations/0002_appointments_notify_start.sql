ALTER TABLE public.appointments
  ADD COLUMN notify_start boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.appointments.notify_start IS
  'When false, the task sweep skips the START push. Read from the series master; late/missed/reminder pushes are unaffected.';
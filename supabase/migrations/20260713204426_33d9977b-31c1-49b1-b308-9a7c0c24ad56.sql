ALTER TABLE public.appointments
  DROP COLUMN IF EXISTS notified_at,
  DROP COLUMN IF EXISTS late_notified_at,
  DROP COLUMN IF EXISTS missed_notified_at;
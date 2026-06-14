
-- Add new event kinds
ALTER TYPE public.appointment_kind ADD VALUE IF NOT EXISTS 'meal';
ALTER TYPE public.appointment_kind ADD VALUE IF NOT EXISTS 'sleep';

-- Expand recurrence frequency to include monthly
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_recurrence_freq_check;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_recurrence_freq_check
  CHECK (recurrence_freq IS NULL OR recurrence_freq = ANY (ARRAY['hourly','daily','weekly','monthly']));

-- Times-of-day list for multi-times-per-day recurrence (HH:MM strings)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS recurrence_times_of_day text[] NULL;

-- Per-event reminder, minutes before start. NULL = no reminder.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reminder_minutes integer NULL
  CHECK (reminder_minutes IS NULL OR reminder_minutes >= 0);

-- Per-family cadence for the periodic "confirm the tank" reminder.
ALTER TABLE public.families
  ADD COLUMN oxygen_check_interval_minutes integer NOT NULL DEFAULT 180
  CONSTRAINT oxygen_check_interval_minutes_check CHECK (oxygen_check_interval_minutes >= 30);

-- When a caregiver last confirmed the active tank.
ALTER TABLE public.oxygen_tanks
  ADD COLUMN last_checked_at timestamp with time zone;

-- Dedup stamp for the last reminder sent (once per interval).
ALTER TABLE public.oxygen_tanks
  ADD COLUMN check_reminder_sent_at timestamp with time zone;

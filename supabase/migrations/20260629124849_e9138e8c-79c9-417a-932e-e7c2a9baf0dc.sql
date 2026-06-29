
ALTER TABLE public.oxygen_tanks
  ADD COLUMN IF NOT EXISTS low_alert_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS critical_alert_sent_at timestamptz;

ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS oxygen_warn_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS oxygen_critical_minutes integer NOT NULL DEFAULT 20;

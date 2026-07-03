ALTER TABLE public.families
ADD COLUMN IF NOT EXISTS handover_reminder_duration_minutes integer NOT NULL DEFAULT 30;

ALTER TABLE public.families
ADD CONSTRAINT families_handover_duration_range
CHECK (handover_reminder_duration_minutes BETWEEN 1 AND 240);

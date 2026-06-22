-- Add allow_ongoing toggle to medications and appointments
ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS allow_ongoing boolean NOT NULL DEFAULT false;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS allow_ongoing boolean NOT NULL DEFAULT false;

-- Extend status enums with 'ongoing'
ALTER TYPE public.med_log_status ADD VALUE IF NOT EXISTS 'ongoing';
ALTER TYPE public.appointment_completion_status ADD VALUE IF NOT EXISTS 'ongoing';

-- Track ongoing start time + actor on the per-occurrence rows
ALTER TABLE public.med_logs
  ADD COLUMN IF NOT EXISTS ongoing_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS ongoing_started_by uuid;

ALTER TABLE public.appointment_completions
  ADD COLUMN IF NOT EXISTS ongoing_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS ongoing_started_by uuid;

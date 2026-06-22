ALTER TABLE public.medications ADD COLUMN IF NOT EXISTS timer_minutes integer;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS timer_minutes integer;
ALTER TABLE public.med_logs ADD COLUMN IF NOT EXISTS timer_started_at timestamptz;
ALTER TABLE public.med_logs ADD COLUMN IF NOT EXISTS timer_started_by uuid REFERENCES public.caregiver_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.appointment_completions ADD COLUMN IF NOT EXISTS timer_started_at timestamptz;
ALTER TABLE public.appointment_completions ADD COLUMN IF NOT EXISTS timer_started_by uuid REFERENCES public.caregiver_profiles(id) ON DELETE SET NULL;
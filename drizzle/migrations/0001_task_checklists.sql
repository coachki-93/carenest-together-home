ALTER TABLE public.appointments
  ADD COLUMN checklist jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_checklist_shape
  CHECK (jsonb_typeof(checklist) = 'array' AND jsonb_array_length(checklist) <= 20);

ALTER TABLE public.appointment_completions
  ADD COLUMN checklist_result jsonb NULL;

COMMENT ON COLUMN public.appointments.checklist IS
  'Array of {id,label}. Read from the series master only (recurrence_parent_id IS NULL); override rows keep the default [] and are ignored.';
COMMENT ON COLUMN public.appointment_completions.checklist_result IS
  'Snapshot array of {id,label,done} at completion time. NULL = no checklist data.';
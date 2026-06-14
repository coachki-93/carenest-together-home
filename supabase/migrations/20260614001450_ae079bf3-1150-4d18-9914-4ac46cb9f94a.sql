
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS recurrence_freq text
    CHECK (recurrence_freq IN ('hourly','daily','weekly')),
  ADD COLUMN IF NOT EXISTS recurrence_interval integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS recurrence_byweekday integer[],
  ADD COLUMN IF NOT EXISTS recurrence_parent_id uuid
    REFERENCES public.appointments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS recurrence_override_at timestamptz,
  ADD COLUMN IF NOT EXISTS recurrence_cancelled boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS appointments_recurrence_parent_idx
  ON public.appointments(recurrence_parent_id);

CREATE INDEX IF NOT EXISTS appointments_recurrence_freq_idx
  ON public.appointments(family_id, recurrence_freq)
  WHERE recurrence_freq IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS appointments_override_unique_idx
  ON public.appointments(recurrence_parent_id, recurrence_override_at)
  WHERE recurrence_parent_id IS NOT NULL AND recurrence_override_at IS NOT NULL;

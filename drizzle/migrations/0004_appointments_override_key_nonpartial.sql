CREATE UNIQUE INDEX appointments_override_key
  ON public.appointments (recurrence_parent_id, recurrence_override_at);

DROP INDEX public.appointments_override_unique_idx;
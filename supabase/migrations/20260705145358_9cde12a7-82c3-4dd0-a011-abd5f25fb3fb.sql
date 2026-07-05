ALTER TABLE public.machines
  ADD COLUMN IF NOT EXISTS machine_subtype text;
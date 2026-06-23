ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS custom_vital_ranges jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.vitals
  ADD COLUMN IF NOT EXISTS context text;
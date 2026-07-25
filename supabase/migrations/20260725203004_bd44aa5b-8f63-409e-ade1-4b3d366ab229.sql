ALTER TABLE public.children
  ADD COLUMN care_needs jsonb NOT NULL DEFAULT '{}'::jsonb;
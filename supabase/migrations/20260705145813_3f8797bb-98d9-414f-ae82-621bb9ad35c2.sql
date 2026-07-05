ALTER TABLE public.maintenance_items
  ADD COLUMN IF NOT EXISTS action_type text;
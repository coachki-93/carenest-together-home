CREATE TYPE public.inventory_category AS ENUM (
  'nutrition',
  'hygiene',
  'medicine',
  'medical_supplies',
  'equipment',
  'other'
);

ALTER TABLE public.inventory_items
  ADD COLUMN category public.inventory_category NOT NULL DEFAULT 'other';
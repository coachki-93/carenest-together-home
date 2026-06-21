
ALTER TYPE public.care_place_item_type ADD VALUE IF NOT EXISTS 'days_left';
ALTER TYPE public.care_place_item_type ADD VALUE IF NOT EXISTS 'quantity_estimate';
ALTER TYPE public.inventory_adjustment_reason ADD VALUE IF NOT EXISTS 'days_left_update';

ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS supplier text,
  ADD COLUMN IF NOT EXISTS supplier_url text,
  ADD COLUMN IF NOT EXISTS days_left_estimate int,
  ADD COLUMN IF NOT EXISTS days_left_updated_at timestamptz;

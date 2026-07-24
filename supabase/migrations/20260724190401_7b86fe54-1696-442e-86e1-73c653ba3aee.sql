ALTER TABLE public.families
  ADD COLUMN owner_notify_level text NOT NULL DEFAULT 'exceptions'
  CHECK (owner_notify_level IN ('exceptions','all'));

ALTER TABLE public.inventory_items
  ADD COLUMN low_stock_alert_sent_at timestamptz;

CREATE OR REPLACE FUNCTION public.clear_low_stock_alert()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.low_stock_threshold IS NULL
     OR NEW.quantity > NEW.low_stock_threshold THEN
    NEW.low_stock_alert_sent_at := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS inventory_items_clear_low_stock_alert ON public.inventory_items;
CREATE TRIGGER inventory_items_clear_low_stock_alert
BEFORE UPDATE OF quantity, low_stock_threshold ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.clear_low_stock_alert();
ALTER TABLE public.oxygen_tanks
  ADD COLUMN change_reason TEXT;

ALTER TABLE public.oxygen_tanks
  ADD CONSTRAINT oxygen_tanks_change_reason_check
  CHECK (change_reason IS NULL OR change_reason IN ('start','flow_change','tank_swap'));
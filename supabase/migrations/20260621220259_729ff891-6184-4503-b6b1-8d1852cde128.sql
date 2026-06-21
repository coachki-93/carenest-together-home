-- 1. material_responsible flag on family_members (owner-only update)
ALTER TABLE public.family_members
  ADD COLUMN IF NOT EXISTS material_responsible boolean NOT NULL DEFAULT false;

-- 2. helper: is_material_manager (owner OR material_responsible)
CREATE OR REPLACE FUNCTION public.is_material_manager(_family_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_id = _family_id
      AND user_id = _user_id
      AND (role = 'owner' OR material_responsible = true)
  );
$$;

-- 3. enums
DO $$ BEGIN
  CREATE TYPE public.unit_kind AS ENUM ('pcs','box','pack','ml','l','g','kg');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.inventory_adjustment_reason AS ENUM (
    'manual_set','manual_add','manual_remove','care_place_check','expiry_writeoff'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. inventory_items
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit public.unit_kind NOT NULL,
  quantity numeric NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  low_stock_threshold numeric CHECK (low_stock_threshold IS NULL OR low_stock_threshold >= 0),
  expiry_date date,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_items_select_family"
  ON public.inventory_items FOR SELECT TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "inv_items_insert_manager"
  ON public.inventory_items FOR INSERT TO authenticated
  WITH CHECK (public.is_material_manager(family_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "inv_items_update_manager"
  ON public.inventory_items FOR UPDATE TO authenticated
  USING (public.is_material_manager(family_id, auth.uid()))
  WITH CHECK (public.is_material_manager(family_id, auth.uid()));

CREATE POLICY "inv_items_delete_manager"
  ON public.inventory_items FOR DELETE TO authenticated
  USING (public.is_material_manager(family_id, auth.uid()));

CREATE INDEX IF NOT EXISTS inventory_items_family_idx ON public.inventory_items(family_id);

CREATE TRIGGER inventory_items_set_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. inventory_adjustments
CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  delta numeric NOT NULL,
  reason public.inventory_adjustment_reason NOT NULL,
  note text,
  performed_by uuid NOT NULL REFERENCES auth.users(id),
  source_check_id uuid REFERENCES public.care_place_checks(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.inventory_adjustments TO authenticated;
GRANT ALL ON public.inventory_adjustments TO service_role;

ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_adj_select_family"
  ON public.inventory_adjustments FOR SELECT TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));

-- Any family member can insert adjustments (caregivers create care_place_check adjustments).
-- Manual adjustments are gated in UI but we keep RLS broad enough for the check flow.
CREATE POLICY "inv_adj_insert_member"
  ON public.inventory_adjustments FOR INSERT TO authenticated
  WITH CHECK (public.is_family_member(family_id, auth.uid()) AND performed_by = auth.uid());

CREATE POLICY "inv_adj_delete_manager"
  ON public.inventory_adjustments FOR DELETE TO authenticated
  USING (public.is_material_manager(family_id, auth.uid()));

CREATE INDEX IF NOT EXISTS inv_adj_item_idx ON public.inventory_adjustments(inventory_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inv_adj_family_idx ON public.inventory_adjustments(family_id, created_at DESC);

-- 6. link checklist count items to inventory items
ALTER TABLE public.care_place_checklist_items
  ADD COLUMN IF NOT EXISTS inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL;
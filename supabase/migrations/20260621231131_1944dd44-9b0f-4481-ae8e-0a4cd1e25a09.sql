
CREATE TABLE public.care_place_adhoc_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  label text NOT NULL,
  for_slot_date date NOT NULL,
  for_slot_time time NOT NULL,
  created_by uuid NOT NULL,
  resolved_at timestamptz,
  resolved_check_id uuid REFERENCES public.care_place_checks(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX care_place_adhoc_items_family_slot_idx
  ON public.care_place_adhoc_items (family_id, for_slot_date, for_slot_time)
  WHERE resolved_at IS NULL;

CREATE UNIQUE INDEX care_place_adhoc_items_unique_open
  ON public.care_place_adhoc_items (family_id, inventory_item_id, for_slot_date, for_slot_time)
  WHERE resolved_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.care_place_adhoc_items TO authenticated;
GRANT ALL ON public.care_place_adhoc_items TO service_role;

ALTER TABLE public.care_place_adhoc_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view adhoc items"
  ON public.care_place_adhoc_items FOR SELECT
  TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Family members can insert adhoc items"
  ON public.care_place_adhoc_items FOR INSERT
  TO authenticated
  WITH CHECK (public.is_family_member(family_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Family members can update adhoc items"
  ON public.care_place_adhoc_items FOR UPDATE
  TO authenticated
  USING (public.is_family_member(family_id, auth.uid()))
  WITH CHECK (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Family members can delete adhoc items"
  ON public.care_place_adhoc_items FOR DELETE
  TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));

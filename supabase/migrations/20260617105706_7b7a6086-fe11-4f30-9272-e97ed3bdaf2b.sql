DROP POLICY IF EXISTS "Family members can view oxygen tanks" ON public.oxygen_tanks;
DROP POLICY IF EXISTS "Family members can insert oxygen tanks" ON public.oxygen_tanks;
DROP POLICY IF EXISTS "Family members can update oxygen tanks" ON public.oxygen_tanks;
DROP POLICY IF EXISTS "Family members can delete oxygen tanks" ON public.oxygen_tanks;

CREATE POLICY "Family members can view oxygen tanks"
  ON public.oxygen_tanks FOR SELECT
  TO authenticated
  USING (private.is_family_member(family_id, auth.uid()));

CREATE POLICY "Family members can insert oxygen tanks"
  ON public.oxygen_tanks FOR INSERT
  TO authenticated
  WITH CHECK (private.is_family_member(family_id, auth.uid()));

CREATE POLICY "Family members can update oxygen tanks"
  ON public.oxygen_tanks FOR UPDATE
  TO authenticated
  USING (private.is_family_member(family_id, auth.uid()))
  WITH CHECK (private.is_family_member(family_id, auth.uid()));

CREATE POLICY "Family members can delete oxygen tanks"
  ON public.oxygen_tanks FOR DELETE
  TO authenticated
  USING (private.is_family_member(family_id, auth.uid()));
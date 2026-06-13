DROP POLICY IF EXISTS "Families: members read" ON public.families;
CREATE POLICY "Families: members or owner read" ON public.families
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_family_member(id, auth.uid()));
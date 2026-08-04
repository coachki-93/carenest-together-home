DROP POLICY "Family members can insert instructions" ON public.care_instructions;
DROP POLICY "Family members can update instructions" ON public.care_instructions;
DROP POLICY "Family members can delete instructions" ON public.care_instructions;

CREATE POLICY "Family owners can insert instructions"
ON public.care_instructions FOR INSERT TO authenticated
WITH CHECK (public.is_family_owner(family_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Family owners can update instructions"
ON public.care_instructions FOR UPDATE TO authenticated
USING (public.is_family_owner(family_id, auth.uid()))
WITH CHECK (public.is_family_owner(family_id, auth.uid()));

CREATE POLICY "Family owners can delete instructions"
ON public.care_instructions FOR DELETE TO authenticated
USING (public.is_family_owner(family_id, auth.uid()));
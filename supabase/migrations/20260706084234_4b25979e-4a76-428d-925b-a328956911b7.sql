ALTER TABLE public.care_place_checks
  ADD COLUMN caregiver_profile_id uuid
    REFERENCES public.caregiver_profiles(id) ON DELETE SET NULL;

CREATE INDEX care_place_checks_caregiver_profile_idx
  ON public.care_place_checks(caregiver_profile_id)
  WHERE caregiver_profile_id IS NOT NULL;

DROP POLICY IF EXISTS "Family members can insert checks" ON public.care_place_checks;

CREATE POLICY "Family members can insert checks"
  ON public.care_place_checks FOR INSERT TO authenticated
  WITH CHECK (
    public.is_family_member(family_id, auth.uid())
    AND performed_by = auth.uid()
    AND public.caregiver_profile_in_family(caregiver_profile_id, family_id)
  );
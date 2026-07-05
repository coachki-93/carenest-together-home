-- 1. Shared helper: caregiver_profile belongs to the given family (NULL allowed)
CREATE OR REPLACE FUNCTION public.caregiver_profile_in_family(
  _profile_id uuid,
  _family_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT _profile_id IS NULL OR EXISTS (
    SELECT 1 FROM public.caregiver_profiles
    WHERE id = _profile_id AND family_id = _family_id
  );
$$;

REVOKE ALL ON FUNCTION public.caregiver_profile_in_family(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.caregiver_profile_in_family(uuid, uuid) TO authenticated, service_role;

-- 2. handover_reads INSERT policy uses the helper
DROP POLICY IF EXISTS "Family members can insert own read receipt" ON public.handover_reads;
CREATE POLICY "Family members can insert own read receipt"
ON public.handover_reads FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.handovers h
    WHERE h.id = handover_reads.handover_id
      AND public.is_family_member(h.family_id, auth.uid())
      AND public.caregiver_profile_in_family(handover_reads.caregiver_profile_id, h.family_id)
  )
);

-- 3. maintenance_logs.caregiver_profile_id
ALTER TABLE public.maintenance_logs
  ADD COLUMN IF NOT EXISTS caregiver_profile_id uuid
    REFERENCES public.caregiver_profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS maintenance_logs_caregiver_profile_id_idx
  ON public.maintenance_logs(caregiver_profile_id);

DROP POLICY IF EXISTS "Family members can insert maintenance logs" ON public.maintenance_logs;
CREATE POLICY "Family members can insert maintenance logs"
ON public.maintenance_logs FOR INSERT TO authenticated
WITH CHECK (
  public.is_family_member(family_id, auth.uid())
  AND performed_by = auth.uid()
  AND public.caregiver_profile_in_family(caregiver_profile_id, family_id)
);

-- 4. maintenance_items.last_done_by_profile_id
ALTER TABLE public.maintenance_items
  ADD COLUMN IF NOT EXISTS last_done_by_profile_id uuid
    REFERENCES public.caregiver_profiles(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Material managers can update maintenance items" ON public.maintenance_items;
CREATE POLICY "Material managers can update maintenance items"
ON public.maintenance_items FOR UPDATE TO authenticated
USING (public.is_material_manager(family_id, auth.uid()))
WITH CHECK (
  public.is_material_manager(family_id, auth.uid())
  AND public.caregiver_profile_in_family(last_done_by_profile_id, family_id)
);

DROP POLICY IF EXISTS "Material managers can insert maintenance items" ON public.maintenance_items;
CREATE POLICY "Material managers can insert maintenance items"
ON public.maintenance_items FOR INSERT TO authenticated
WITH CHECK (
  public.is_material_manager(family_id, auth.uid())
  AND created_by = auth.uid()
  AND public.caregiver_profile_in_family(last_done_by_profile_id, family_id)
);

-- 5. mark_maintenance_done: drop old (uuid, text) signature so 2-arg calls
--    resolve to the new function via its default, then create the new one.
DROP FUNCTION IF EXISTS public.mark_maintenance_done(uuid, text);

CREATE OR REPLACE FUNCTION public.mark_maintenance_done(
  _item_id uuid,
  _note text DEFAULT NULL,
  _caregiver_profile_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_family UUID;
  v_active BOOLEAN;
  v_log_id UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT family_id, active INTO v_family, v_active
    FROM public.maintenance_items WHERE id = _item_id;

  IF v_family IS NULL THEN RAISE EXCEPTION 'Maintenance item not found'; END IF;
  IF NOT public.is_family_member(v_family, v_uid) THEN
    RAISE EXCEPTION 'Not a family member';
  END IF;
  IF v_active = false THEN RAISE EXCEPTION 'Maintenance item is archived'; END IF;

  IF NOT public.caregiver_profile_in_family(_caregiver_profile_id, v_family) THEN
    RAISE EXCEPTION 'Caregiver profile does not belong to this family';
  END IF;

  INSERT INTO public.maintenance_logs
    (maintenance_item_id, family_id, performed_by, caregiver_profile_id, note)
  VALUES
    (_item_id, v_family, v_uid, _caregiver_profile_id, NULLIF(btrim(_note), ''))
  RETURNING id INTO v_log_id;

  UPDATE public.maintenance_items
    SET last_done_at = now(),
        last_done_by = v_uid,
        last_done_by_profile_id = _caregiver_profile_id,
        updated_at = now()
    WHERE id = _item_id;

  RETURN v_log_id;
END $$;

REVOKE ALL ON FUNCTION public.mark_maintenance_done(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_maintenance_done(uuid, text, uuid) TO authenticated, service_role;

-- 6. Tighten med_logs and appointment_completions validation
DROP POLICY IF EXISTS "Family members can insert med logs" ON public.med_logs;
CREATE POLICY "Family members can insert med logs"
ON public.med_logs FOR INSERT TO authenticated
WITH CHECK (
  private.is_family_member(family_id, auth.uid())
  AND public.caregiver_profile_in_family(caregiver_profile_id, family_id)
);

DROP POLICY IF EXISTS "Family members can update med logs" ON public.med_logs;
CREATE POLICY "Family members can update med logs"
ON public.med_logs FOR UPDATE TO authenticated
USING (private.is_family_member(family_id, auth.uid()))
WITH CHECK (
  private.is_family_member(family_id, auth.uid())
  AND public.caregiver_profile_in_family(caregiver_profile_id, family_id)
);

DROP POLICY IF EXISTS "Family members can insert appointment completions" ON public.appointment_completions;
CREATE POLICY "Family members can insert appointment completions"
ON public.appointment_completions FOR INSERT TO authenticated
WITH CHECK (
  private.is_family_member(family_id, auth.uid())
  AND public.caregiver_profile_in_family(caregiver_profile_id, family_id)
);

DROP POLICY IF EXISTS "Family members can update appointment completions" ON public.appointment_completions;
CREATE POLICY "Family members can update appointment completions"
ON public.appointment_completions FOR UPDATE TO authenticated
USING (private.is_family_member(family_id, auth.uid()))
WITH CHECK (
  private.is_family_member(family_id, auth.uid())
  AND public.caregiver_profile_in_family(caregiver_profile_id, family_id)
);
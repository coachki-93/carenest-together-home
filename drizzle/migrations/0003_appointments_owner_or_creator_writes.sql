CREATE OR REPLACE FUNCTION private.can_manage_appointment(_appointment_id uuid, _family_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = _appointment_id
      AND a.family_id = _family_id
      AND (
        private.is_family_owner(a.family_id, _user_id)
        OR (a.created_by = _user_id AND private.is_family_member(a.family_id, _user_id))
      )
  );
$$;
REVOKE ALL ON FUNCTION private.can_manage_appointment(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_manage_appointment(uuid, uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Appointments: members insert" ON public.appointments;
DROP POLICY IF EXISTS "Appointments: members update" ON public.appointments;
DROP POLICY IF EXISTS "Appointments: members delete" ON public.appointments;

CREATE POLICY "Appointments: insert own, overrides by series manager"
ON public.appointments FOR INSERT TO authenticated
WITH CHECK (
  private.is_family_member(family_id, auth.uid())
  AND created_by = auth.uid()
  AND (
    recurrence_parent_id IS NULL
    OR private.can_manage_appointment(recurrence_parent_id, family_id, auth.uid())
  )
);

CREATE POLICY "Appointments: owner, creator or series manager update"
ON public.appointments FOR UPDATE TO authenticated
USING (
  private.is_family_owner(family_id, auth.uid())
  OR (recurrence_parent_id IS NULL AND created_by = auth.uid()
      AND private.is_family_member(family_id, auth.uid()))
  OR (recurrence_parent_id IS NOT NULL
      AND private.can_manage_appointment(recurrence_parent_id, family_id, auth.uid()))
)
WITH CHECK (
  private.is_family_owner(family_id, auth.uid())
  OR (recurrence_parent_id IS NULL AND created_by = auth.uid()
      AND private.is_family_member(family_id, auth.uid()))
  OR (recurrence_parent_id IS NOT NULL
      AND private.can_manage_appointment(recurrence_parent_id, family_id, auth.uid()))
);

CREATE POLICY "Appointments: owner, creator or series manager delete"
ON public.appointments FOR DELETE TO authenticated
USING (
  private.is_family_owner(family_id, auth.uid())
  OR (recurrence_parent_id IS NULL AND created_by = auth.uid()
      AND private.is_family_member(family_id, auth.uid()))
  OR (recurrence_parent_id IS NOT NULL
      AND private.can_manage_appointment(recurrence_parent_id, family_id, auth.uid()))
);

CREATE OR REPLACE FUNCTION private.guard_appointment_immutables()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.family_id IS DISTINCT FROM OLD.family_id THEN
    RAISE EXCEPTION 'family_id cannot be changed';
  END IF;
  IF NEW.recurrence_parent_id IS DISTINCT FROM OLD.recurrence_parent_id THEN
    RAISE EXCEPTION 'recurrence_parent_id cannot be changed';
  END IF;
  NEW.created_by := OLD.created_by;
  RETURN NEW;
END $$;

CREATE TRIGGER appointments_guard_immutables
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION private.guard_appointment_immutables();
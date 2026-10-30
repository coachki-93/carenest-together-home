# Tighten task write access (owner or task creator) — revised

## 1. Live policies on public.appointments

| policyname | cmd | qual | with_check |
|---|---|---|---|
| Appointments: members read | SELECT | private.is_family_member(family_id, auth.uid()) | — |
| Appointments: members insert | INSERT | — | private.is_family_member(family_id, auth.uid()) AND created_by = auth.uid() |
| Appointments: members update | UPDATE | private.is_family_member(family_id, auth.uid()) | private.is_family_member(family_id, auth.uid()) |
| Appointments: members delete | DELETE | private.is_family_member(family_id, auth.uid()) | — |

SELECT stays untouched. `appointment_completions` not touched.

## 2. Revised migration

```sql
-- Can this user manage the series master _appointment_id, which must belong to _family_id?
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
  -- Keep the original creator silently (override upserts resend created_by).
  NEW.created_by := OLD.created_by;
  RETURN NEW;
END $$;

CREATE TRIGGER appointments_guard_immutables
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION private.guard_appointment_immutables();
```

Note: the BEFORE trigger runs before the UPDATE WITH CHECK, so a non-owner can't keep access by rewriting `created_by` — it's reset first.

## 3. Client changes

- **No client update changes `recurrence_parent_id`.** Confirmed: it's only written in the two override upserts, where it is also the conflict key, so the update branch writes the same value. Whole-series updates never include it.
- **Shared `canManageAppointment(appt, { userId, isOwner, seriesCreatedBy })`** in `src/lib/data/appointments.ts`: owner → yes; series/one-off → `created_by === userId`; override/occurrence → series master's `created_by === userId`. Expanded occurrences already carry `master_id`, so the check uses the master's creator.
- **Planner**: replace the inline `created_by === user?.id || owner` with the helper.
- **Visits calendar (`/appointments`)**: same gate; hide Edit, Delete and "cancel this occurrence" when the user can't manage it (preview stays readable).
- Unit tests for the helper (owner, own one-off, other's one-off, occurrence of own series with owner-made override, occurrence of owner's series).

## 4. Caregiver flows still working

Create tasks (Planner, visits, suggestion card); done/skip/postpone/ongoing/timer from Today (completions only); routine setup is owner-only. Nothing a caregiver legitimately uses today breaks once the visits calendar is gated.

## 5. Verification (API, as caregiver test account and owner)

Caregiver — denied: update/delete owner's task; insert cancel-override on owner's series; re-point own task's `recurrence_parent_id` at owner's series; override pointing at a series in another family; change `family_id`.
Caregiver — allowed: create/edit own task; cancel an occurrence of own series; re-edit an owner-made override on own series; mark owner's task done.
Owner — allowed: everything, including re-editing an occurrence a caregiver moved, with `created_by` unchanged afterwards.
Then re-read `pg_policies`, clean up test rows, full vitest + tsgo.

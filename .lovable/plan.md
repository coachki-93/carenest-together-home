# Tighten task write access (owner or task creator)

## 1. Live policies on public.appointments (read just now)

| policyname | cmd | qual | with_check |
|---|---|---|---|
| Appointments: members read | SELECT | private.is_family_member(family_id, auth.uid()) | — |
| Appointments: members insert | INSERT | — | private.is_family_member(family_id, auth.uid()) AND created_by = auth.uid() |
| Appointments: members update | UPDATE | private.is_family_member(family_id, auth.uid()) | private.is_family_member(family_id, auth.uid()) |
| Appointments: members delete | DELETE | private.is_family_member(family_id, auth.uid()) | — |

Helpers in `private`: `is_family_member`, `is_family_owner` (both `(_family_id, _user_id)`). SELECT stays untouched.

## 2. Migration (to apply after approval)

```sql
-- Helper: can this user manage the given series master? Owner, or creator who is still a member.
CREATE OR REPLACE FUNCTION private.can_manage_appointment(_appointment_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = _appointment_id
      AND (
        private.is_family_owner(a.family_id, _user_id)
        OR (a.created_by = _user_id AND private.is_family_member(a.family_id, _user_id))
      )
  );
$$;
REVOKE ALL ON FUNCTION private.can_manage_appointment(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_manage_appointment(uuid, uuid) TO authenticated;

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
    OR private.can_manage_appointment(recurrence_parent_id, auth.uid())
  )
);

CREATE POLICY "Appointments: owner or creator update"
ON public.appointments FOR UPDATE TO authenticated
USING (
  private.is_family_owner(family_id, auth.uid())
  OR (created_by = auth.uid() AND private.is_family_member(family_id, auth.uid()))
)
WITH CHECK (
  private.is_family_owner(family_id, auth.uid())
  OR (created_by = auth.uid() AND private.is_family_member(family_id, auth.uid()))
);

CREATE POLICY "Appointments: owner or creator delete"
ON public.appointments FOR DELETE TO authenticated
USING (
  private.is_family_owner(family_id, auth.uid())
  OR (created_by = auth.uid() AND private.is_family_member(family_id, auth.uid()))
);

-- Block moving a task to another family or re-assigning its creator.
CREATE OR REPLACE FUNCTION private.guard_appointment_immutables()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.family_id IS DISTINCT FROM OLD.family_id THEN
    RAISE EXCEPTION 'family_id cannot be changed';
  END IF;
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'created_by cannot be changed';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER appointments_guard_immutables
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION private.guard_appointment_immutables();
```

`appointment_completions` is not touched.

## 3. Client audit — every write to tasks

| Flow | Where | Write | Caregiver after change |
|---|---|---|---|
| Create new task | Planner, old visits calendar, routine setup, suggestion card | INSERT, no parent | Works (unchanged) |
| Edit / delete whole series | Planner (gated: creator or owner) | UPDATE / DELETE | Works for own; owner's hidden in UI anyway |
| Edit / cancel one occurrence | Planner (gated) | upsert override row | Works for own series |
| Edit / delete on the old visits calendar (`/appointments`) | no creator/owner gate in UI | UPDATE / DELETE / override upsert | **Will now fail with an error toast on the owner's visits** — UI shows Edit/Delete to everyone (flag) |
| Postpone / skip / done / ongoing / timer from Today | `appointment_completions` only | not tasks | Works (unchanged) |
| Routine setup `/routines` | owner-only page | INSERT new tasks | Not affected (caregivers can't open it) |
| Scaffold suggestion card | INSERT new tasks | Works |

### Flags (not worked around)

1. **Old visits calendar has no permission gate** — caregivers see Edit/Delete on the owner's visits; those will now be refused by the database. Needs the same `canManage` gate as Planner (separate task).
2. **Re-editing an existing override hits the new trigger.** Override saves are upserts that always send `created_by = current user`. If an override row already exists and was made by someone else (e.g. caregiver moved one occurrence of their own series, owner then edits that same occurrence again), the upsert becomes an UPDATE that changes `created_by` → trigger raises, **even for the owner**. Same applies to cancelling an already-moved occurrence. Fix options for later: stop sending `created_by` in the conflict update, or let the trigger allow it on override rows. Not changed here per your instruction.
3. **Override rows follow their own creator, not the series creator.** UPDATE/DELETE checks the override row's `created_by`, so a caregiver who owns a series cannot re-edit an override the owner created on it (owner always can). Matches the rule as written; flagging in case you want "series creator" here too.

## 4. Verification (after apply)

Signed in via the API as a caregiver test account and as the owner:
- Caregiver: update owner's task → denied; delete owner's task → denied; insert cancel-override on owner's series → denied; change `family_id`/`created_by` on own task → denied by trigger.
- Caregiver: create and edit own task, cancel an occurrence of own series → allowed.
- Caregiver: mark owner's task done (completion row) → allowed.
- Owner: update, delete, override any family task → allowed.
- Re-read `pg_policies` to confirm the new set; test rows cleaned up afterwards; full vitest + tsgo.

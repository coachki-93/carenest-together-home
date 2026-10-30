# Checklists inside tasks

## 1. Migration (shown for approval, not applied yet)

```sql
ALTER TABLE public.appointments
  ADD COLUMN checklist jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_checklist_shape
  CHECK (jsonb_typeof(checklist) = 'array' AND jsonb_array_length(checklist) <= 20);

ALTER TABLE public.appointment_completions
  ADD COLUMN checklist_result jsonb NULL;

COMMENT ON COLUMN public.appointments.checklist IS
  'Array of {id,label}. Read from the series master only (recurrence_parent_id IS NULL); override rows keep the default [] and are ignored.';
COMMENT ON COLUMN public.appointment_completions.checklist_result IS
  'Snapshot array of {id,label,done} at completion time.';
```

Existing rows get `[]`, so the CHECK passes. The CHECK is immutable, so it's fine as a constraint. I'm not adding label-length or item-shape checks in the database; the dialog enforces 20 steps and 120 characters. I can add a validation trigger if you'd like that on the server too.

### Override check: works, with one flag
- `instanceFromMaster` spreads `...master` and then overrides only title, notes, location, kind, all_day, amount_ml and the times. If I leave `checklist` off that list, every occurrence (including overridden ones) shows the master's checklist. That's the behaviour you asked for.
- Override rows are written by `useUpdateAppointmentInstance` / `useDeleteAppointmentInstance` with a `patch` that won't include `checklist`. They get the column default `[]`, which is never read.
- **Flag:** when you edit one occurrence ("this one only"), the dialog must hide or disable the Checklist section, or show it read-only with "Edit the series to change steps". Otherwise an edit there would silently do nothing. My plan is read-only plus that hint.
- Completions key on `appointment_id` = master id (and occurrence_at), so the snapshot attaches correctly for overridden occurrences too.

### RLS: no changes needed
Current policies (checked live):
- `appointments` UPDATE/INSERT: any family member (INSERT also requires `created_by = auth.uid()`). These are row-level, so they cover the new column.
- `appointment_completions` INSERT/UPDATE: family member plus `caregiver_profile_in_family(caregiver_profile_id, family_id)`. These also cover `checklist_result`.
I won't touch either.

## 2. Planner: create/edit dialog (schedule.tsx)
- A new "Checklist / Checklista" section: a list of rows with a text input (maxLength 120), up/down buttons to reorder, and a remove button. "Add step / Lägg till steg" is disabled at 20, with a counter "n/20 steg". Ids come from `crypto.randomUUID()`. Blank labels are trimmed and dropped on save.
- `checklist` goes through `useCreateAppointment` / `useUpdateAppointment` (series scope) like the other fields.
- **Permission (answer):** it is **not owner-only.** Edit and delete controls show when `created_by === user.id || role === "owner"`, so a caregiver can edit tasks they created. At the database level, any family member can update any task. The checklist follows the same rule as the rest of the task. If you want checklists owner-only, that is a separate decision. It would also make sense to tighten the update policy then, since the UI gate alone is cosmetic.

## 3. Today (dashboard.tsx)
- For a task with `checklist.length > 0`, the expanded row lists the steps as checkbox rows. Ticks live in local state, keyed by occurrence.
- Tapping Klar with unticked steps opens an AlertDialog: "X av Y steg är inte avbockade. Markera som klar ändå?" with Cancel / "Markera klar".
- The save uses the existing `useLogAppointmentCompletion` path (same `guardActingProfile` + `caregiver_profile_id`) and adds `checklist_result: steps.map(s => ({id, label, done}))`. I'll add the field to the mutation's input type.
- Ticks are lost if you leave the page before Klar. That is the expected trade-off for local state.

### On "ongoing" for live ticks (opinion, not built)
I'd recommend it as a follow-up. Upserting `status: "ongoing"` with a partial `checklist_result` on each tick would let ticks survive a reload and show other caregivers progress mid-task. The `ongoing` status and `ongoing_started_*` fields already exist. Caveats:
- Only tasks with `allow_ongoing` use it today, and the ongoing UI and timers would light up for checklist tasks.
- Every tick becomes a network write.
- The late/missed notifier would need to keep treating ongoing as "in progress".
For v1, local state is simpler and safer.

## 4. Handover (src/lib/data/handover-prefill.ts)
In the existing completions loop: for status `done` with `checklist_result` containing any `done: false`, add the note line
`{task} klar – ej avbockat: {label1, label2}` (en: `{task} done – not ticked: {labels}`) using a new i18n key. Add a test to `handover-prefill.test.ts`, plus a pure helper test for "unticked labels".

## 5. i18n (en + sv, exact parity)
Keys under `scheduleEvents.checklist*` and `dashboard.checklist*`:
- Checklist / Checklista
- Add step / Lägg till steg
- Step {{n}} / Steg {{n}}
- {{n}}/20 steps / {{n}}/20 steg
- Edit the series to change steps / Redigera hela serien för att ändra steg
- Confirm title and body: "{{x}} of {{y}} steps aren't ticked. Mark as done anyway?" / "{{x}} av {{y}} steg är inte avbockade. Markera som klar ändå?"
- Confirm button
- Handover line

## 6. Verification
Apply the migration, then:
- Check the columns and constraint exist.
- Live trace: create a task with 3 steps → Today → tick 2 → Klar → confirmation → saved snapshot read back → handover shows the line.
- Edit the checklist afterwards and confirm the history is unchanged.
- An override occurrence still shows the master's steps.
- Full vitest, tsgo, en/sv parity.

## Not in this step / possible conflicts for next step
- Routine setup and care-need suggestions aren't included. A suggestion that creates tasks can just write `checklist` on the master. No conflict, but suggested steps need stable ids if a template later updates them.
- If you later split a series ("this and following"), today's split only covers "this" or "series", so there's nothing to copy for now.

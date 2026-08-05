# Schedule create dialog: care-task kinds only

## Goal
Schedule's "+ New event" dialog offers only care-task kinds. Appointment/visit kinds stay
visible on Schedule's day-view and remain fully editable.

## Files
1. `src/lib/data/appointments.ts` — add `CARE_TASK_KINDS`.
2. `src/routes/_authenticated/schedule.tsx` — dropdown maps over the new list; two safety
   details for the shared create/edit dialog.

## Diffs

### 1. src/lib/data/appointments.ts (after `isVisitKind`)

```diff
 export function isVisitKind(k: AppointmentKind): k is VisitKind {
   return (VISIT_KINDS as readonly string[]).includes(k);
 }
+
+/** Non-visit kinds: what Schedule's create dialog offers. Visits live on /appointments. */
+export const CARE_TASK_KINDS: AppointmentKind[] = APPOINTMENT_KINDS.filter(
+  (k) => !isVisitKind(k),
+);
```

### 2. src/routes/_authenticated/schedule.tsx

Import `CARE_TASK_KINDS` alongside `APPOINTMENT_KINDS` (the latter stays used elsewhere; if
it becomes unused the import is dropped).

Default kind for a NEW event (line ~995) — `"appointment"` is no longer offered:

```diff
-      setKind("appointment");
+      setKind("task");
```

Dropdown options (line ~1153) — care-task kinds, plus the row's own kind when editing a
visit-kind item so the Select never shows a value missing from its options:

```diff
-                  {APPOINTMENT_KINDS.map((k) => (
+                  {kindOptions.map((k) => (
                     <SelectItem key={k} value={k}>
                       {t(`scheduleEvents.kind.${k}`)}
                     </SelectItem>
                   ))}
```

with, above the return:

```ts
const kindOptions = useMemo<AppointmentKind[]>(
  () =>
    editing && isVisitKind(editing.kind) && !CARE_TASK_KINDS.includes(editing.kind)
      ? [editing.kind, ...CARE_TASK_KINDS]
      : CARE_TASK_KINDS,
  [editing],
);
```

## Flags / confirmations
- Existing visit-kind rows created earlier via Schedule still render on the day-view: the
  render path (line ~247 `items.push({ kind: "appt", ... })`) is untouched and filters
  nothing by kind.
- Edit uses the SAME dialog. Without the fix the Select would render an empty trigger for a
  visit-kind row (value not in options) and a save could clobber the kind. The
  `kindOptions` prepend keeps the current kind selectable and displayed; the user may switch
  it down to a care task but cannot pick a different visit kind from Schedule.
- `/appointments` uses `VISIT_KINDS` for its own dropdown — unchanged.

## Verify
Create dropdown lists no appointment/therapy/meeting/lab/dental/hospital_stay; appointments
still show on the day-view; creating a care task works; `/appointments` untouched;
`tsgo --noEmit` clean.

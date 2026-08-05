# Planner rename + create-dropdown refinement

Three text/UI changes on the Schedule page. No route, file, component, or i18n key renames.

## Files
1. `src/lib/i18n/en.ts` — displayed strings only
2. `src/lib/i18n/sv.ts` — same, mirrored
3. `src/lib/data/appointments.ts` — `CARE_TASK_KINDS` filter

No component changes needed: `schedule.tsx` already renders `t("schedule.title")`,
`t("scheduleEvents.new")` (header + empty state) and maps `kindOptions`.

## 1. "Schedule" → "Planner" / "Schema" → "Planerare"

Swedish: "Planerare" is the natural term for a planning tool (Swedish "schema" =
timetable, which is what we're moving away from). Confirmed choice.

en.ts / sv.ts, value text only:

```diff
 nav:
-    schedule: "Schedule",              /  schedule: "Schema",
+    schedule: "Planner",               /  schedule: "Planerare",

 schedule:
-    title: "Schedule",                 /  title: "Schema",
+    title: "Planner",                  /  title: "Planerare",
```

Prose mentions of the page, same rename in both languages:
- `settings…handoverDesc` — "…on Dashboard and Schedule" → "…and Planner"
- `…medExtraHint` — "from the Schedule page" → "from the Planner page"
- `…navBody` — "Schedule, Meds, Vitals…" → "Planner, Meds, Vitals…"
- `…timesHint` — "later on the Schedule" → "later in the Planner"
- FAQ `u4A` — "on Today and Schedule" → "on Today and the Planner"
- marketing features card `schedule.title` — "Schedule" → "Planner"
- onboarding line "…appearing on Today and Schedule" → "…and the Planner"
- guidebook `schedule.title` + its body sentence, and the Medications body
  sentence referencing Schedule

Not touched: lowercase verb uses ("schedule an appointment", "scheduled",
"Today's schedule" on the dashboard card = a list of today's items, not the page).

## 2. "+ New event" → "Add care task"

```diff
 scheduleEvents:
-    new: "New event",                  /  new: "Nytt event",
+    new: "Add care task",              /  new: "Lägg till vårduppgift",
```

One key, both call sites (header button + empty-state button) update together.
"Lägg till vårduppgift" is natural Swedish and matches the domain wording.

## 3. Drop seizure + note from the create dropdown

```diff
 export const CARE_TASK_KINDS: AppointmentKind[] = APPOINTMENT_KINDS.filter(
-  (k) => !isVisitKind(k),
+  (k) => !isVisitKind(k) && k !== "seizure" && k !== "note",
 );
```

`AppointmentKind` and `APPOINTMENT_KINDS` are untouched — Events/Vitals keep using
seizure and note.

### Edit-case
`kindOptions` in `schedule.tsx` currently prepends only for `isVisitKind`. Seizure
and note are not visit kinds, so an existing seizure/note row would now hit the
empty-Select bug. Fix by dropping the redundant `isVisitKind` test and keying the
prepend off membership alone:

```diff
-      editing && isVisitKind(editing.kind) && !CARE_TASK_KINDS.includes(editing.kind)
+      editing && !CARE_TASK_KINDS.includes(editing.kind)
```

That covers visit kinds, seizure, note, and anything excluded later.

## Verify
Nav + page heading read Planner/Planerare; button reads Add care task /
Lägg till vårduppgift; dropdown has no Seizure or Note but keeps meal, sleep,
spo2, heart_rate, temperature, breathing, fluids, diaper, inhalation, task, other;
enum untouched; editing an existing seizure task still shows its value;
`/schedule` path unchanged; en/sv key parity; `tsgo --noEmit` clean.

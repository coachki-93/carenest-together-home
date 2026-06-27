## Goal

Add a clearer "Multiple times per day" option in the Repeat dropdown of the New/Edit task dialog on `/schedule`, so caregivers can quickly schedule a task that repeats at specific clock times each day (e.g. 08:00, 14:00, 20:00).

The underlying data already supports this — `appointments.recurrence_times_of_day` is stored, and the "Times of day" picker is already rendered when repeat is set to daily/weekly/monthly. The change is purely UX: surface it as a first-class repeat mode so users discover it.

## Changes

### `src/routes/_authenticated/schedule.tsx`

- Extend `RepeatMode` with a UI-only value `"specific_times"` (alongside `"none" | "hourly" | "daily" | "weekly" | "monthly"`).
- Add a new `<SelectItem value="specific_times">` to the Repeat dropdown labeled "Specific times each day" (English) / "Specifika tider varje dag" (Swedish).
- When `repeat === "specific_times"`:
  - Hide the "Every N days/hours/months" interval row and weekday picker.
  - Always show the existing Times-of-day editor (the same component used for daily/weekly/monthly), with a short helper line: "Task repeats every day at each listed time."
  - Require at least one time before save; show inline validation if empty.
- On save, map `"specific_times"` → persist as `recurrence_freq: "daily"`, `recurrence_interval: 1`, `recurrence_times_of_day: [...]`, `recurrence_byweekday: null`.
- On load (editing), detect `freq === "daily" && interval === 1 && times_of_day?.length > 0` and pre-select `"specific_times"` in the dropdown so the same task round-trips into the cleaner UI.

### `src/lib/i18n/en.ts` and `src/lib/i18n/sv.ts`

Add new keys under `scheduleEvents.repeat`:
- `specificTimes`: "Specific times each day" / "Specifika tider varje dag"
- `specificTimesHint`: "Task repeats every day at each time you add below." / "Uppgiften upprepas varje dag vid varje tid du lägger till nedan."
- `specificTimesRequired`: "Add at least one time." / "Lägg till minst en tid."

## Out of scope

- No database migration — `recurrence_times_of_day` already exists.
- No changes to dashboard/today rendering — daily-with-times already expands correctly.
- The existing daily/weekly/monthly modes keep their optional Times-of-day field unchanged for power users.

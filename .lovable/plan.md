# Fix: recurring tasks expand in different timezones on app vs. server

## What's wrong
The app turns a repeating task into occurrences in the **browser's** timezone; the push sweep does it in **UTC**. A "08:00" task shows at 08:00 Stockholm but is pushed at 08:00Z, and completions saved at the app's time aren't found by the sweep → false "missed" pushes. Since 25 Oct, tasks without times-of-day are also an hour off on the server.

## Fix
1. **One shared expander** — new `src/lib/schedule/recurrence.ts`:
   `expandRecurrence(master, rangeStart, rangeEnd, tz): Date[]`
   - Pure, no browser/server APIs beyond `Intl`.
   - Walks **wall-clock days in `tz`** (date strings `YYYY-MM-DD`, weekday computed from the date itself, not from a `Date` in local/UTC).
   - Times: `recurrence_times_of_day`, else the master's start wall-clock time **in `tz`** (via `wallClockIn`).
   - Each (day, time) → `zonedWallClockToDate(day, time, tz)`.
   - Daily interval aligned to the master's start day in `tz`; weekly by weekday in `tz`; monthly on the master's day-of-month in `tz` (skip months without that day — same as today).
   - Hourly stays absolute (start + n·interval hours) — identical on both sides already; across DST it keeps exact spacing (e.g. every 2 h stays 2 h apart, local clock labels shift by an hour). Flagging: say if you'd rather hourly snap to local wall-clock.
   - DST: a non-existent local time (02:30 on the last Sunday of March) resolves via `zonedWallClockToDate`'s existing behaviour (shifts forward); an ambiguous time (02:30 last Sunday of October) yields **one** occurrence (the first), never two.
   - Same safety caps as today.
2. **App** — `src/lib/data/appointments.ts`: delete `expandMaster`/`expandDayWithTimes`/`parseHHMM`; `useAppointments(familyId, start, end, tz)` calls `expandRecurrence` with the **family's** `families.timezone` (from the existing family-tz hook used by Planner/Medications), not the browser's. Query key gains `tz`. Callers updated: dashboard (Today), schedule (Planner), appointments, AppointmentsTodayBanner, AppointmentsReminderBanner.
3. **Server** — `dispatch-task-notifications.ts`: delete its `expandOccurrences`/`parseHHMM` copy; both pass 1–3 and the reminder pass call `expandRecurrence(m, …, infoFor(m.family_id).tz)`.
4. **Late push (pass 2)** — only when `late_after_minutes > 0` **and** `notify_start !== false`. (Today 0 fires at the same moment as start, and routines with start pushes off still get a late push.) Missed push (pass 3) unchanged.
5. **Families query** — paged with the existing `fetchAllPages` (order by id, 1000/page), same as masters; on error log and continue with default tz `Europe/Stockholm` as today.

## Tests (`src/lib/schedule/recurrence.test.ts`)
- Stockholm daily 08:00 in January → 07:00Z; in July → 06:00Z.
- Daily 08:00 across last Sunday of March (2027-03-28) and October (2026-10-25): 08:00 local each day, UTC jumps by 1 h; plus a 02:30 task on both DST days (one occurrence each).
- Weekly Sunday 00:30 Stockholm → Saturday 23:30Z (winter) / 22:30Z (summer), weekday correct.
- Monthly on the 1st 09:00 → correct UTC each month, incl. a DST-crossing month.
- Non-Stockholm tz (America/New_York) daily 08:00 → 13:00Z / 12:00Z.
- No times-of-day: uses master start wall-clock in tz (regression for the DST hour drift).
- **Parity**: the client path (`useAppointments`' instance builder, exported pure helper) and the server sweep candidate builder produce the same `occurrence_at` ISO strings for the same master + tz.
- Late pass predicate (extracted pure helper): 0 → no late push; notify_start=false → no late push; 10 + notify_start → pushes after 10 min.

## Existing data (read-only, no migration)
- 9 recurring masters; **1** has `recurrence_times_of_day`.
- 266 completions since 25 Oct; on recurring masters almost all are **hourly** tasks (unaffected — hourly is identical on both sides). First pass shows the one daily completion (19:00) lines up.
- After building, I'll run the new expander read-only over every completion since 25 Oct and report the exact number whose `occurrence_at` it wouldn't produce. I won't change any data without asking.

## Conflicts / flags
- **Today**: Today's task list, banners and completion `occurrence_at` all come from `useAppointments` → they move to family tz together, so completions keep matching what's shown. Users whose browser tz ≠ family tz will see task times shift to family time (intended).
- **Handover**: reads completions/rows directly, doesn't expand recurrences — no conflict. Old completions keep their stored `occurrence_at`.
- **Oxygen sweep**: doesn't use appointments — no conflict. Its families query is unpaged too; I'll **leave it** (out of scope) unless you want it paged in the same step.
- **Overrides**: matched by `master@occurrence ISO`. Existing overrides were created from the app's (browser-tz) occurrence; for the Stockholm-only families today they still match. Overrides on the one times-of-day master will match the app as before.
- **Pending dedupe rows** in `appointment_notifications` keyed on old UTC occurrences won't block new correct ones (different key) — at most one extra correct push per occurrence on deploy day.

## Affected files
- new `src/lib/schedule/recurrence.ts`, `src/lib/schedule/recurrence.test.ts`
- `src/lib/data/appointments.ts`
- `src/routes/api/public/hooks/dispatch-task-notifications.ts` (+ small pure late-pass helper, tested)
- callers of `useAppointments`: `src/routes/_authenticated/dashboard.tsx`, `schedule.tsx`, `appointments.tsx`, `src/components/carenest/AppointmentsTodayBanner.tsx`, `AppointmentsReminderBanner.tsx`
- `AGENTS.md` (rule: recurrence expansion only via the shared tz-aware expander)
- No i18n, no migration, no package changes.

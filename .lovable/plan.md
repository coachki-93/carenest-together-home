## Timer task option

Add an optional **timer** mode to scheduled tasks (medications + appointments), parallel to the existing "Ongoing" option. When the owner enables it and sets a duration, caregivers see a **Start timer** button on the Today page. Clicking it starts a live countdown on the row; when the countdown hits zero the task is auto-marked as Done.

### UX

**Scheduler dialogs** (`schedule.tsx`, `medications.tsx`)
- New toggle: **"Enable timer"** (below the Allow Ongoing toggle).
- When on, show a **Duration (minutes)** number input — default 1, min 1, max 120.
- Timer + Ongoing are independent toggles; can both be enabled on the same task (timer takes precedence on the row — if a timer is running, the Ongoing button is hidden).

**Today page** (`dashboard.tsx`)
- For tasks with `timer_minutes` set, where the task is pending and within 5 min of scheduled start (same window as Ongoing), show a **Start timer (Xm)** button.
- On click: record `timer_started_at = now()`; row shows a live `mm:ss` countdown badge ("Timer: 0:42") and progress bar.
- When countdown reaches 0 on the client: automatically call the existing "Done" mutation (using the active caregiver profile, no dialog). Optimistic completion + toast: "Auto-completed: <task>".
- Caregiver can still tap **Done** or **Skip** manually before the timer ends — that cancels the timer.
- Countdown survives page refresh (recomputed from `timer_started_at + timer_minutes`). If a user opens the page after the timer's end time and it's still pending, the row auto-completes immediately.

**Notifications**: none for timer start/auto-complete (keeps noise down; differs from Ongoing which the user explicitly asked to notify). Open question below.

### Data model

Two new columns each on `medications` and `appointments`:
- `timer_minutes int` (nullable; null = timer disabled)

Two new columns each on `med_logs` and `appointment_completions`:
- `timer_started_at timestamptz`
- `timer_started_by uuid` (caregiver profile id)

No new enums — auto-completion just writes the existing "given" / "done" status.

### Status / late-missed logic

`task-state.ts`: while a timer is running (started, not yet elapsed, status still pending) treat the task as **ongoing** for late/missed gating — i.e. suppress Late/Missed badges and skip the dispatcher, same way the Ongoing state already does. No new state value needed.

### Files to touch

- `supabase/migrations/<new>.sql` — add the 4 columns described above
- `src/lib/data/medications.ts`, `appointments.ts`, `appointment-completions.ts` — extend types + mutations to accept timer fields
- `src/lib/schedule/task-state.ts` — treat active timer as ongoing-for-gating
- `src/routes/_authenticated/schedule.tsx`, `medications.tsx` — toggle + minutes input
- `src/routes/_authenticated/dashboard.tsx` — Start-timer button, countdown badge, auto-complete effect
- `src/lib/i18n/en.ts`, `sv.ts` — new keys: `enableTimer`, `timerMinutes`, `startTimer`, `timerRunning`, `autoCompleted`
- `src/routes/api/public/hooks/dispatch-task-notifications.ts` — ignore rows whose active timer hasn't elapsed yet (same filter as ongoing)

### Open questions

1. **Scope** — apply timer option to medications + appointments only (same as Ongoing's first scope), or also include care-place checklist items?
2. **Notifications on auto-complete** — silent (my default), or notify family "Timer auto-completed <task>"?
3. **Duration presets** — free-form minutes input, or quick chips (1 / 2 / 5 / 10 / 15)?

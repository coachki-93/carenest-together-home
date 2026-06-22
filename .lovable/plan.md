# Ongoing Task Mode

Add an opt-in "Ongoing" capability to long-running tasks (appointments, medications, feeding/care-place items, hygiene). When the scheduler enables it, caregivers see an **Ongoing** button on the Today view. Tapping it marks the task as in-progress, pauses Late/Missed alerts, and notifies other family members. Status stays Ongoing until someone marks Done or Skip.

## UX

**Scheduler (Appointment / Medication / Care-place item dialogs)**
- New toggle: *"Allow 'Ongoing' status"* (default off).
- Helper text: "For longer tasks (visits, feeding, hygiene). Caregiver can mark it started; late/missed alerts pause until done."

**Today view (Dashboard + Schedule list)**
- If the task allows ongoing AND state is `pending`/`late`: show secondary **Ongoing** button beside Done/Skip.
- While ongoing: row gets a blue "In progress" badge (i18n: `Ongoing` / `Pågår`), Late/Missed badges are hidden, and Done/Skip remain available.
- Postpone is hidden while ongoing.

## Data model (one migration)

- `appointments.allow_ongoing boolean default false`, `ongoing_started_at timestamptz`, `ongoing_started_by uuid`.
- `medications.allow_ongoing boolean default false`.
- `med_dose_events`: add `ongoing_started_at timestamptz`, `ongoing_started_by uuid`.
- `care_place_checklist_items.allow_ongoing boolean default false` and `care_place_adhoc_items.allow_ongoing boolean default false`; track ongoing state on the corresponding `care_place_check_answers` row (add `ongoing_started_at`, `ongoing_started_by`).

No new tables. RLS unchanged (family-member scope already covers these rows).

## Status logic (`src/lib/schedule/task-state.ts`)

Extend `getTaskState`:
```
if (ongoingStartedAt && status === "pending") return "ongoing";
```
`"ongoing"` returns before Late/Missed checks → suppresses both badges and blocks the dispatcher's Late/Missed passes (dispatcher skips rows where `ongoing_started_at IS NOT NULL`).

## Notifications

Dispatcher (`src/routes/api/public/hooks/dispatch-task-notifications.ts`):
- Late/Missed passes filter out rows where `ongoing_started_at IS NOT NULL`.
- When a caregiver taps Ongoing, the client-side mutation calls a `notifyOngoing` server fn that pushes to everyone in the family except the actor: *"{Name} started {Task}"*.

## Files touched

- `supabase/migrations/<new>.sql` — schema additions only.
- `src/lib/schedule/task-state.ts` — add `"ongoing"` state.
- `src/lib/data/appointments.ts`, `medications.ts`, `care-place.ts` — new fields + `markOngoing` / `clearOngoing` mutations.
- `src/components/schedule/AppointmentDialog.tsx`, `MedicationDialog.tsx`, care-place item dialog — `Allow ongoing` toggle.
- `src/routes/_authenticated/dashboard.tsx`, `schedule.tsx`, care-place page — Ongoing button + badge.
- `src/routes/api/public/hooks/dispatch-task-notifications.ts` — skip ongoing rows.
- New server fn `notifyOngoing` (push to family minus actor).
- `src/lib/i18n/en.ts` + `sv.ts` — `ongoing`, `allowOngoing`, `allowOngoingHelp`, `ongoingStartedBy`.

## Out of scope

- No auto-end timer (per your answer: stays ongoing until Done/Skip).
- No new analytics; ongoing duration is implicit from timestamps.

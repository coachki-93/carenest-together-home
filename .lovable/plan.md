## Goal

Two visual states for unfinished tasks on the Today/Schedule lists, a per-task "missed after X minutes" setting, and push notifications for the full lifecycle (start, late, missed) — sent to everyone in the family except the actor.

## 1. Data model (one migration)

Add a `late_after_minutes` (default `0`) and `missed_after_minutes` (default `15`) column to both `medications` and `appointments`. These let the family pick per-task when the slot turns yellow and when it turns red.

Add lifecycle tracking columns:
- `appointments.late_notified_at` and `appointments.missed_notified_at` (timestamptz)
- `med_logs` already exists per dose; we need a separate tracking table because doses are virtual. Add `public.med_dose_events (medication_id, scheduled_for, late_notified_at, missed_notified_at)` with PK `(medication_id, scheduled_for)`, RLS scoped through `is_family_member` via the parent medication, GRANTs for `authenticated` and `service_role`.

## 2. Status logic (shared helper)

New `src/lib/schedule/task-state.ts` exporting:

```text
getTaskState(scheduledFor, lateAfterMin, missedAfterMin, now, status)
  -> "pending" | "late" | "missed" | "given" | "skipped" | "postponed"
```

Replace the current `isOverdue` boolean in `dashboard.tsx` and `schedule.tsx` with this helper so the row colour, badge text, and notification dispatcher agree.

Visual mapping:
- `late` — amber border + amber `Late / Sen` badge
- `missed` — red border + red `Missed / Missad` badge (current "försenad" styling, just renamed)

i18n: add `schedule.late` ("Late" / "Sen") and rename `schedule.overdue` -> `schedule.missed` ("Missed" / "Missad"). Update both `en.ts` and `sv.ts`.

## 3. Per-task customization in the schedule creator

In the appointment/medication create+edit dialogs (under `src/routes/_authenticated/schedule.tsx` and the medication form), add a small "Counts as missed after" numeric input (minutes, default 15) plus an optional "Show late warning after" input (minutes, default 0 = immediately). Owner/family-member RLS already gates writes.

## 4. Notifications (extend existing dispatcher)

`src/routes/api/public/hooks/dispatch-task-notifications.ts` already handles the "start time" push for appointments. Extend it to three passes per run:

1. **Start** — existing logic, plus a new pass for medication doses (join `medications` for `family_id`, write to `med_dose_events.late_notified_at` only after the start push so we don't double-send; actually use a dedicated `started_notified_at` — see below).
2. **Late** — find pending items where `now >= scheduled + late_after_minutes` and `late_notified_at IS NULL`, push "Late: {title}", stamp the column.
3. **Missed** — same shape with `missed_after_minutes` and `missed_notified_at`, push "Missed: {title}".

"Pending" means no completed `med_log`/`appointment_completion` for that slot. The dispatcher already runs each minute via pg_cron (kept as-is; cron config not changed).

**Actor exclusion**: when a caregiver logs done/skipped/postponed we don't push a "handled" notification (the user picked the first three events only). But the late/missed passes naturally stop once a log exists, so no extra work.

To keep the start-time column on med doses, add `started_notified_at` to `med_dose_events` in the same migration.

## 5. UI plumbing

- Dashboard task row: use `getTaskState`; render the amber pill when `late`, red pill when `missed`. Reuse the existing red border styling for `missed` rows.
- Schedule page list: same treatment.
- Per-task inputs surface the new columns; existing tasks fall back to defaults via column defaults.

## Technical notes

- All new columns nullable except the two `_after_minutes` ints (NOT NULL with defaults), so existing rows keep working.
- `med_dose_events` is keyed `(medication_id, scheduled_for)` and uses `ON CONFLICT DO UPDATE` so the dispatcher can upsert stamps idempotently.
- RLS on `med_dose_events`: `USING (EXISTS (SELECT 1 FROM medications m WHERE m.id = medication_id AND public.is_family_member(m.family_id, auth.uid())))`; service_role bypasses for the dispatcher.
- No changes to the cron schedule — the same 1-minute job covers all three passes.
- Actor-exclusion for push: the dispatcher only fires on time-based transitions, so it never sends as a result of a user action; nothing extra needed.

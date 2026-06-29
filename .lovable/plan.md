## Goal

Tackle two areas together: **Safety Nets** (catch dangerous gaps the app currently doesn't surface) and **Handover quality** (less manual writing between shifts). Both build on systems we already have — push notifications, oxygen tracking, vitals, completions — so no new infrastructure.

## Part 1 — Safety Nets

### 1a. Missed critical task escalation
- New column `appointments.escalate_after_minutes` (nullable int) + `medications.escalate_after_minutes`.
- When a task crosses `escalate_after_minutes` past due AND is still pending, a new server route (called by the existing `dispatch-task-notifications` sweep, or a sibling hook) sends a second push to **all family members** with title like "⚠️ Missed: Morning insulin" — distinct tag so it deduplicates per task.
- UI: in the task dialog (`schedule.tsx` + medications), an optional field "Alert everyone if X min late" only shown for tasks the owner marks important.

### 1b. Low-oxygen early warning
- `oxygen_tanks` already has duration logic in `lib/oxygen/tanks.ts`. Add a scheduled hook (`api/public/hooks/oxygen-low-sweep.ts`) that runs every 15 min via pg_cron, computes remaining minutes for every active tank across all families, and pushes once when crossing a threshold (e.g. 60 min remaining, then 20 min remaining). Dedupe via a new `oxygen_tanks.low_alert_sent_at` / `critical_alert_sent_at` columns.
- Owner-configurable thresholds per family stored on `families` (`oxygen_warn_minutes`, `oxygen_critical_minutes`, defaults 60 / 20).

### 1c. Abnormal-vitals streak alerts
- After each `vitals` insert, a server fn checks the last N readings of the same `vital_type` for the same child. If 3 in a row fall outside the reference range (custom range if set, else default from `lib/vitals/ranges.ts`), push to family: "SpO₂ low 3 readings in a row".
- Implementation: extend `useLogVital` to call a new `notifyAbnormalStreak` server fn after success. Cheap and event-driven, no cron needed.

### 1d. Emergency info screen
- New route `_authenticated/emergency.$childId.tsx` — full-screen, high-contrast read-only view of: child's diagnoses, allergies, current meds (name + dose + frequency), emergency contacts, hospital/clinic phone numbers, blood type.
- Data: extend `children` with `diagnoses text`, `allergies text`, `blood_type text`, `emergency_contacts jsonb` (array of {name, relation, phone}). Editable from the child profile by owner.
- Add an always-visible "Emergency" button in `DashboardLayout` header — one tap to open.

## Part 2 — Handover Auto-Prefill

The handover form (`handover.tsx`, prefill in `lib/data/handover-prefill.ts`) currently uses minimal data. Expand it so when a caregiver opens a new handover, the form is pre-populated with a structured summary of the shift just ending.

### Auto-collected fields (per shift window)
- **Vitals out of range** — list each abnormal reading with timestamp + value.
- **Missed/late tasks** — count of tasks that went red, with names.
- **Meds given** — list of medication completions during the shift.
- **Oxygen** — tank swaps during the shift, current tank's remaining time.
- **Hospital toggle** — note if "at hospital" was on at any point during the shift.
- **Care-place checks** — list of failed/skipped check items.
- **Free-text notes from completions** — concatenate any notes added when marking tasks done.

### UX
- Each auto-section appears in the handover form as a pre-filled editable block with a small "auto-generated" pill — caregiver can edit/delete before signing off.
- Keep current free-text "notes" field at the bottom for anything custom.

### Implementation
- Extend `lib/data/handover-prefill.ts` to fetch from `vitals`, `appointment_completions`, `med_logs`, `oxygen_tanks`, `care_place_check_answers` filtered to `start_at..end_at` of the current shift.
- Render structured sections in `handover.tsx` instead of one big textarea.
- Persist as JSON in a new `handovers.auto_summary jsonb` column (so historic handovers keep the structured data, not just a flattened string).

## Order of work

1. Handover auto-prefill (Part 2) — pure read-side, low risk, immediate daily value.
2. Emergency info screen (1d) — small schema add, no background jobs.
3. Abnormal-vitals streak alerts (1c) — event-driven, builds on existing push setup.
4. Low-oxygen early warning (1b) — needs pg_cron job.
5. Missed-critical escalation (1a) — extends existing notification sweep.

## Out of scope

- No caregiver workload dashboard, no PDF export, no photo notes — keep for a later round.
- No changes to existing notification cadence for non-critical tasks.
- All new strings go through `t()` in both `en.ts` and `sv.ts` per project core rule.

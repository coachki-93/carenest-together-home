# End-of-Shift Tidy

A lightweight cleanup checklist that appears near the end of a caregiver's shift. Modeled on Care Place Control, but simpler: each task is just done / skipped with an optional note.

## How it works

- **Owner** configures the checklist in Settings (tasks + lead time).
- Lead time is chosen from a preset (15 / 30 / 45 / 60 min before shift end).
- When the caregiver's current shift is within that window, a banner appears at the top of the dashboard: *"Wrap up your shift"*.
- Each task shows two buttons: **Done** / **Skip**. Skipping opens a small note field.
- Submitting closes the banner for that shift; results are logged.

## Where it appears

- **Settings** (owner only) — new "End-of-Shift Tidy" card below Care Place Control, with:
  - Enable toggle
  - Lead time selector (15/30/45/60 min)
  - Task list (add / rename / reorder / delete)
- **Dashboard** — banner when the active caregiver's shift ends within the lead window and the tidy hasn't been submitted yet.
- **Handover auto-prefill** — skipped tasks are appended to the outgoing notes so the next caregiver knows what's still pending.

## Technical section

### Database (new tables)

```
tidy_checklist_items
  id, family_id, label, position, active, created_at, updated_at

tidy_settings
  family_id (PK), enabled, lead_minutes (default 30), updated_at

tidy_submissions
  id, family_id, shift_id (nullable), performed_by, submitted_at

tidy_submission_answers
  id, submission_id, family_id, item_id, item_label_snapshot,
  status ('done' | 'skipped'), note
```

All tables: standard grants + RLS (family members read, owners manage settings/items, members insert submissions for their own shift).

### Frontend

- `src/lib/data/tidy.ts` — hooks: `useTidySettings`, `useTidyItems`, `useUpsertTidyItem`, `useSubmitTidy`, `useShiftTidyStatus(shiftId)`.
- `src/components/carenest/TidySettings.tsx` — settings card (mirrors `CarePlaceCheckSettings`).
- `src/components/carenest/EndOfShiftTidyBanner.tsx` — dashboard banner (mirrors `CarePlaceCheckBanner`, simpler answer UI).
- Wire the banner into `src/routes/_authenticated/dashboard.tsx` alongside the existing Care Place banner.
- Wire the settings card into `src/routes/_authenticated/settings.tsx`.
- Extend `src/lib/data/handover-prefill.ts` to append any skipped items from the last tidy submission of the shift being handed over.

### Trigger logic

Read the active caregiver's current shift (already available via `src/lib/data/shifts.ts`). Show the banner when:
`shift.end_at - now() <= lead_minutes` AND `now() < shift.end_at` AND no submission exists yet for that `shift_id`.

### i18n

New keys under `tidy.*` in both `src/lib/i18n/en.ts` and `src/lib/i18n/sv.ts` (title, subtitle, "Done", "Skip", "Add note", "Wrap up your shift", settings labels, empty state).

### Out of scope for v1

- No push notifications (can be added later like Care Place has).
- No inventory link on tasks.
- No missed-tidy sweep / escalation.

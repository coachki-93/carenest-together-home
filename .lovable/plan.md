## Overview

A parent/owner defines a shared checklist (items + which times of day a check is required). On the Today/Home page, when the next required check window is active and not yet completed, a red banner appears above today's schedule: **"Utför kontroll utav vårdplats"**. Tapping it opens the checklist; caregivers fill it in and submit. All completions are saved with who/when/answers, viewable by parents.

## Database (new tables)

1. `care_place_checklist_items` — the shared checklist (one per family).
   - `family_id`, `label` (text), `item_type` (`yesno` | `count`), `min_count` (nullable int, threshold warning for count items), `position` (int for ordering), `active` (bool).

2. `care_place_check_times` — when a check is required each day.
   - `family_id`, `time_of_day` (time, e.g. `07:00`), `label` (nullable, e.g. "Morgon"), `active`.

3. `care_place_checks` — a completed check.
   - `family_id`, `performed_by` (user id), `scheduled_time` (time — which slot this fulfills), `scheduled_date` (date), `performed_at` (timestamptz), `notes` (nullable text).

4. `care_place_check_answers` — answers per item for a check.
   - `check_id`, `item_id`, `item_label_snapshot` (text — preserve label if item later edited), `item_type_snapshot`, `yesno_value` (bool nullable), `count_value` (int nullable).

RLS: family members read; only owners write to `_items` and `_times`; any family member can insert `_checks` / `_answers`; only owners can delete history. Standard GRANTs to `authenticated` + `service_role`.

## Banner logic (Today / Home page)

- Load active `care_place_check_times` for the family.
- Determine the most recent slot whose `time_of_day <= now()` for today that has no matching row in `care_place_checks` for today.
- If one exists → render a red `Alert`-style card above today's schedule with the slot label/time and a "Starta kontroll" button.
- Clicking opens a dialog with the checklist (yes/no toggles, count number inputs). On submit: insert one `care_place_checks` row + N `care_place_check_answers` rows, then invalidate.
- If a `count` answer is below `min_count`, show an inline warning but still allow submit (caregivers must know to restock).

## Instruction-style management page

New section in **Settings** (owner-only, gated by `is_family_owner`):

- **Checklist items**: add / edit / reorder / deactivate items. Each item picks type (Ja/Nej or Antal) and an optional minimum count.
- **Kontrolltider**: add / remove times of day (HH:MM) with optional label.
- **Historik**: list of past checks (date, time slot, caregiver, answers) with filtering by date range.

Non-owners see a read-only summary plus their own recent submissions.

## i18n

Add Swedish + English keys for: banner title, button, dialog title, item type labels, "Antal", "Minsta antal", "Lägg till objekt", "Lägg till tid", "Historik", warning text for low count, success toast, etc. All strings go through `t()` in both `en.ts` and `sv.ts`.

## Files to add/change

**New**
- `supabase/migrations/<ts>_care_place_checks.sql` — 4 tables + GRANTs + RLS + policies + `updated_at` triggers.
- `src/lib/data/care-place-checks.ts` — React Query hooks: items, times, today's required check, submit check, history.
- `src/components/carenest/CarePlaceCheckBanner.tsx` — red alert + dialog with checklist form.
- `src/components/carenest/CarePlaceCheckSettings.tsx` — owner UI for items + times + history (rendered inside Settings).

**Edited**
- `src/routes/_authenticated/home.tsx` (or whichever route is "Today") — mount `<CarePlaceCheckBanner />` above the schedule.
- `src/routes/_authenticated/settings.tsx` — add a "Kontroll utav vårdplats" section using the new settings component.
- `src/lib/i18n/en.ts` and `src/lib/i18n/sv.ts` — new keys.
- `src/integrations/supabase/types.ts` — regenerated after migration.

## Open assumption

The banner is per-day per-slot: once any caregiver completes the 07:00 check today, it disappears until the next configured slot. Late checks for a missed slot remain visible until end of day. Let me know if you'd prefer a strict "current shift only" trigger instead.

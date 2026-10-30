# Roadmap

## Task checklists (done)
- [x] Migration: appointments.checklist + appointment_completions.checklist_result
- [x] Planner dialog checklist editor (read-only + hint for "this occurrence only")
- [x] Today: tickable steps; checklist_result only on done; warning inside existing dialog if one opens, else AlertDialog
- [x] Today: completed occurrence shows read-only ✓/✗ snapshot
- [x] Medication rows show no checklist
- [x] Handover line for unticked steps; null = no data (test)
- [x] i18n en/sv parity
- [x] Verify: live trace, skipped => null, vitest, tsgo

## Next
- Routine setup + care-need task suggestions (uses checklist)
- Tighten appointments update policy (separate)

## Guided routine setup (done)
- [x] Migration notify_start + sweep skip START
- [x] Planner "Notify when it starts" checkbox
- [x] Sweep reliability: page masters, chunk overrides (100), error checks, tests
- [x] routine-templates.ts (catalog, capabilities[])
- [x] /routines page, onboarding + child.tsx entry
- [x] Split routines status in scaffolds; reset keeps created
- [x] Dashboard card: routines reminder; remove feed/neb/glucose task offers
- [x] i18n, tests, live verification

## Recurrence timezone fix (done)
- [x] Shared tz-aware expander used by app + task sweep
- [x] useAppointments waits for family tz; family-tz day ranges on Today/Planner/Calendar/banners
- [x] Late push only when late_after_minutes > 0 and notify_start
- [x] Page families in task + oxygen sweeps
- [x] Tests + read-only completion count

## Task write access (owner or creator) (done)
- [x] Migration: policies, can_manage_appointment(id, family, user), immutables trigger
- [x] Client canManage mirrors series rule (Planner + visits calendar gate)
- [x] API verification as caregiver + owner
- [x] Override upsert index fix (42P10)
- [x] Sweep: moved overrides push at new starts_at (passes 1–4), tests
- [x] Today late/missed uses moved time (confirmed)
- [x] In-app occurrence verification
- [ ] Live 5-min moved-push check — needs publish (cron runs the published code)
- [ ] Move a single occurrence of a recurring task to another day (currently date-locked; workaround: cancel occurrence + one-off task). Needs cross-midnight display/sweep handling.

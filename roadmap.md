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

## Guided routine setup (plan approved in principle; migration awaiting review)
- [ ] Migration notify_start + sweep skip START
- [ ] routine-templates.ts (catalog, capabilities[])
- [ ] /routines page, onboarding + child.tsx entry
- [ ] Split routines status in scaffolds; reset keeps created
- [ ] Dashboard card: routines reminder; remove feed/neb/glucose task offers
- [ ] i18n, tests, live verification

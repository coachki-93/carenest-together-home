# Unified "+ Log" dialog (Today + Events)

One dialog component, used identically on the Today (dashboard) page and the Events page. Vitals stay quick; events gain the full incident detail that only the Events page had.

## What changes

- New shared component `src/components/carenest/UnifiedLogDialog.tsx`, built by extending the existing QuickLogDialog structure (it already handles both vitals and events, the actor guard, and the preset picker). CareEventDialog's rich fields move in as the "event selected" branch.
- Today page (`dashboard.tsx`) swaps `QuickLogDialog` → `UnifiedLogDialog`.
- Events page (`events.tsx`) uses `UnifiedLogDialog` for the "+ Log event" (create) button.
- `QuickLogDialog.tsx` is deleted once nothing imports it.

### Why extend QuickLog rather than CareEventDialog

QuickLog already owns the two-step "pick a tile, then fill fields" flow and the vital write path; CareEventDialog owns a single flat event form. Adding a step to CareEventDialog would mean rebuilding the picker plus the vitals hook wiring, so the QuickLog shell is the cheaper, lower-risk base.

## Option catalog (identical on both pages)

Step 1 of the dialog shows two labelled groups:

- Vitals: temperature, heart_rate, spo2, breathing, fluids, diaper (unchanged presets, same icons/tones).
- Events: the full `CareEventType` list ordered by `orderedEventTypesFor(child.care_needs)` — seizure, desaturation, vomiting, feed_issue, breathing_difficulty, behavioural, injury, other — using `CARE_EVENT_META` icons so tiles match the Events page.

The old QuickLog "note" tile is dropped; `other` from the event list replaces it (same underlying `type: "other"`).

## Progressive fields (step 2)

Selected a VITAL:
- numeric value + unit chip, context chips, notes, `datetime-local` time with a "Now" shortcut. Same as today — a quick temp stays 2 taps.

Selected an EVENT:
- date + time inputs in the family timezone (`dateInputIn` / `timeInputIn` read, `zonedWallClockToDate` write), severity chips (none/mild/moderate/severe), duration min+sec, description (required), action taken.

A "← change type" link returns to the picker in both cases.

## Writes (unchanged shape)

- Vitals → `useLogVital` exactly as now.
- Events → `useCreateCareEvent` with `severity`, `action_taken`, `duration_seconds` now populated from the form instead of hardcoded `null`. That is the functional upgrade.
- Caregiver attribution stays `useCurrentActor` + `guardActingProfile`; `created_by` is the signed-in user id.

## CareEventDialog stays — for editing only

`events.tsx` passes `event={editing}` for the pencil action gated by `canEditCareEvent` (2h window), and CareEventDialog is the only thing wired to `useEditCareEvent`. It is kept, unchanged, for that edit flow; only its create usage is replaced. Editing is untouched.

## Cross-appearance

Events logged from Today already write to `care_events`, so they appear on the Events page — confirmed, no change needed. Vitals go to the vitals system and do not appear in the events list; that is expected and stays.

## Technical notes

- No schema, RLS, query, or billing changes. No change to the events list, filters, archive, or edit-window logic.
- i18n: reuse existing `careEvents.*` and `vitals.*` keys; only new keys are the two group headings (`quickLog.groups.vitals` / `quickLog.groups.events`), added to both `en.ts` and `sv.ts`.
- Verified green with `tsgo` and the existing vitest suite.

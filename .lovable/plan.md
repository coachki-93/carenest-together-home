## Goal
Make the Change Flow dialog clearly show that the remaining oxygen is preserved when switching flow rates — not just a different time format.

## Changes
Edit only `src/routes/_authenticated/oxygen.tsx` — `ChangeFlowDialog` component. No data/logic changes.

Inside the dialog, after the user picks a new flow rate, compute a live preview using existing helpers (`computeRemaining`, `durationMinutes`, `formatDuration`) and render a small summary card showing:

- Current: `<current flow>` · `<remaining time>` left · `<percent>`%
- After change: `<new flow>` · `<new remaining time>` left · same `<percent>`%
- New estimated empty: `<formatted date>`

The percentage is identical before/after (that's the point — volume is preserved), shown explicitly so the user understands what's happening.

## Localization
Add new keys under `oxygen.*` to both `src/lib/i18n/en.ts` and `src/lib/i18n/sv.ts`:
- `oxygen.changeFlowPreviewTitle` — "Preview" / "Förhandsvisning"
- `oxygen.changeFlowCurrent` — "Current" / "Nuvarande"
- `oxygen.changeFlowAfter` — "After change" / "Efter ändring"
- `oxygen.changeFlowCarried` — "{{percent}}% of the tank carries over" / "{{percent}}% av tuben förs över"
- `oxygen.changeFlowNewEmpty` — "New estimated empty" / "Ny beräknad tom"

## Out of scope
- No DB changes, no changes to `useChangeFlow` logic, no changes to the main tank card.

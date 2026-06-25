Replace the current `InhalationIcon` with a classic L-shaped asthma inhaler (puffer) with a short spray burst at the mouthpiece. No other changes — the icon is already wired into the schedule page's `KindIcon` for the "inhalation" appointment kind.

## What changes

- `src/components/icons/InhalationIcon.tsx` — rewrite the SVG paths to draw:
  - A vertical canister (rounded rectangle, top portion) sitting on top of
  - A horizontal mouthpiece extending to the left (forming the L shape)
  - 2–3 short spray lines puffing out from the mouthpiece tip

Keep the existing component API unchanged: same props (`size`, `strokeWidth`, `className`, ...rest), Lucide-style `currentColor` stroke, no fill, 24×24 viewBox, `strokeLinecap="round"`. This way every existing import site (currently just `schedule.tsx`) keeps working with no further edits.

## Technical details

```text
   ┌──┐        canister (top)
   │  │
┌──┴──┴──┐     body + mouthpiece junction
│        │
└────────┘ ))) spray puffs to the left
```

No new files, no dependency changes, no i18n changes.

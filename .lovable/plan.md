I'll hand-draw a custom SVG component matching your reference (head profile with wind streaks blowing into the mouth) and wire it into the schedule.

## What I'll change

1. Create `src/components/icons/InhalationIcon.tsx` — a lucide-styled React component that returns an SVG of a side-profile head with three curved wind streaks flowing into the mouth. Uses `currentColor` stroke and accepts `className` / `size` so it drops in like any lucide icon.
2. In `src/routes/_authenticated/schedule.tsx`:
   - Remove the `CloudFog` import and import `InhalationIcon` instead.
   - Swap `<CloudFog className={className} />` for `<InhalationIcon className={className} />` in the `KindIcon` switch's `"inhalation"` case.
   - Keep the existing teal tone (`bg: "#CCFBF1", fg: "#0F766E"`).

## Notes

The icon will be drawn from scratch as an outline (stroke `currentColor`, `strokeWidth={1.75}`, `strokeLinecap="round"`, `strokeLinejoin="round"`) so its weight and feel match the other lucide icons used across the schedule. No data, i18n, or DB changes needed — those were done last turn.

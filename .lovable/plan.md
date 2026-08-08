# Fix desktop timeline pinning regression

## Goal
Restore the desktop scroll-pinned "A day with Tillsa" timeline animation. CSS-only change.

## Root cause
`src/components/marketing/DayTimeline.tsx` wraps the entire section in:

```tsx
<section className="... overflow-hidden">
```

The desktop pinned timeline uses `position: sticky; top: 0` on a descendant element. `position: sticky` is clipped by any ancestor with `overflow: hidden | auto | scroll`, so the sticky element no longer pins to the viewport and the scroll-driven card crossfade is dead.

## Change
Remove `overflow-hidden` from the shared `<section>`.

The mobile carousel does not need this ancestor-level overflow control: `MobileCardCarousel.tsx` already wraps its scroll-snap track in its own `overflow-hidden` container, so horizontal page overflow on mobile is still contained.

## Files touched
- `src/components/marketing/DayTimeline.tsx`

## Verification
- `tsgo --noEmit` clean.
- Desktop (≥1024 px): scroll through the timeline section and confirm the sticky card pins and advances through the four time steps (07:00 → 07:10 → During the day → 15:00).
- Mobile (375 px): confirm the carousel still works and `document.documentElement.scrollWidth === clientWidth` (no horizontal page overflow).

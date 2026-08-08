# Mobile overflow fix: Problem section chat cards

## Goal
Stop the two old/new chat cards in the landing "problem" section from clipping off the right edge on mobile (≤375 px). CSS-only change; no text or i18n edits.

## Root cause
The grid at `src/routes/index.tsx:124` renders the two cards as direct grid children:

```tsx
<div className="grid md:grid-cols-2 gap-6 md:gap-8 items-stretch">
  <ProblemOldCard />
  <ProblemNewCard />
</div>
```

Each card is wrapped in `<Reveal>`, which renders a block-level `<div>`. Without `min-w-0`, that grid item refuses to shrink below the intrinsic width of the chat bubbles, so the card overflows the viewport and `overflow-hidden` on the section clips the bubbles.

## Change
Add `className="min-w-0"` to the `<Reveal>` wrapper inside both `ProblemOldCard` and `ProblemNewCard` so the grid items shrink to the column width. The bubbles already use `max-w-[85%]` and normal `white-space`, so they will wrap naturally once the card width is constrained.

## Files touched
- `src/routes/index.tsx` (2 call-site className additions)

## Verification
- `tsgo --noEmit` clean.
- Playwright screenshot at 375 px: both chat cards fit within the viewport, no right-edge clipping, no horizontal page scroll, bubbles wrap naturally.
- Desktop (≥1024 px): two-column layout unchanged.

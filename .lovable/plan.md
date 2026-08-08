# Mobile presentations for "A day with Tillsa" + "What changes"

## Library decision
The project already ships **shadcn `src/components/ui/carousel.tsx` backed by `embla-carousel-react` ^8.6.0**. I will NOT use it here. Reason: Embla needs a fixed-width flex track and its own drag layer, and both sections' cards are content-height, i18n-length-variable blocks. The requested behaviour (one card per viewport, swipe, dots) is fully covered by a native **CSS scroll-snap track** (`flex overflow-x-auto snap-x snap-mandatory`, slides `w-full shrink-0 snap-center`) with an `IntersectionObserver`/scroll listener driving the dot state. Zero new dependencies, native momentum/accessibility, no risk of the desktop pinned/fan logic being touched. If you'd rather standardise on the existing shadcn carousel, say so and I'll swap the track implementation.

## File list

| File | Change |
| --- | --- |
| `src/components/marketing/MobileCardCarousel.tsx` | NEW — shared scroll-snap track + dot indicators + prev/next, generic over children |
| `src/components/marketing/DayTimeline.tsx` | Export `CardBody` + the card definitions; wrap the whole existing render in `hidden md:block`; render `<DayTimelineMobile />` under `md:hidden` |
| `src/components/marketing/DayTimelineMobile.tsx` | NEW — header + 4 steps (c1–c4) in `MobileCardCarousel` |
| `src/components/marketing/OutcomeDeck.tsx` | Export `CARDS` + `OutcomeDef`; wrap existing section body in `hidden md:block`; render `<OutcomeSwitcher />` under `md:hidden` |
| `src/components/marketing/OutcomeSwitcher.tsx` | NEW — segmented control (1–4 chips using each card's eyebrow) + one card shown at a time |

No route changes: `src/routes/index.tsx` keeps importing `<DayTimeline />` and `<OutcomeDeck />`; each component internally splits mobile/desktop.

## Behaviour

**1 — DayTimeline mobile carousel (`md:hidden`)**
- Track: `flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none]`, wrapper `overflow-hidden`.
- Slide: `w-full shrink-0 snap-center min-w-0` → exactly one viewport width, so nothing can clip or cause page-level horizontal overflow.
- Card content = the same `eyebrow + title + body + visual` via the existing `CardBody`, stacked (its `md:grid-cols-[1fr_1fr]` already collapses to one column below md).
- Dots below (4 buttons, `aria-label` "Step n of 4", `aria-current`) + prev/next chevrons. Tapping scrolls with `scrollTo({ behavior })`.
- Active index tracked from the track's `scrollLeft` (rAF-throttled), same pattern the file already uses.

**2 — OutcomeDeck mobile switcher (`md:hidden`)**
- Segmented control row: 4 tappable chips (icon + eyebrow), horizontally scrollable if tight, `role="tablist"` / `role="tab"` with `aria-selected`; card is the `tabpanel`.
- Exactly one card rendered at a time, plain block layout — **no `translate`/`rotate`/absolute positioning, no `FAN`/`PART` constants imported**, so the fan transforms cannot leak in.
- Prev/next + "2 / 4" counter under the card.
- Card body reuses the same theme tokens, icon, eyebrow/headline/body keys and `Vignette` as the desktop deck.

**Reduced motion:** both use `matchMedia("(prefers-reduced-motion: reduce)")` — matching the existing gate style in these files — and drop to `behavior: "auto"` scrolling / no fade transition when reduce is set.

**Desktop untouched:** DayTimeline's pinned track and OutcomeDeck's fan + `FallbackGrid` keep their current code and JS media gates verbatim; they just sit inside a `hidden md:block` wrapper. OutcomeDeck's existing sub-xl `FallbackGrid` therefore still serves md–xl (768–1279px) unchanged.

## Conflicts / risks flagged
- `OutcomeDeck.tsx` exports `OUTCOME_DECK_THEME` and `CardTheme`, consumed by `src/components/features/MosaicDeck.tsx` and `src/routes/about.tsx`. I'm only **adding** exports, not changing those, so both stay working — I'll typecheck to confirm.
- `DayTimeline`'s non-pinned branch currently doubles as the SSR/no-JS baseline for all widths. After the split, SSR renders both branches (one hidden by CSS at each breakpoint) — correct, but it means the mobile carousel markup exists in desktop HTML (`display:none`, no layout cost).
- i18n: reusing existing `marketing.day.timeline.c1–c4.*` and `marketing.outcomes.*` keys only. No new copy, no parity change.

## Verification
- Playwright at 375px: both sections screenshotted at two carousel/switcher positions; assert `document.documentElement.scrollWidth <= innerWidth` (no horizontal page overflow) and that each card's `getBoundingClientRect().right <= 375`.
- Playwright at 1280px: pinned timeline + fanned deck screenshots compared against current behaviour.
- `tsgo --noEmit` clean.

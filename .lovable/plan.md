## Changes to Pediatric Reference Ranges card

In `src/routes/_authenticated/vitals.tsx`:

1. **Remove the colored side accent** — drop the `border-l-4 ${accent.border}` class from the card so no colored stripe appears on the left edge regardless of which tab is active.

2. **Make the card more compact** without removing any info:
   - Reduce card padding (e.g. `p-6` → `p-4`, header spacing tightened)
   - Tighten table density: smaller row padding (`py-2` → `py-1.5`), smaller text where safe (`text-sm` → `text-xs` for table cells, keep headers readable)
   - Reduce gaps between tab buttons, table, clinical note, and warning blocks
   - Slightly smaller pill tab buttons (reduced vertical padding)
   - Tighten the temperature method-offset table the same way

No information removed — only spacing/typography tightened and the left color stripe deleted. Tab pill colors and section accents inside content stay as they are so each vital is still visually distinguishable.

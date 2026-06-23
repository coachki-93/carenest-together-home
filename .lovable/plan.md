## Goal

Three improvements to the vitals workflow:

1. Align reference ranges with the pediatric table you shared.
2. Let owners/parents set custom ranges per child (defaults auto-fill until overridden).
3. Let caregivers tag a context (sleeping, awake, fever, pain, etc.) when logging a vital, since it explains out-of-range readings.

---

## 1. Reference ranges

Currently we have age buckets but they don't match your table. Update `getVitalRanges()` in `src/lib/data/vitals.ts` to use these buckets:

```text
Age          HR        Breathing   SpO₂      Temp (fever ≥)
0–3 mo       110–160   30–60       95–100    <38.0 °C
3–6 mo       100–150   30–45       95–100    <38.0 °C
6–12 mo       90–130   25–40       95–100    <38.0 °C
1–3 yr        80–125   20–30       95–100    <38.0 °C
3–6 yr        70–115   20–25       95–100    <38.0 °C
6–12 yr       60–100   14–22       95–100    <38.0 °C
12–18 yr      60–100   12–18       95–100    <38.0 °C
```

Add a disclaimer banner near the top of `/vitals` (translated EN + SV):
> "These are screening/reference ranges, not diagnosis rules. A child who is crying, febrile, dehydrated, asleep, exercising, in pain, or anxious may fall outside these."

## 2. Custom per-child ranges (owner-only)

**Database** — add one column to `children`:
- `custom_vital_ranges jsonb not null default '{}'::jsonb`

Shape stored: `{ heart_rate?: {low,high}, spo2?: {low,high}, temperature?: {low,high}, breathing?: {low,high} }`. Missing keys fall back to the age-based default.

**Child profile page** (`src/routes/_authenticated/child.tsx`) — add a "Reference ranges" section visible to all members but **editable only by owners** (use existing role check pattern). Each of the 4 vitals shows:
- The current age-based default as placeholder ("Default: 90–130 bpm")
- Two number inputs for low / high
- A "Reset to default" button per row that clears the override

**Range lookup** — update `getVitalRanges(ageMonths, overrides?)` to merge `overrides` on top of the age-based result. All vitals page consumers (status colors, "out of range" badges, abnormal counts, chart reference lines) pass the child's `custom_vital_ranges` so the UI reflects the override everywhere automatically.

## 3. Context tag when logging

**Database** — add to `vitals`:
- `context text` (nullable) — stores one of: `awake`, `sleeping`, `crying`, `fever`, `pain`, `exercising`, `anxious`, `other`. Null = not specified.

**Quick log dialog** (`src/components/carenest/QuickLogDialog.tsx`) — add a horizontal chip selector above the Notes field, single-select, optional. Same options shown in the disclaimer wording. Save `context` alongside the existing insert.

**History / recent list** — show the context as a small badge next to the value (e.g. "98 bpm · sleeping") so an out-of-range reading reads in context. Charts stay unchanged.

## Files touched

- migration: `children.custom_vital_ranges`, `vitals.context`
- `src/lib/data/vitals.ts` — new range table, signature `getVitalRanges(ageMonths, overrides?)`, `VitalContext` type
- `src/routes/_authenticated/vitals.tsx` — disclaimer banner, pass overrides into range calls, render context badges
- `src/routes/_authenticated/child.tsx` — owner-only ranges editor + reset
- `src/components/carenest/QuickLogDialog.tsx` — context chip selector
- `src/lib/i18n/en.ts` + `sv.ts` — disclaimer, context labels, ranges editor labels

## Open question before I implement

Temperature in the table is described as a fever threshold (≥38.0 °C), not a range. I'll model it as `{low: 36.0, high: 37.9}` so anything ≥38.0 flags as high — okay, or do you want a different low bound (e.g. 36.5)?

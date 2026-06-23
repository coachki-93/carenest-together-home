# Vitals page improvements

Scope: enhance the existing `/vitals` page only. No new routes, no business-logic changes outside the vitals module. All strings go through i18n (en + sv).

## 1. Breathing rate chart

- Add `breathing` to `VITAL_RANGES` in `src/lib/data/vitals.ts` with age-adjusted defaults (see section 3).
- Add a `breathing` overview tile to the top grid (becomes 6 tiles; layout: `grid-cols-2 md:grid-cols-3 xl:grid-cols-6`).
- Add a `<TrendCard type="breathing" />` to the trend chart grid, next to heart rate / SpO₂ / temperature.
- Reuse existing `TrendCard` — no new chart component needed.

## 2. Per-range averages on each chart

- In `TrendCard`, compute `avg`, `min`, `max` from the filtered `points` for the active range.
- Show inline next to the existing "Last 24 hours" subtitle, e.g. `Last 24 hours · avg 134 bpm` (round to type-appropriate precision: integer for HR/SpO₂/breathing, 1 decimal for temp).
- Add `min · max` as a small secondary line under the average.
- For SpO₂, also show "% time in range" since average hides desats.
- Skip averages on the fluids bar chart (it's a daily sum, not a trend).

## 3. Age-adjusted normal ranges + out-of-range highlighting

Replace the static `VITAL_RANGES` constant with a function `getVitalRanges(ageMonths)` that returns ranges based on the child's age (derived from `children.date_of_birth`):

```text
Age band         HR (bpm)   Breathing (/min)   SpO₂   Temp (°C)
0–3 mo           100–160     30–60             94–100  36.0–37.5
3–12 mo           90–150     24–40             94–100  36.0–37.5
1–3 yr            80–140     20–30             94–100  36.0–37.5
3–6 yr            75–130     18–25             94–100  36.0–37.5
6–12 yr           70–120     16–22             94–100  36.0–37.5
12+ yr            60–110     12–20             94–100  36.0–37.5
```

Behaviour:
- `vitalStatus(type, value, ageMonths)` uses the age-band ranges.
- `TrendCard` `ReferenceArea` uses the same age-band range.
- Add an "Abnormal readings" badge on each `TrendCard` and overview tile: count of points in the active range that fall outside the band (e.g. "3 out of range"). Clicking the badge scrolls to history filtered to that type (history filter is light — just a chip; full filter UX is out of scope).
- Reference ranges are informational; copy makes that clear via a small `(?)` tooltip on the range chip.

Out of scope for this iteration: per-child custom range overrides (UI to edit ranges). Can be added later if needed.

## 4. Last-reading freshness indicator

- On each overview tile, replace the small time label with a "X min ago / X h ago" relative string (live, recomputed every 60s via a tiny `useNow()` hook).
- When the gap exceeds a per-type stale threshold (HR 6h, SpO₂ 6h, breathing 6h, temp 12h, fluids: skip), the tile gets a soft warning border + a "Due for check" tag. No push notification in this iteration — purely visual.
- Add the same relative timestamp under the big number inside each `TrendCard` header.

## 5. Quick compare (today / yesterday / 7-day average)

- New small `<QuickCompareCard />` rendered above the trend chart grid, one row of three stats per metric (HR, SpO₂, temp, breathing).
- Columns: **Today avg**, **Yesterday avg**, **7-day avg**, with arrow indicator vs 7-day baseline (`▲` if today > 7d avg by > 5%, `▼` if lower, `–` otherwise; color follows abnormal-range status, not direction).
- Hidden on `30d` range — only meaningful on shorter views; the user can still scroll trend charts.
- Pull data from a single `useVitals(familyId, { sinceHours: 24*7 })` call (reuse query, no extra round trips).

## Technical details

Files changed:
- `src/lib/data/vitals.ts` — add `breathing` range, add `getVitalRanges(ageMonths)`, update `vitalStatus` signature, add helper `ageMonthsFromDob(dob)`.
- `src/routes/_authenticated/vitals.tsx` — add `breathing` to overview + trend grids; extend `TrendCard` with avg/min/max + abnormal count; add `QuickCompareCard`; add freshness logic + `useNow` hook.
- `src/lib/i18n/en.ts` + `src/lib/i18n/sv.ts` — new keys: `vitals.breathing`, `vitals.avg`, `vitals.minMax`, `vitals.timeInRange`, `vitals.abnormalCount`, `vitals.dueForCheck`, `vitals.relMinutes`, `vitals.relHours`, `vitals.relDays`, `vitals.compareTitle`, `vitals.today`, `vitals.yesterday`, `vitals.sevenDayAvg`, `vitals.rangeInfoTooltip`.

Data: no DB schema or RLS changes. No new server functions. Pure client-side aggregation over existing `useVitals` results.

Out of scope (will revisit later per your earlier instructions):
- Inline context per reading (oxygen flow, asleep/awake) — needs schema change.
- Correlations (SpO₂ vs O₂ flow).
- Export / printable doctor summary.
- Push reminders for stale readings.
- Per-child editable ranges UI.

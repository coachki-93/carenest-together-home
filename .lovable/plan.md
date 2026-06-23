## Trends & Insights — implementation plan

A new `/insights` page that turns existing oxygen, vitals, care-place check, and medication data into weekly/monthly views the team and doctors can act on.

---

### Scope

- New top-level authenticated route `/insights` with a sidebar entry.
- Range picker: **7 days** (default), **30 days**, **90 days**.
- Five sections, in this order, each scoped to the active child via `useActiveProfile` / family context already in the app:
  1. **Oxygen usage** — daily L/min hours + tanks replaced (line + small stat).
  2. **Vitals trends** — small-multiples line charts per metric (SpO₂, heart rate, temperature, respiration). Each chart shows min/avg/max per day.
  3. **Care-place check reliability** — stacked bar per day: done / late / missed.
  4. **Medication adherence** — line of % scheduled doses logged on time per day.
  5. **Missed-check heatmap** — 7×24 grid (day-of-week × hour) coloured by miss density across the range.
- Empty states per section ("Not enough data yet").
- Bilingual: all new strings in both `en.ts` and `sv.ts`.
- `<LanguageToggle />` in the page header per project rule.

Out of scope for this slice: PDF export, doctor share link, incident overlay (depends on #2 which is dropped), push notifications. Can come later if useful.

---

### Data flow

One server function powers the whole page:

```
getInsights({ range: '7d' | '30d' | '90d' })
  → { oxygen, vitals, carePlace, medications, missedHeatmap }
```

- File: `src/lib/data/insights.functions.ts`.
- Uses `createServerFn({ method: 'GET' })` + `.middleware([requireSupabaseAuth])` so RLS scopes everything to the caller's family automatically.
- Reads the active child id from input (validated with Zod), defaults to the family's primary child.
- Aggregates server-side (a few `select` queries + JS bucketing by day/hour) so the client gets ~5 small arrays, not raw rows.
- Returns plain DTOs only.

Route shape (per project canonical pattern):

```
src/routes/_authenticated/insights.tsx
  loader: ensureQueryData(insightsQueryOptions(range, childId))
  component: useSuspenseQuery(...)
```

`range` lives in URL search params via `validateSearch` so it's bookmarkable and survives reload. `loaderDeps` includes range + childId so changing either refetches.

### Aggregation per section (using existing tables)

- **Oxygen** — `oxygen_tanks` rows whose `start_at` overlaps the range. For each day, sum effective minutes (`end_at|now − start_at − paused_seconds`) × L/min. Count tanks where `replaced_at` falls in the day. No schema change.
- **Vitals** — `vitals` rows in the range. Group by `recorded_at::date` and metric type; compute min/avg/max per (day, metric).
- **Care-place reliability** — join `care_place_check_times` (scheduled) with `care_place_checks` (done) and `care_place_missed_checks` (missed). Per day: done count, late count (done > scheduled + grace), missed count.
- **Medication adherence** — for each `medications` row with a schedule in range, count expected doses vs `med_dose_events` / `med_logs` where `taken_at` ≤ scheduled + window. Per day: `% on_time`.
- **Heatmap** — `care_place_missed_checks` in range, bucketed by `extract(dow)` × `extract(hour)`.

### UI

- `recharts` (add via `bun add recharts` if not present). All charts use semantic tokens from `src/styles.css`, no hardcoded colors.
- Layout: page header (title, range picker, child switcher already global), then a `card-soft` per section using the same shell the rest of the app uses.
- Each section is a small `Insights*Section.tsx` component under `src/components/carenest/insights/` — keeps the route file thin.
- Loading: route `pendingComponent` shows skeleton cards. Errors: route `errorComponent` with retry that calls `router.invalidate()`.
- Mobile-first; charts use `ResponsiveContainer`.

### Navigation

- Add an entry to `AppSidebar` between Today and Schedule.
- Add `t('insights.*')` keys for: page title, range labels (7d/30d/90d), section titles, empty states, metric names.

### Build order (single slice)

1. Add `recharts` if missing.
2. Write `getInsights` server fn + Zod validator + tests via the dev server preview.
3. Add i18n keys to `en.ts` + `sv.ts`.
4. Create the route + section components.
5. Add sidebar entry.
6. Verify with real data on `/insights?range=7d`, then 30d/90d.

No schema changes, no RLS work, no new tables. After this lands and you've used it for a bit, ping me and we'll restart on **Hospital mode = full context** (#3).

# Handover readability: three fixes

## 1. Vitals cluster window 3 → 10 min
`src/lib/data/handover-prefill.ts`
```diff
-export const VITAL_CLUSTER_WINDOW_MS = 3 * 60 * 1000;
+export const VITAL_CLUSTER_WINDOW_MS = 10 * 60 * 1000;
```
Clustering still measures from the first reading of each cluster, so distinct episodes stay apart.

Tests (`handover-prefill.test.ts`): existing 4-min-apart "new cluster" case becomes 15-min apart; add a case proving ~8 min apart merges into one cluster. The explicit-windowMs test keeps its own window value.

## 2. Shorter abnormal-vitals line
```diff
-`• ${t} ${labels.vitalAbnormal}: ${cluster.map((r) => r.text).join(", ")}`
+`• ${t} — ${cluster.map((r) => r.text).join(", ")}`
```
`vitalAbnormal` is used nowhere else, so the key is removed from `en.ts`, `sv.ts`, the `Labels` interface, and the `handover.tsx` wiring.

## 3. Neutral label for legacy oxygen rows
New key `oxygenLegacyChange` — en "Oxygen: change", sv "Syrgas: ändring".
Only the legacy `change_reason === null` + `replaced_at` branch changes:
```diff
-text: `• ${fmtTime(replacedAt)} ${labels.oxygenReplaced} — ${tankLabel}`,
+text: `• ${fmtTime(replacedAt)} ${labels.oxygenLegacyChange} — ${tankLabel}`,
```
Stamped `start` / `flow_change` / `tank_swap` lines unchanged. Two existing legacy tests update their expected string.

## Files
- `src/lib/data/handover-prefill.ts`
- `src/lib/data/handover-prefill.test.ts`
- `src/routes/_authenticated/handover.tsx`
- `src/lib/i18n/en.ts`, `src/lib/i18n/sv.ts`

## Verify
vitest run, en/sv parity, `tsgo --noEmit`.

## Tweaks to Care Place Control checklist

Scope: UI/UX only on the caregiver-facing checklist dialog (`CarePlaceCheckBanner.tsx`). No DB schema changes — existing `value_bool` and `value_count` columns cover both flows. Inventory page is out of scope for this round.

### 1. Yes/No items — explicit buttons

Today the answer renders as a single checkbox. Replace with two clearly labeled buttons (segmented control / radio group):

```
[ Ja ]   [ Nej ]
```

- Required: caregiver must pick one before submit.
- Stored in `value_bool` exactly as today.
- Swedish: Ja / Nej. English: Yes / No (i18n keys `carePlace.yes`, `carePlace.no`).

### 2. Count items — two-step flow

For an item like "Kompresslådor":

1. First show "Finns tillgängligt?" with `[ Ja ] [ Nej ]`.
2. If **Ja** → reveal a numeric input "Antal" (with the min-count warning as today). Saved to `value_count` as the entered number. `value_bool = true`.
3. If **Nej** → hide the numeric input, treat count as `0`. `value_bool = false`, `value_count = 0`.

This `value_bool` on count items is what the future Inventory page will read to decrement stock by 1 when the answer is **Nej**. We are only preparing the data shape now — no inventory writes yet.

Required: caregiver must pick Ja/Nej; if Ja, must enter a number.

### 3. i18n

Add to `src/lib/i18n/en.ts` and `sv.ts` under `carePlace`:
- `yes` / `no`
- `available` ("Available?" / "Finns tillgängligt?")
- `quantity` ("Quantity" / "Antal")
- `pickAnswer` validation message

### Files

- `src/components/carenest/CarePlaceCheckBanner.tsx` — rewrite `ItemRow` to use a Yes/No `RadioGroup` (or two Buttons) and the conditional quantity input; tighten submit validation.
- `src/lib/i18n/en.ts`, `src/lib/i18n/sv.ts` — new keys.

### Out of scope (next round)

Inventory page: owner-managed supplies list, link each checklist count-item to a supply, decrement supply by 1 when a Nej answer is submitted, surface low-stock warnings.

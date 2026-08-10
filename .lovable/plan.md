# Fix: handover mislabels oxygen flow changes as tank swaps

## Finding first: is `useReplaceTank` a flow change or a real swap?

**It is a real tank swap.** Evidence from `src/routes/_authenticated/oxygen.tsx`:

- `ReplaceTankDialog` is opened by the button labelled `oxygen.replaceTank` ("Byt tub" / "Replace tank"), next to a separate `oxygen.changeFlow` button.
- Its dialog title/body are `oxygen.replaceTitle` / `oxygen.replaceBody` — "Byt tub" / "Markera den här tuben som tom och starta en ny." (not `changeFlowTitle`, as suspected in the report).
- Behaviour matches a swap: it closes the current row and starts a fresh tank at 100% from `now`, with no carry-over of remaining volume. `useChangeFlow` is the one that back-dates `started_at` to carry the remaining percentage.
- It exposes a flow field only so the caregiver can confirm/adjust the regulator setting on the new tank; it defaults to the current flow.

So: `useReplaceTank` → `'tank_swap'`. No misleading naming to comment on — the name is correct.

## Part 1 — Migration

```sql
ALTER TABLE public.oxygen_tanks
  ADD COLUMN change_reason TEXT;

ALTER TABLE public.oxygen_tanks
  ADD CONSTRAINT oxygen_tanks_change_reason_check
  CHECK (change_reason IS NULL OR change_reason IN ('start','flow_change','tank_swap'));
```

Nullable, no default, no RLS changes (existing policies are row-level and cover new columns).

## Part 1b — Stamp at source (`src/lib/data/oxygen.ts`)

| Mutation | insert stamp |
| --- | --- |
| `useStartTank` | `change_reason: 'start'` |
| `useReplaceTank` | `change_reason: 'tank_swap'` |
| `useChangeFlow` | `change_reason: 'flow_change'` |

## Part 2 — Handover labelling (`src/lib/data/handover-prefill.ts`)

Rewrite the oxygen block to key off the **new row's** `change_reason` (the row whose `started_at` falls in the shift):

- `start` → `• {time} {oxygenStarted} — {tank} @ {flow}` (unchanged)
- `tank_swap` → `• {time} {oxygenReplaced} — {tank}` (individual; real swaps only)
- `flow_change` → collected:
  - exactly 1: `• {time} {oxygenFlowChanged} {flow}` — "Syrgasflöde ändrat till 0,05 l/min" (no "×1")
  - 2 or more: one line `• {oxygenFlowChangedMany}` — "Syrgasflöde: nu 0,10 l/min (ändrat 4× under passet, senast 14:20)"
- `null` (legacy) → current behaviour preserved: started line, plus the `replaced_at` line for rows closed in-window.

Legacy `replaced_at` lines are suppressed when a stamped row starts within 60s of that `replaced_at` (the successor row already describes what happened), so the transition period doesn't double-report.

Extracted as a pure `summarizeOxygenEvents(...)` helper so it can be unit-tested next to the existing handover tests.

## i18n (en + sv, parity)

- `oxygenFlowChanged`: "Oxygen flow changed to" / "Syrgasflöde ändrat till"
- `oxygenFlowChangedMany`: "Oxygen flow: now {{flow}} (changed {{count}}× during the shift, last at {{time}})" / "Syrgasflöde: nu {{flow}} (ändrat {{count}}× under passet, senast {{time}})"

## Verification

- Migration applies clean; `change_reason` present and constrained.
- Unit tests: 4 flow changes → one summary line; 1 flow change → plain line, no "×1"; real swap → own line; legacy null rows → old behaviour, no crash.
- en/sv key parity; `tsgo --noEmit` clean; full vitest run.

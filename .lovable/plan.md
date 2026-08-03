# Fix: portal cancels signalled via `cancel_at`, not `cancel_at_period_end`

## Problem

Stripe now marks a portal cancellation with `cancel_at` (future timestamp) +
`canceled_at`, leaving `cancel_at_period_end: false`. Our webhook reads only the
boolean, writes `false`, and the app renders plain "Active".

## Schema question — answered: no migration needed

Ground truth for Laila's sub `sub_1U0QqT…`:

```text
cancel_at            = 1788461031 = 2026-09-03 18:43:51 UTC
current_period_end   =              2026-09-03 18:43:51 UTC   (row in DB)
```

They are identical, so `state.endsAt` (derived from `current_period_end`)
already displays the correct cancel date. No new column, no migration.

## Change

One file: `src/routes/api/public/hooks/stripe.ts`. Two update payloads only.

```text
  // checkout.session.completed (~line 114)
- cancel_at_period_end: sub.cancel_at_period_end,
+ cancel_at_period_end: sub.cancel_at_period_end === true || sub.cancel_at != null,

  // customer.subscription.created/.updated/.deleted (~line 150)
- cancel_at_period_end: sub.cancel_at_period_end,
+ cancel_at_period_end: sub.cancel_at_period_end === true || sub.cancel_at != null,
```

Untouched: signature verification, idempotency ledger, family-resolution
fallback, plan-overwrite guard, `invoice.payment_failed`.

## Verification

- `tsgo --noEmit` clean.
- Re-cancel (or replay the event) → Laila's row shows
  `cancel_at_period_end: true`; Subscription page renders
  "Cancels on 3 September 2026".
- A non-cancelled sub has `cancel_at: null` and `cancel_at_period_end: false`,
  so the expression stays `false` and the page still shows plain "Active".

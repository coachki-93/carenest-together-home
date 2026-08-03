# Fix: portal-initiated subscription webhooks never update the row

## Problem

`customer.subscription.updated` / `.deleted` events triggered from the Stripe
billing portal arrive with empty subscription metadata. The handler resolves
the family only through `sub.metadata?.family_id`, so `familyId` is `null`, the
update block is skipped entirely, and the request falls through to `200` with
no database write and no log line. That matches what Stripe shows: two events
delivered 200, row untouched.

## Change

One file: `src/routes/api/public/hooks/stripe.ts`, only the
`customer.subscription.created / .updated / .deleted` case.

1. Keep `sub.metadata?.family_id` as the primary lookup.
2. When it is missing, fall back to selecting `family_id` from
   `family_subscriptions` where `stripe_subscription_id = sub.id`.
3. Plan is only overwritten when subscription metadata actually carries one, so
   the fallback path does not clobber `founding` with a default.
4. If the family is still unresolved, log an error including the Stripe event id
   and subscription id instead of returning a silent 200.

Untouched: signature verification, the idempotency ledger, the
`checkout.session.completed` path, `invoice.payment_failed`.

## Diff (conceptual)

```text
case "customer.subscription.updated": {
  const sub = event.data.object;
- const familyId = sub.metadata?.family_id ?? null;
+ let familyId = sub.metadata?.family_id ?? null;
+ if (!familyId) {
+   const { data } = await supabaseAdmin
+     .from("family_subscriptions")
+     .select("family_id")
+     .eq("stripe_subscription_id", sub.id)
+     .maybeSingle();
+   familyId = data?.family_id ?? null;
+ }
  if (familyId) {
-   const plan = sub.metadata?.plan === "standard" ? "standard" : "founding";
    const update: SubUpdate = {
      stripe_subscription_id: sub.id,
      status: mapStripeStatus(sub.status),
-     plan,
      current_period_end: subscriptionPeriodEndIso(sub),
      cancel_at_period_end: sub.cancel_at_period_end,
    };
+   if (sub.metadata?.plan) update.plan = sub.metadata.plan === "standard" ? "standard" : "founding";
    ...
+ } else {
+   console.error("[stripe webhook] unresolved family", event.id, sub.id);
  }
}
```

## Verification

- `tsgo --noEmit` clean.
- Re-cancel via the portal: the row should become `status: active`,
  `cancel_at_period_end: true`, `updated_at` refreshed; the Subscription page
  should render "Cancels on [date]".
- Re-subscribe still activates through `checkout.session.completed` (unchanged
  code path).

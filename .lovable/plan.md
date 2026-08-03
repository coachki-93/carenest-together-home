# Fix: trialing family without a Stripe customer sees "Manage subscription"

## Cause

Both billing surfaces branch on `isActive`, which is intentionally true during a
trial. A trial family has no `stripe_customer_id` yet, so the Portal call throws
"No Stripe customer for this family yet". The gate should be customer existence.

`stripe_customer_id` is already selected by `getFamilySubscription`, so no data
change is needed.

## Changes

### src/components/carenest/BillingCard.tsx

```diff
+  const hasCustomer = !!s?.row?.stripe_customer_id;
...
-            {s?.isActive ? (
+            {hasCustomer ? (
               <Button onClick={() => openPortal.mutate()} ...>
```

### src/components/carenest/SubscriptionBanner.tsx

```diff
-          {sub.data?.isActive && !sub.data?.isCanceled
+          {sub.data?.row?.stripe_customer_id
             ? t("billing.banner.manage")
             : t("billing.banner.subscribe")}
```

Banner visibility logic (line 26) stays untouched. Note: the banner button
navigates to `/billing`, it never calls Portal directly — the label is the only
thing corrected there.

### src/lib/billing/billing.functions.ts (createPortalSession)

Keep the throw (server must stay authoritative) but make the message
actionable rather than internal-sounding:

```diff
-      throw new Error("No Stripe customer for this family yet");
+      throw new Error(
+        "This family doesn't have a payment account yet — start a subscription first.",
+      );
```

## Why Portal can no longer be called without a customer

`createPortalSession` is invoked from exactly one place: `openPortal.mutate()` in
`BillingCard`, inside the branch now guarded by `hasCustomer`. The banner only
navigates. So the throw becomes unreachable from the UI and remains a
defense-in-depth guard for direct RPC calls.

## Verification

- Trial family (no customer): card and banner both read "Subscribe"; Subscribe
  opens Stripe Checkout, which creates the customer.
- After subscribing: `stripe_customer_id` present → both read "Manage"; Portal opens.
- `tsgo --noEmit` clean; screenshot of the trial-state billing page.

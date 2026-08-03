# Fix: admin coupons show "—%" / "once"

## Actual root cause (differs from the reported one)

`toCouponDTO(promo, couponOverride?)` already prefers `couponOverride` and already
falls back to `promo.promotion.coupon` (the list call does expand
`data.promotion.coupon`, so the list data is fine).

The real bug is the call site on line 217:

```ts
const coupons = list.data.map(toCouponDTO);
```

`Array.prototype.map` passes `(item, index, array)`, so `couponOverride` receives
the **array index**. For the first row that's `0`; `0 ?? x` is `0` (not nullish),
so `rawCoupon = 0`, `coupon = {}` → `percentOff: null` → `"—%"` and
`duration: "once"`. Every row after index 0 gets a number too, same result.
So *all* rows in the list render "—%" / "once", regardless of what Stripe holds.

## Changes (src/lib/data/billing-admin.functions.ts only)

```diff
-  const rawCoupon =
-    couponOverride ??
-    (promo.promotion && typeof promo.promotion === "object"
-      ? promo.promotion.coupon
-      : promo.coupon);
+  // Only trust couponOverride when it is a real object — guards against
+  // accidental positional args (e.g. Array#map's index).
+  const rawCoupon =
+    couponOverride && typeof couponOverride === "object"
+      ? couponOverride
+      : promo.promotion && typeof promo.promotion === "object"
+        ? promo.promotion.coupon
+        : promo.coupon;
```

```diff
-    const coupons = list.data.map(toCouponDTO);
+    const coupons = list.data.map((promo) => toCouponDTO(promo));
```

No other file changes. Create and deactivate paths already pass a full coupon
object and keep working unchanged.

## Verification

- `tsgo --noEmit` clean.
- Create 100% / forever → list shows `100%` + Forever/Alltid.
- Create 25% / repeating 3 months → list shows `25%` + 3-month duration.
- Cross-check the two coupons in Stripe.

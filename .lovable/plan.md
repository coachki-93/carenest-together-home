# Cancel-scheduled subscription banner

Fix: a subscription that is active but scheduled to cancel currently hits the red read-only "Lock" banner, even though the family keeps full access until the cancel date.

## 1. `src/components/carenest/SubscriptionBanner.tsx`

- Visibility guard stays: hide only for healthy active, non-trial, non-past-due, non-cancelled subs.
- New branch between trial and past-due:

```diff
     if (s.isActive && !s.isTrial && !s.isPastDue && !s.isCanceled) return null;
     if (s.isTrial) { ...unchanged... }
+    if (s.isActive && s.isCanceled) {
+      return {
+        tone: "info" as const,          // amber, not the red warn tone
+        icon: Clock,
+        cta: "resubscribe" as const,
+        message: t("billing.banner.cancelScheduled", {
+          date: s.endsAt ? dateFmt.format(s.endsAt) : "",
+        }),
+      };
+    }
     if (s.isPastDue) { ...unchanged... }
     return { tone: "warn", icon: Lock, message: t("billing.banner.readOnly") };
```

- The final read-only branch is now only reachable when `!s.isActive` (all active paths return above), so a cancel-scheduled family never gets read-only treatment.
- Date formatting matches BillingCard: `Intl.DateTimeFormat(i18n.language?.startsWith("sv") ? "sv-SE" : "en-GB", { day: "numeric", month: "long", year: "numeric" })` → "3 September 2026".
- Owner CTA: in the cancel-scheduled state the button reads `billing.banner.resubscribe` ("Resubscribe" / "Teckna igen"); other states keep the existing Manage/Subscribe logic. `Lock` import stays (still used by the read-only branch).

## 2. i18n (`src/lib/i18n/en.ts` + `sv.ts`, identical key order)

```diff
       pastDue: "..."
+      cancelScheduled: "Subscription cancelled — active until {{date}}. Resubscribe to keep access.",
-      readOnly: "Read-only. Your data is safe — subscribe to log again.",
+      readOnly: "Read-only. Your data is safe — subscribe to use the app again.",
       manage: "Manage billing",
       subscribe: "Subscribe",
+      resubscribe: "Resubscribe",
```

Swedish:
```diff
+      cancelScheduled: "Abonnemang uppsagt — aktivt till {{date}}. Teckna igen för att behålla åtkomst.",
-      readOnly: "Endast läsning. Er data är kvar — teckna abonnemang för att logga igen.",
+      readOnly: "Endast läsning. Er data är kvar — teckna abonnemang för att använda systemet igen.",
+      resubscribe: "Teckna igen",
```

No change to `deriveState` (`isReadOnly` is already false when `isActive`), billing server functions, or the Stripe webhook.

## Verification

- Cancel-scheduled family (Laila's): amber banner with "active until 3 September 2026" + Resubscribe CTA, no read-only.
- Lapsed family: red read-only banner with the new copy.
- Healthy active: no banner. Trial: unchanged.
- en/sv key parity; `tsgo --noEmit` clean.

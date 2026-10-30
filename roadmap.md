# Roadmap

## Open
- [ ] Stripe end-to-end subscription activation/webhook: blocked because Stripe rejects existing lifetime 100% coupon; no subscription submitted. Row correction, live customer creation, portal, forced translated error, shared derived-state guard, tests verified.
- [ ] Marketing: 100-paying-families plan presented (plan.md saved 2026-10-30); awaiting user's choice of first action (recommendation card: discoverability fix).

## Done
- Billing buttons now follow derived live-subscription state, with a secondary history link; founding/standard card prices match live Stripe prices. Full suite: 241 tests; en/sv parity: 3196 keys; preview build clean. Owner card/checkout verified. Coupon unchanged: BILALFREE100 exists live; Stripe rejects with payment_pages_promotion_code_invalid, “This promotion code is invalid.”
- CareNest → Tillsa rename, brand assets, billing fixes, legal/support pages, bug reports, guidebook, checklists, guided routines, recurrence timezone fix, appointment permissions, override upsert index, oxygen safety stages 1–3, oxygen pause feature, Planner occurrence day-lock, copy alignment, 15s ad video.

# Roadmap

## Open
- [ ] Typing a promotion code on Stripe's checkout page returns "This code is invalid" even for valid codes (applied via API works). Needs a look at Stripe checkout/promo settings.
- [ ] Marketing: 100-paying-families plan presented (plan.md saved 2026-10-30); awaiting user's choice of first action (recommendation card: discoverability fix).

## Done
- Demo family comped via single-use 100% code (webhook → active); free checkouts no longer ask for a card; locale decimals on Today/Vitals/Oxygen; translated med route on Today; per-language landing screenshots.
- Billing buttons now follow derived live-subscription state, with a secondary history link; founding/standard card prices match live Stripe prices. Full suite: 241 tests; en/sv parity: 3196 keys; preview build clean. Owner card/checkout verified. Coupon unchanged: BILALFREE100 exists live; Stripe rejects with payment_pages_promotion_code_invalid, “This promotion code is invalid.”
- CareNest → Tillsa rename, brand assets, billing fixes, legal/support pages, bug reports, guidebook, checklists, guided routines, recurrence timezone fix, appointment permissions, override upsert index, oxygen safety stages 1–3, oxygen pause feature, Planner occurrence day-lock, copy alignment, 15s ad video.

- [ ] Verify manual typed-code test with TILLSATEST145F40 (waiting on Kim), then confirm subscription active and deactivate the code.

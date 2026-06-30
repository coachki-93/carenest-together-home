## Goal
Keep the current centered-editorial design, but (a) remove or soften the few claims that aren't quite true today, and (b) raise the persuasive power with real screenshots, a clearer opening line, and a small amount of social proof.

## 1. Truthfulness fixes (i18n only, no design change)
- `marketing.day.s4Body`: drop "Quiet hours" — rewrite as *"A calm overview for tomorrow, and low-oxygen warnings if a tank is running close."*
- `marketing.tablet.body`: remove "dark-mode friendly" (we don't ship a tuned dark mode).
- `features.vitals.b1`: confirm 24h / 7d / 30d windows + shaded range all exist. If only some do, soften to *"Charts with the healthy range shaded."*
- `marketing.faq.q4A` (pricing): add a real contact path — either a `mailto:` link in the answer or a small "Contact" link in the footer — so "reach out" isn't a dead end.
- Render the existing `marketing.hero.trust` line ("Built with families of medically complex children") under the hero sub-paragraph as a small muted line — the string is already translated, just unused.

## 2. Pitch upgrades
- **Sharper hero subhead.** Add a one-line plain-English descriptor above or below the poetic H1 so scanners get it instantly. Suggested: *"The shared home base for your child's care team — meds, vitals, oxygen, handovers."*
- **Real screenshots.** Replace the abstract `HeroPreview` mock with 2–3 real screenshots:
  1. Today page (with one task highlighted)
  2. Vitals page with a chart + shaded range
  3. Emergency screen
  Captured headlessly via Playwright against a seeded demo family, saved to `src/assets/marketing/*.png`, used as `<img>` in the hero and in the *What's inside* section.
- **One quote block** between "A day with CareNest" and "What's inside" — a single short testimonial (parent or nurse). If we don't have a real one yet, leave the slot but mark it as a placeholder we'll fill in, *not* a fabricated quote.
- **Secondary CTA in the hero**: add a "See a day with CareNest" ghost button that anchor-scrolls to the `#day` section, alongside the existing Create / Invite buttons.
- **Caregiver callout.** Add a small two-line band in the *Who it's for* section addressed to nurses / PAs / agencies: *"On rotating shifts? CareNest gives every caregiver the same shared picture, with handover notes already written."*

## 3. Out of scope (call out explicitly)
- No new product features. No changes to authenticated app screens. No font/color/layout overhaul — the editorial design stays.
- No fabricated testimonials, logos, or metrics.

## Files likely touched
- `src/lib/i18n/en.ts`, `src/lib/i18n/sv.ts` — copy edits + new keys (subhead, caregiver callout, secondary CTA, optional quote slot)
- `src/routes/index.tsx` — render trust line, add subhead + secondary CTA, swap `HeroPreview` for screenshot, add quote slot + caregiver band
- `src/assets/marketing/*.png` — new screenshots (captured via Playwright)
- `src/components/carenest/MarketingFooter.tsx` — add Contact link if we go that route for FAQ q4

## Open questions before I build
1. Do you want me to capture **real screenshots** now (I can drive the app with Playwright against your data), or keep the stylized mock for v1?
2. Do you have a **real quote** from a parent or caregiver I can include, or should I leave the spot out entirely until you do?
3. For pricing FAQ — add a **mailto contact** (which address?) or remove the question for now?

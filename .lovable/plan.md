# Brand rename: CareNest → Tillsa (visible text only)

Text-only pass. No identifiers, storage keys, filenames, paths, or domains change.

## Files to edit

**Translations (bulk, both languages)**
- `src/lib/i18n/en.ts` — 66 occurrences → Tillsa
- `src/lib/i18n/sv.ts` — 67 occurrences → Tillsa, with Swedish grammar preserved (`CareNests` → `Tillsas`, `CareNest-konto` → `Tillsa-konto`, `CareNest:s` → `Tillsas`)

**Static assets / worker**
- `public/manifest.webmanifest` — `name`, `short_name`
- `public/push-sw.js` — header comment, push title fallback (2 spots)

**Components**
- `src/components/carenest/Logo.tsx` — `alt`, 2 comments
- `src/components/carenest/MarketingHeader.tsx` — `aria-label`, `alt`, 1 comment
- `src/components/carenest/MarketingFooter.tsx` — `alt`, copyright line

**Route head() metadata + visible copy** (page titles, descriptions, og/twitter titles)
- `src/routes/__root.tsx` (title, description, author, og/twitter titles, apple-mobile-web-app-title)
- `src/routes/index.tsx`, `about.tsx`, `features.tsx`, `install.tsx`, `offline.tsx`
- `src/routes/invite.index.tsx`, `invite.$code.tsx`
- `src/routes/auth.login.tsx`, `auth.signup.tsx`, `auth.forgot-password.tsx`, `auth.reset-password.tsx`
- `src/routes/_authenticated/`: dashboard, home, settings, child, vitals, oxygen, medications, schedule, shifts, handover, appointments, maintenance, inventory, instructions, emergency, caregivers, events, billing, admin, onboarding.child, onboarding.caregiver

**Other user-visible strings**
- `src/lib/push/use-push-subscription.ts` — iOS "add CareNest to your Home Screen" hint
- `src/routes/api/public/hooks/dispatch-task-notifications.ts` — 4 push-title fallbacks `"CareNest"` → `"Tillsa"`
- `src/styles.css` — 2 design-system comments (cosmetic)

## Explicitly untouched

- `team.carenest.local` and its comment in `team-account.functions.ts`
- `carenest_lang`, `carenest:lang`, `carenest:pending_invite`, `carenest.tour.*`, `carenest.active-profile.*`, `carenest.handover-skipped.*`, `carenest.resume.dismissed.*`
- `https://carenest-together-home.lovable.app` URLs (separate pass)
- all filenames/paths: `src/assets/carenest-*`, `src/components/carenest/`, `/landing/carenest-*.png|webp`, `/carenest-logo-nav-white.png`

## Occurrences I want your call on (not changing unless you say so)

1. `hello@carenest.app` (about.tsx, MarketingFooter.tsx) and `mailto:admin@carenest.app` VAPID fallbacks (5 files) — these are email addresses on a real domain, not brand text. Leaving as-is.
2. `"CareNest Connect is a web app…"` in `__root.tsx` twitter:description — reads like a stale product name; I'd render it "Tillsa is a web app…". Say if you'd rather keep "Connect".
3. `alt="CareNest"` on the wordmark images — the image files still show the old wordmark art. Alt text will say Tillsa while the artwork says CareNest until new art is supplied.
4. `src/styles.css` comments — comments only, zero visible effect; included for consistency.

## Verification

1. `grep -ri carenest src/lib/i18n/` → zero
2. Manual check: push title, manifest, admin console header, marketing hero
3. en/sv key parity unchanged (no keys added/removed; sv `storyLede` asymmetry left alone)
4. `tsgo --noEmit` clean

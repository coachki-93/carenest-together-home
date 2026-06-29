## Step 1 — New public landing page

Goal: replace the current short `/` splash with a richer, family-first landing page that actually explains CareNest, plus a dedicated `/features` deep-dive route. Keep the warm/lavender + Nunito look; just go deeper.

### Routes & files
- Rewrite `src/routes/index.tsx` as a long single-page marketing landing (anchors only for in-page scroll).
- New `src/routes/features.tsx` — deep-dive feature reference, linked from the landing's "See all features" CTA.
- Header/footer extracted to `src/components/carenest/MarketingHeader.tsx` and `MarketingFooter.tsx` so `/` and `/features` share them.
- All copy goes through `t()`; add new keys to both `src/lib/i18n/en.ts` and `sv.ts`. `<LanguageToggle />` stays in the header.
- Per-route `head()` metadata (title, description, og:title, og:description, og:url, canonical) on both routes — distinct text for `/features`.

### Landing sections (single scroll at `/`)
1. **Hero** — headline, sub, primary CTA "Create your family", secondary "I have an invite", small trust line ("Built with families of medically complex children").
2. **Who it's for** — short, warm paragraph + 3 chips (Parents · Family members · Caregivers).
3. **A day with CareNest** — 3–4 step narrative (Morning meds → Vitals check → Handover → Quiet evening) with small illustrations/icons.
4. **What's inside** — 6-card grid of the real features that exist today:
   - Today's tasks & schedule (with hospital pause)
   - Vitals tracking + pediatric reference ranges
   - Medications & inhalations
   - Oxygen tank tracking with low-O₂ warnings
   - Handover notes & shift log
   - Emergency info screen
5. **Safety nets** — short section on missed-task alerts, low-oxygen warnings, out-of-range vital streaks.
6. **Built for the tablet on the wall** — note on bilingual (EN/SV), installable to home screen, designed for tired hands.
7. **FAQ** — 5–6 collapsibles (Is my data private? Who can join? Does it replace medical advice? Cost? Offline? Languages?).
8. **Final CTA** — repeat signup + invite buttons.
9. **Footer** — small links (Login, Invite code, Features, Language).

### `/features` page
Same shell, longer-form feature descriptions grouped by area: Today, Vitals, Medications, Oxygen, Schedule, Handover, Safety, Family & roles. Each block: short paragraph + bullet list of capabilities + small visual. No screenshots required for v1 — uses existing icons.

### Visual direction
Keep current palette (`--primary` lavender, `bg-lavender`, `primary-soft`), Nunito, rounded `card-soft`. Add more whitespace, generous section padding, soft gradient backdrops between sections, subtle entrance fades. No new fonts, no new color tokens.

---

## Step 2 — Onboarding refresh

Goal: keep the existing 5-step wizard but update copy/inputs so it reflects current features, and confirm it only runs on first login.

### "Only first time" gate — already in place, just verify
- `src/routes/_authenticated/home.tsx` already routes to `/dashboard` when `profiles.onboarded === true` and skips both `onboarding/child` and `onboarding/caregiver`.
- `onboarding.child.tsx` sets `onboarded: true` on finish (line 305); `onboarding.caregiver.tsx` does the same (line 41).
- Plan: leave the flag mechanism as is. Add a guard inside each onboarding route's `beforeLoad` that redirects to `/dashboard` if `profiles.onboarded` is already true, so the wizard can't be reached by typing the URL after completion.

### Family/child wizard (`onboarding.child.tsx`) — refresh content
- **Step 1 Welcome**: new copy reflecting the broader system (vitals, oxygen, handovers, safety nets), not just meds.
- **Step 2 Child**: add the new fields we've added since the original wizard — birthdate (used by vitals reference ranges) made prominent with a small note "We use this to show age-appropriate vital ranges." Keep existing avatar/name/notes.
- **Step 3 First medication**: keep, but add a one-line hint that inhalations and appointments can also be scheduled later in Schedule.
- **Step 4 Invite caregivers**: keep; clarify roles (owner / caregiver / viewer) in copy.
- **Step 5 All set**: replace generic "you're done" with a short checklist linking into the live app — "Log your first vital", "Add an oxygen tank", "Set up your schedule", "Open Emergency info". Each is a `<Link>` to the relevant route.

### Caregiver wizard (`onboarding.caregiver.tsx`)
- Refresh copy to mention the features they'll actually use (Today, Vitals logging with context chips, Handover, Hospital toggle).
- Confirm the flow still ends by setting `onboarded: true` and routing to `/dashboard`.

### i18n
All new/changed strings added to both `en.ts` and `sv.ts` in the same edit.

### Out of scope (deferred unless you ask)
- No new guided in-app tour (we already have `GuidedTour` for the dashboard).
- No role-specific branching beyond the existing caregiver vs family split.
- No DB schema changes — `profiles.onboarded` is enough.

---

## Order of work
1. Landing: extract marketing header/footer, rewrite `/`, add `/features`, add i18n keys.
2. Onboarding: add `beforeLoad` guards, refresh step copy + add birthdate emphasis on Step 2, rewrite Step 5 as a checklist, refresh caregiver wizard copy, add i18n keys.
3. Manual check via Playwright: visit `/`, `/features`, sign in as a fresh user → wizard → finish → confirm re-visiting `/onboarding/child` redirects to `/dashboard`.
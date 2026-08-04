# Make /support genuinely useful

Troubleshooting accordion, a second FAQ group for existing users, a safety line, and warmer contact framing. Content is grounded in the real code (sources noted below). i18n + page layout only — no behaviour changes, same `/api/public/contact` endpoint.

## File list

**Edited**
- `src/components/carenest/FaqSection.tsx` — make it groupable: new optional props `keys` (default the existing 9), `kicker`, `title`, `heading level`/spacing unchanged. Home keeps calling `<FaqSection />` with no props, so its markup and appearance are byte-identical.
- `src/routes/support.tsx` — reorder to hero → safety note → Troubleshooting → FAQ (Using Tillsa + General) → contact. The two help cards (Guidebook / write to us) fold into the hero area; the troubleshooting accordion replaces them as the main "help" block.
- `src/lib/i18n/en.ts`, `src/lib/i18n/sv.ts` — new keys only, exact parity.

**Not touched**
- `ContactForm.tsx`, `src/routes/api/public/contact.ts`, `src/routes/index.tsx`, `contact.tsx`, `MarketingFooter.tsx`.

## New page order

1. Hero — "How can we help?" + intro.
2. Safety note — a bordered callout directly under the hero: Tillsa is a coordination tool, not medical care or an emergency service; in an emergency call your local emergency number.
3. Troubleshooting — accordion, 4 entries (below).
4. FAQ — `<FaqSection>` twice: "Using Tillsa" group (new keys, `id="support-using"`) then the existing General group (`id="support-faq"`, unchanged copy).
5. Contact — "Didn't find your answer? Contact us and we'll help." + "A real person reads every message — we usually reply within a day or two." + existing `<ContactForm idPrefix="support-contact" />`.

## Troubleshooting entries (`marketing.support.troubleshoot.*`)

1. **Notifications aren't arriving** — enable per device in Settings; open the notification card's diagnostics; on iPhone/iPad push only works when Tillsa is installed to the home screen, not in a Safari tab; if permission was denied the app can't re-ask — re-enable for Tillsa in device/site settings, then press Enable again. (Matches `EnableNotificationsCard.tsx`: per-device subscribe, `<details>` diagnostics, `denied` state, iOS standalone hint.)
2. **No confirmation / password-reset email** — check spam (new sender domain), wait a couple of minutes (queued, not instant), then request again from the login screen. (Matches the queued email pipeline.)
3. **What works offline** — Emergency info is cached on the device and stays readable with no connection; the rest of Tillsa needs a connection to load and save. (Matches `emergency.tsx` localStorage snapshot + offline banner.)
4. **Login / shared team-account trouble** — the owner creates one shared team login in Settings → Team account; it has a username (not an email) and a password shown only once when created or reset. On the login screen switch to the team tab and enter username + password; username is case-insensitive. Lost password → the owner resets it in Settings, which produces a new one. Personal accounts use the email tab and the normal reset link. (Verified in `auth.login.tsx` mode toggle + `lookup_team_email`, and `team-account.functions.ts` create/reset returning the password exactly once.) No `[NEEDS REVIEW]` needed — behaviour confirmed in code.

## "Using Tillsa" FAQ (`marketing.faq.using.*`, 5 Q&As)

- **Add another caregiver** — Care team: invite by link/invitation, or use the shared team account; owner manages members, each person gets a caregiver profile so log entries show the person.
- **If we cancel** — access stays until the paid period ends, then the app becomes read-only; your data is kept, not deleted.
- **Change plan** — one subscription per family, billed monthly; the owner uses Manage to open the billing portal for payment method, invoices and cancelling. Founding rate stays locked. *(Flagged: there is no in-app plan switcher, so the answer says what the portal actually does rather than promising an upgrade/downgrade flow.)*
- **Medication given several times a day** — add one time of day per dose on the medication; each time becomes a daily dose on Today and Schedule. Courses set a first dose and total count.
- **Handover between shifts** — a written note per shift with sleep/mood/seizures/fluids/medicines fields, prefillable from the shift window; others mark it read; the author can edit for two hours, which clears read receipts.

## Conflicts flagged

- **FaqSection is currently hard-coded** to one key list, kicker and title. Grouping needs props; adding them with defaults is the only way to reuse it without forking — home stays untouched.
- **Two FAQ blocks on one page** means two `<h2>` FAQ headings; anchors are distinct (`support-using`, `support-faq`) and `/#faq` on home is unchanged.
- **Help cards removed** from their current standalone section — their content (Guidebook pointer, "write to us") survives in the hero and contact intro rather than being duplicated next to the troubleshooting list.

## Verification

`/support` in en + sv shows safety line, 4 troubleshooting entries, both FAQ groups, warm contact framing; home FAQ screenshot-identical; en/sv parity; `tsgo --noEmit` clean.

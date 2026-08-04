# Support page at /support

Assembles existing pieces (FAQ + contact form + help pointers) by extracting them into shared components first — no duplicated markup or logic.

## File list

**New**
- `src/components/carenest/FaqSection.tsx` — the marketing FAQ, lifted verbatim from `index.tsx` §12 (same i18n keys, same Accordion, same `Kicker`/heading markup). Props: optional `id` (default `"faq"`) and optional `className` so the two hosts can differ in anchor/spacing without forking the markup.
- `src/components/carenest/ContactForm.tsx` — the fields, validation, honeypot, time-trap `startedAt`, POST to `/api/public/contact`, and success/error states, moved verbatim out of `contact.tsx`. Submit logic and security untouched.
- `src/routes/support.tsx` — new route, `about.tsx` as the structural template.

**Edited**
- `src/routes/index.tsx` — replace the inline §12 FAQ block with `<FaqSection />`; drop the Accordion/`Plus` imports if they become unused.
- `src/routes/contact.tsx` — replace the inline form with `<ContactForm />`; page shell, hero and head meta unchanged.
- `src/components/carenest/MarketingFooter.tsx` — add `<FooterLink to="/support">` in the About column, above Contact. Keep `/contact` (direct path).
- `src/lib/i18n/en.ts`, `src/lib/i18n/sv.ts` — new keys only.

## /support composition

`MarketingHeader` → hero → help info → FAQ → contact → `MarketingFooter`.
Head meta mirrors `about.tsx`: `SITE = https://tillsa.app`, canonical + `og:url` `/support`, per-language title/description, `og:image` reuses the existing `/og-image.jpg`.

1. **Hero** — "How can we help?" plus one line: feature how-tos live in the in-app Guidebook; FAQ and contact are below.
2. **Help info** — two honest pointers: (a) already using Tillsa → the Guidebook inside the app explains every feature; (b) account, billing and anything else → the form below, a real person reads it. No phone number, no hours, no SLA.
3. **FAQ** — `<FaqSection id="support-faq" />`.
4. **Contact** — `<ContactForm />` under a short section heading.

## New i18n keys (en + sv, exact parity)

`marketing.footer.support`, and under `marketing.support.*`: `kicker`, `title`, `titleB`, `intro`, `helpKicker`, `helpTitle`, `guidebookTitle`, `guidebookBody`, `contactTitle` (help-info body), `faqTitle`-style section leads as needed, `formKicker`, `formTitle`. Swedish uses "Support" for the footer label as specified.

## Conflicts to flag

- **Duplicate `id="faq"`.** The footer and home nav link to `/#faq`. Rendering `FaqSection` on `/support` with the same id would put two `id="faq"` nodes in the site (one per page — not invalid, but the support copy would also answer to `/support#faq`). Handled by making the id a prop: `/` keeps `id="faq"`, `/support` uses `id="support-faq"`. No existing link changes.
- **Guidebook is behind auth** (`/_authenticated/guidebook`). The support page therefore describes it in words rather than linking to it — a link would bounce logged-out visitors to `/auth`. Say the word if you'd rather link it anyway.
- **Contact page hero copy stays on `/contact`.** `ContactForm` extracts only the card (form + states), not the page hero, so `/contact` keeps its own headline and `/support` gets a section heading instead. Prevents a second `<h1>` on `/support`.

## Verification

`/support` in en + sv shows help info, FAQ and a working form; home FAQ and `/contact` render byte-identically to before (screenshot compare); footer links to `/support`; the endpoint and its honeypot/rate limit are untouched; en/sv key parity; `tsgo --noEmit` clean.

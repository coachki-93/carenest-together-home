# Privacy Policy + Terms of Service pages

## Files

| File | Change |
| --- | --- |
| `src/routes/privacy.tsx` | New. Long-form legal page, `about.tsx` structure (MarketingHeader + Reveal sections + MarketingFooter), `head()` per language, `SITE = "https://tillsa.app"`, canonical `/privacy`. |
| `src/routes/terms.tsx` | New. Same structure, canonical `/terms`. |
| `src/lib/i18n/en.ts` | New `legal.privacy.*` + `legal.terms.*` blocks; `marketing.footer.privacy` / `.terms`; restructured `auth.agreeTerms`. |
| `src/lib/i18n/sv.ts` | Same keys, exact parity, Swedish text from the draft. |
| `src/components/carenest/MarketingFooter.tsx` | Legal links in the About column; `CONTACT_EMAIL` → `support@tillsa.app`. |
| `src/routes/auth.signup.tsx` | Consent checkbox uses `<Trans>` with links to `/terms` and `/privacy` (new tab). |
| `src/routes/about.tsx` | Line 24 `CONTACT_EMAIL` → `support@tillsa.app`. |

No other `@carenest.app` occurrences are user-visible — the remaining ones are
`VAPID_SUBJECT` defaults and a `team.carenest.app` code comment, left untouched.

## Content shape

Each page: title, "Last updated: 2026-08-03" / "Senast uppdaterad: 2026-08-03",
then numbered sections. i18n shape (arrays keep JSX trivial):

```ts
legal: {
  privacy: {
    title: "Privacy Policy",
    updated: "Last updated: 2026-08-03",
    intro: "…",
    sections: [
      { heading: "1. Who we are (Data Controller)", body: ["…", "…"] },
      …
    ],
  },
  terms: { … },
}
```

Bullet lists become separate paragraph strings prefixed with "— " so the body
stays a flat string array. Markdown `**bold**` is dropped (plain prose).

Privacy: 13 sections. Terms: 12 sections. Both en + sv, taken verbatim from the
uploaded drafts.

## Assumption to confirm

The uploaded files are the annotated drafts. The inline `[REVIEW …]`,
`[GRANSKA …]` and `[PLACEHOLDER …]` notes plus the top "DRAFT — NOT YET LEGALLY
REVIEWED" banner are internal editorial notes, so they are **stripped** from the
published pages. Everything else is verbatim. Two placeholders that would leave
gaps in visible text are handled as: the Supabase region is written as "in the
European Union" (no specific region named), and the future email-provider /
contact-form placeholders are simply omitted.

## Signup consent

`auth.agreeTerms` becomes an interpolated string with `<1>`/`<3>` markers:

- en: `"I agree to the <1>Terms</1> and <3>Privacy Policy</3>."`
- sv: `"Jag godkänner <1>villkoren</1> och <3>integritetspolicyn</3>."`

Rendered with `<Trans>` + `<a target="_blank" rel="noopener noreferrer">`, with
`stopPropagation` on the links so clicking them does not toggle the checkbox.

## Verification

`/privacy` and `/terms` render in both languages, footer links present, consent
links open in a new tab, en/sv key parity, `tsgo --noEmit` clean, Playwright
screenshots of `/privacy` and the signup consent area.

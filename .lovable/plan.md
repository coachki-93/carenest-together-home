# Repoint marketing/SEO URLs to live domain

## Goal
Replace the hardcoded preview domain `carenest-together-home.lovable.app` with the live domain `tillsa.app` in Open Graph / canonical / social-preview meta tags only. Functional app URLs that use `window.location.origin` are untouched.

## Files to edit

| File | Line(s) | Change |
|------|---------|--------|
| `src/routes/about.tsx` | 22 | `const SITE = "https://tillsa.app";` |
| `src/routes/features.tsx` | 32 | `const SITE = "https://tillsa.app";` |
| `src/routes/install.tsx` | 26 | `const SITE = "https://tillsa.app";` |
| `src/routes/index.tsx` | 50 | `const SITE = "https://tillsa.app";` |
| `src/routes/__root.tsx` | 143 | `property: "og:image", content: "https://tillsa.app/og/og-default.png"` |
| `src/routes/__root.tsx` | 144 | `name: "twitter:image", content: "https://tillsa.app/og/og-default.png"` |

## What is NOT changed
- Any code using `window.location.origin` (BillingCard checkout, auth redirects, invite links, Stripe callbacks).
- File paths, asset names, storage keys, or identifiers.

## Verification
1. `rg -F "carenest-together-home.lovable.app" src/` returns zero matches.
2. `public/og-image.jpg` and `public/og/og-default.png` exist so the new absolute URLs resolve.
3. `tsgo --noEmit` exits 0.

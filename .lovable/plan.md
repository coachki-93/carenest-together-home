# Declutter the pricing card

## Changes

### 1. `src/routes/index.tsx` — PriceCard (~line 970)
- Remove the `label` prop from the signature and its type, and delete the `<p>` that rendered it.
- Wrap `price` / `thenPrice` / `sub` in a centered block:
  `<div className="w-full text-center flex flex-col items-center mb-6">…</div>`
- Card outer stays `flex flex-col items-start`, so the `ALLT INGÅR` label, `<ul>`, and checkmarks remain left-aligned.
- CTA stays full-width at the bottom.

### 2. `src/routes/index.tsx` — call site (~line 449)
- Drop `label={t("marketing.pricing.label")}`.

### 3. `src/lib/i18n/en.ts` + `sv.ts`
- Remove the now-orphaned `marketing.pricing.label` key from both.
- `price`, `thenPrice`, and `sub2` already match the requested copy in both languages — no text edits needed.
- `marketing.pricing.title` untouched.

## Verification
- `rg "pricing.label"` returns zero.
- en/sv key parity check.
- `tsgo --noEmit` clean.
- Playwright screenshot of the pricing section.

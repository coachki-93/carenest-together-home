# Tillsa brand image swap + horizontal-logo fit

All paths/names stay identical; only file contents change (plus two new maskable icons).

## 1. Direct `public/` replacements (I place these)

| Upload | Destination | Note |
|---|---|---|
| E | `public/icon-192.png` | overwrite |
| F | `public/icon-512.png` | overwrite |
| G | `public/icon-maskable-192.png` | new file |
| H | `public/icon-maskable-512.png` | new file |
| D | `public/favicon.ico` | overwrite |
| A (purple lockup) | `public/carenest-logo-nav.png` | overwrite |
| A (purple lockup) | `public/landing/carenest-wordmark.png` | overwrite |
| B (white lockup) | `public/carenest-logo-nav-white.png` | overwrite |
| J | `public/landing/carenest-app-icon.webp` | PNG→webp via cwebp, name kept |

## 2. CDN assets (`.asset.json` pointers)

All four source images are already in the sandbox upload mount, so I can mint the
pointers myself with the asset CLI — no manual upload needed from you. Existing
pointer files are replaced in place (same filenames, new asset IDs); old CDN
objects are deleted.

| Pointer file | Source |
|---|---|
| `src/assets/carenest-logo.png.asset.json` | A (full purple lockup) |
| `src/assets/carenest-icon-only.png.asset.json` | C (glyph) |
| `src/assets/carenest-wordmark.png.asset.json` | A |
| `src/assets/apple-touch-icon.png.asset.json` | I |

## 3. Component changes

`src/components/carenest/Logo.tsx`
- Height-driven render: `height={size}`, `width="auto"`, drop forced square + `object-contain`.
- New `iconOnly?: boolean` — true renders `carenest-icon-only.png.asset.json` (square), false/absent renders the full horizontal lockup.
- `alt="Tillsa"` kept. Legacy `withWordmark` prop left as-is (still inert).

`src/components/carenest/AppSidebar.tsx` (~line 118)
- `<Logo size={collapsed ? 28 : 32} iconOnly={collapsed} />`

## 4. Code edits

- `public/manifest.webmanifest` — the two `"purpose": "maskable"` entries point at `/icon-maskable-192.png` and `/icon-maskable-512.png`; the `"any"` entries stay on `/icon-192.png` / `/icon-512.png`.
- `src/routes/__root.tsx` — add `{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" }` to `head().links` (currently absent; only the two PNG icon links and apple-touch-icon exist).

## Out of scope

No i18n/text edits. No filename or route changes. `og-image.jpg`, `badge-96.png`, `public/og/*` untouched.

## Verification

1. Logo renders at natural aspect; expanded sidebar (256px) shows the lockup without overflow.
2. Collapsed rail shows the glyph only.
3. Marketing header/footer, login, onboarding show the full Tillsa lockup (browser screenshots).
4. Manifest `any` ≠ `maskable` sources; favicon link present in rendered head.
5. `tsgo --noEmit` clean.

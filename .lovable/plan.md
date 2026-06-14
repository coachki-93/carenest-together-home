## Plan

1. Upload the attached `CARE.png` to the Lovable CDN via `lovable-assets`, producing `src/assets/carenest-logo.png.asset.json`.
2. Rewrite `src/components/carenest/Logo.tsx` to render the uploaded image instead of the inline SVG heart-nest mark:
   - Import the asset pointer and render `<img src={asset.url} alt="CareNest" />`.
   - Since the uploaded logo already includes the "CARENEST" wordmark, the `size` prop controls the height of the image. When `withWordmark` is false, render the image at the requested size (it still reads as the brand because the wordmark is part of the artwork) — alternatively scale down for compact spots like the sidebar collapsed state.
   - Drop the gradient-tile SVG and the separate text wordmark so we don't double up on "CareNest" text next to the image.
   - Keep the same component API (`size`, `withWordmark`, `className`) so every existing call site (`AppSidebar`, `auth`, `index`, `invite.*`, `onboarding.*`, `settings`, `ProfileSelector`) keeps working with no edits.
3. Update the favicon: replace `public/favicon.ico` / any `<link rel="icon">` in `index.html` so the browser tab also uses the new mark (export a 256px PNG from the same source and point the favicon link at it).
4. Leave all other files untouched — no copy or i18n changes needed.

### Notes
- The uploaded PNG has a transparent background and works on light + dark surfaces (purple stays readable on both).
- Because the artwork bundles wordmark + icon, places that previously showed `<Logo withWordmark />` will now show the wordmark from the image itself; the "Care, together" tagline is removed (it wasn't part of the new brand artwork). If you want the tagline kept below the image, say the word and I'll add it back.
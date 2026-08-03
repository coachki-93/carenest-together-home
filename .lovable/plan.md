# Refine pricing card + FAQ

## 1. `src/routes/index.tsx` — PriceCard (~970-1010)

- Drop the `sub` prop from the type and destructuring; remove the sub2 paragraph.
- Badge: centered pill above the card top edge.
- Headline centered; thenPrice + new "Read more" link left-aligned.

```diff
-  sub,
   featuresLabel,
...
-  sub: string;
...
-        <span className="absolute -top-3 left-6 ...">
+        <span className="absolute -top-3 left-1/2 -translate-x-1/2 ...">
...
-        <p className="text-4xl md:text-5xl text-marketing-ink mb-2" style={display}>
+        <p className="text-4xl md:text-5xl text-marketing-ink mb-2 text-center" style={display}>
           {price}
         </p>
         {thenPrice && (<p className="text-sm font-medium text-marketing-ink mb-2">{thenPrice}</p>)}
-        <p className="text-sm text-marketing-muted leading-[1.6]">{sub}</p>
+        <a href="#faq" className="text-sm text-marketing-sage underline underline-offset-4 hover:opacity-80">
+          {t("marketing.pricing.readMore")}
+        </a>
```

## 2. Call site (~448)

Remove `sub={t("marketing.pricing.sub2")}`.

## 3. Copy — `en.ts` + `sv.ts`

| key | sv | en |
| --- | --- | --- |
| `marketing.pricing.badge` | Lanseringserbjudande | Launch offer |
| `marketing.pricing.readMore` (new) | Läs mer om priset | Read more about pricing |
| `marketing.faq.q4A` | ...namnger 31 dec 2026-deadline | English equivalent |

`sub2` is used nowhere else (grep confirmed only the call site) → removed from both files.

## Verification
en/sv parity, `tsgo --noEmit`, Playwright screenshot of pricing card.

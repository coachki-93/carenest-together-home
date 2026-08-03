# Refine the pricing card

## 1. `src/routes/index.tsx` — PriceCard (~line 998)

Revert the centered top block to left-aligned:

```diff
-      <div className="w-full flex flex-col items-center text-center mb-7 mt-1">
+      <div className="w-full mb-7 mt-1">
         <p className="text-4xl md:text-5xl text-marketing-ink mb-2" style={display}>
           {price}
         </p>
         {thenPrice && (
           <p className="text-sm font-medium text-marketing-ink mb-2">{thenPrice}</p>
         )}
-        <p className="text-sm text-marketing-muted leading-[1.6] max-w-md">{sub}</p>
+        <p className="text-sm text-marketing-muted leading-[1.6]">{sub}</p>
       </div>
```

Outer card keeps `flex flex-col items-start`; badge, feature list and full-width CTA unchanged.

## 2. `src/routes/index.tsx` — call site (~line 448)

```diff
-          <div className="max-w-xl mx-auto">
+          <div className="max-w-md mx-auto">
```

Narrower focused column, still centered in the section.

## 3. Copy — `src/lib/i18n/en.ts` + `sv.ts`

| key | sv | en |
| --- | --- | --- |
| `price` | En plan, inget krångel | One plan, no fuss |
| `thenPrice` | 199 kr/månad — låst för alltid om du börjar före 31 dec 2026 | 199 kr/month — locked for life if you start before 31 Dec 2026 |
| `sub2` | Ett pris per familj, obegränsat med vårdgivare. Börjar du före 31 dec 2026 låser du 199 kr/månad så länge du är prenumerant; familjer som ansluter senare betalar 299 kr/månad. Säg upp när som helst. | One price per family, unlimited caregivers. Start before 31 Dec 2026 to lock 199 kr/month for as long as you subscribe; families joining later pay 299 kr/month. Cancel anytime. |

`marketing.pricing.title`, `badge`, `cta`, `f1`–`f8` untouched.

## Verification
- en/sv key parity
- `tsgo --noEmit` clean
- Playwright screenshot of the pricing section

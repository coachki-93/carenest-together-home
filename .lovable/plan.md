# Three mobile layout fixes (CSS only)

## 1. Today task titles wrap per-letter
`src/routes/_authenticated/dashboard.tsx` (~1183)

```diff
-  "font-bold [overflow-wrap:anywhere] min-w-0",
+  "font-bold break-words min-w-0",
```
`break-words` = `overflow-wrap: break-word`: breaks between words normally, and only inside a word when a single word is too long to fit — so long space-less strings still wrap instead of overflowing.

## 2. Medication card icons clip off the right edge
`src/routes/_authenticated/medications.tsx` (~370)

```diff
-  <div className="flex gap-1">
+  <div className="flex gap-1 shrink-0">
```
Title side already has `min-w-0` + `truncate`, so the name truncates instead of pushing the icons out.

## 3. Snabblogg VÄRDEN grid dead space
`src/components/carenest/UnifiedLogDialog.tsx` (~277)

```diff
-  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
+  <div className="grid grid-cols-2 gap-2.5 mt-2">
```
Two balanced columns on mobile, matching the HÄNDELSER grid. Label container already has `min-w-0 break-words`, so "Andningsfrekvens" / "Syremättnad (SpO₂)" wrap to two lines. If the longest label still clips at 375px, fall back to `grid-cols-1` and note it.

## Verification
- Playwright screenshots at 375px: Today list, a medication card, the Snabblogg modal.
- Check 1280px for no desktop regression.
- `tsgo --noEmit` clean.

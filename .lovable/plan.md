# Two small fixes: oxygen fail-safe + PWA theme colour

## Scope

Exactly four files. No package/dependency changes. No CSS token changes.

---

## 1. Oxygen fail-safe — `src/lib/oxygen/tanks.ts`

`TANKS` is typed `Record<TankType, ...>` with one key (`liv_mini_2l`), but the
type is a lie at runtime: every call site passes
`tank.tank_type as TankType` from a plain `string` DB column. Any row with a
tank type outside that key makes `TANKS[type]` `undefined`, and
`TANKS[type].flows` throws.

Blast radius today:

- `durationMinutes` is called in the sweep's check-reminder pass
  (`oxygen-low-sweep.ts:191`) and in `OxygenCheckBanner.tsx:46`. In the sweep,
  the throw lands inside the per-tank `try` and skips that tank's safety
  reminder; on the Today page it breaks the render.
- `flowOptions` is called in `oxygen.tsx:302` with the constant
  `DEFAULT_TANK`, so it is safe today — hardened anyway for symmetry.

### Diff

```diff
 export function flowOptions(type: TankType): number[] {
-  return TANKS[type].flows.map((f) => f.flow);
+  return TANKS[type]?.flows.map((f) => f.flow) ?? [];
 }

 export function durationMinutes(type: TankType, flow: number): number | null {
-  const row = TANKS[type].flows.find((f) => Math.abs(f.flow - flow) < 1e-9);
+  const row = TANKS[type]?.flows.find((f) => Math.abs(f.flow - flow) < 1e-9);
   return row ? row.minutes : null;
 }
```

Both are already null-returning for an unknown *flow*; optional chaining makes
an unknown *type* behave identically. `computeRemaining` already returns `null`
when `durationMinutes` returns `null`, so no other call site needs touching.

### Tests — `src/lib/oxygen/tanks.test.ts`

Add `flowOptions` and `type TankType` to the import, then two cases:

```diff
-import { computeRemaining, durationMinutes, type OxygenTankRow } from "./tanks";
+import {
+  computeRemaining,
+  durationMinutes,
+  flowOptions,
+  type OxygenTankRow,
+  type TankType,
+} from "./tanks";
```

```diff
   it("old 13 rows unchanged", () => {
     for (const [f, m] of OLD) expect(durationMinutes("liv_mini_2l", f)).toBe(m);
   });
+
+  // FAIL-SAFE: a DB row whose tank_type is not in TANKS must not throw.
+  // durationMinutes feeds the sweep's check-reminder pass and the Today banner.
+  it("unknown tank type returns null / [] instead of throwing", () => {
+    expect(durationMinutes("unknown" as TankType, 0.1)).toBeNull();
+    expect(flowOptions("unknown" as TankType)).toEqual([]);
+  });
 });
```

All 17 existing durations and every status assertion stay untouched and must
still pass.

### Note on the requested `check-reminder.test.ts` case

`expect(effectiveCheckIntervalMinutes(180, null)).toBe(180)` **already exists**
in that file (inside `describe("high-flow interval cap")`). I am not adding a
duplicate — flagging instead of doing, per your instruction. Say the word if you
want it moved into its own named `describe("effectiveCheckIntervalMinutes")`
block.

---

## 2. PWA theme colour `#6C63FF` → `#6426DB`

Exactly two places, as specified:

### `public/manifest.webmanifest`

```diff
   "background_color": "#ffffff",
-  "theme_color": "#6C63FF",
+  "theme_color": "#6426DB",
```

### `src/routes/__root.tsx`

```diff
       { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
-      { name: "theme-color", content: "#6C63FF" },
+      { name: "theme-color", content: "#6426DB" },
```

`--primary` and every other CSS token stay as they are; `background_color`
stays `#ffffff`.

---

## Flagged, not changed

Other `#6C63FF` literals exist in the repo and are **out of scope** for this
pass — listed so you can decide separately:

- `src/styles.css:89` — a comment (`/* #6C63FF-ish */`) next to `--primary`.
- `src/lib/email-templates/*.tsx` (5 files) — button background colours in
  signup / recovery / magic-link / invite / email-change emails.
- `src/routes/_authenticated/dashboard.tsx:2033` and
  `src/components/carenest/ProfileSelector.tsx:39` — avatar colour fallbacks.
- `src/routes/index.tsx:251` — a hardcoded demo chip colour.

---

## Verification

1. `bunx vitest run` — full suite, including the new tanks cases.
2. `tsgo --noEmit` — clean.
3. Confirm the two theme-colour edits landed and nothing else in
   `manifest.webmanifest` / `__root.tsx` changed.

## Files changed (expected)

- `src/lib/oxygen/tanks.ts`
- `src/lib/oxygen/tanks.test.ts`
- `public/manifest.webmanifest`
- `src/routes/__root.tsx`

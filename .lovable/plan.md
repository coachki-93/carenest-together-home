# Mobile layout fixes (≤375px)

Four low-risk presentation fixes. No behavior or data changes.

## 1 & 2 — Header action bar overflow (shared layout)

`src/components/carenest/DashboardLayout.tsx`

- Title block: keep `min-w-0` + `truncate`, and let it shrink first.
- Actions group: add `shrink-0` so the emergency link and profile selector can never be pushed off-screen; reduce mobile gaps.
- Page action buttons passed through the `actions` slot get a wrapper with a shared class so long labels condense on mobile: the layout applies `[&_[data-action-label]]:hidden sm:[&_[data-action-label]]:inline` — but rather than magic selectors, the simpler route is used:
  - Wrap `{actions}` in `<div className="flex items-center gap-1 md:gap-2 min-w-0">` and mark the long-label page buttons themselves with `hidden sm:inline` spans at the two call sites that overflow (Planner, Medications), leaving the icon visible on mobile — the same pattern the emergency link already uses.

Net effect: on mobile the page action shows as an icon-only pill; emergency + profile always visible. From `sm:` up nothing changes.

## 3 — Duplicate language toggle in page headers

Remove `<LanguageToggle />` from the `actions` slot (and its now-unused import) in:

- `src/routes/_authenticated/events.tsx`
- `src/routes/_authenticated/appointments.tsx`
- `src/routes/_authenticated/shopping.tsx`

It remains in the sidebar (`AppSidebar`) for all in-app pages. Marketing/auth/onboarding toggles untouched.

## 4 — Snabblogg option grid overflow

`src/components/carenest/UnifiedLogDialog.tsx`

- VÄRDEN grid (~line 277): `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`.
- Add `min-w-0` to each option's label container so long text wraps instead of overflowing.
- Events grid (~line 303) already wraps text (`break-words`), keep as is.
- Date/time and duration grids already have `min-w-0`; severity grid is short-label only. No change.

## Verification

Screenshots at 375px (Planner header, Medications header, Events header, Snabblogg modal) and at 1280px to confirm desktop is unchanged, plus `tsgo --noEmit`.

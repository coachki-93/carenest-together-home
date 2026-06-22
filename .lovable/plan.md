
# Mobile Optimization Plan (mobile-only, no desktop changes)

Goal: make every authenticated and auth page feel native on phones. All changes guarded by Tailwind's mobile-first defaults + `md:`/`sm:` to restore current desktop behavior unchanged.

## 1. Foundations

- **Viewport & safe areas** (`index.html` / `__root.tsx` head): ensure `viewport-fit=cover` and add `env(safe-area-inset-*)` padding utilities in `src/styles.css` for header, bottom bar, and sheet footers (iOS notch + home indicator).
- **Touch target token**: introduce `.tap` utility (`min-h-11 min-w-11`, ~44px) in `styles.css`; apply to all icon buttons, sidebar items, toggles, list rows.
- **Base type scale on mobile**: bump body to 16px min (prevents iOS zoom on input focus); inputs/selects explicit `text-base` on mobile, `text-sm md:text-sm`.
- **Disable horizontal scroll**: add `overflow-x-hidden` on `<body>` and audit fixed widths.

## 2. App shell (`DashboardLayout` + `AppSidebar`)

- On mobile, sidebar switches to `collapsible="offcanvas"` (drawer). Hamburger (`SidebarTrigger`) on the left of header.
- Header on mobile:
  - Row 1: hamburger + truncated page title only.
  - Language toggle + ProfileSelector + page `actions` move into the drawer footer (and/or a "more" menu icon at right).
  - Reduce header padding to `px-3 py-2`; title `text-lg`.
- Drawer content: nav items at 44px rows, larger icons, language switch + active profile + sign-out pinned to drawer footer with safe-area padding.
- Main content padding on mobile: `px-3 py-4`.

## 3. Dialogs → Bottom sheets on mobile

- Add a `ResponsiveDialog` wrapper (Dialog on `md+`, Drawer/Vaul bottom sheet on mobile) using existing `components/ui/drawer.tsx`.
- Convert: `QuickLogDialog`, `TaskActionDialog`, any confirm/alert dialogs used in handover, medications, oxygen, inventory, shopping, caregivers, settings.
- Sheets: full-width, rounded top, drag handle, sticky footer actions with safe-area inset, internal scroll.

## 4. Page-by-page sweep (all `_authenticated/*` + auth)

Common rules applied per page:
- Replace multi-column grids with single column on mobile: `grid-cols-1 md:grid-cols-2/3`.
- Cards: full-bleed style with `rounded-2xl`, `p-4`, generous spacing (`space-y-3`).
- Tables → stacked card lists on mobile (medications, inventory, shifts, vitals history, oxygen tanks).
- Long forms: one field per row, larger inputs (`h-11`), labels above, sticky submit bar at bottom on mobile with safe-area padding.
- Tabs: horizontally scrollable with snap, larger hit areas.
- Filter/sort controls: collapse into a single "Filters" sheet button on mobile.
- Floating Action Button (FAB) for primary action where applicable (Add medication, Quick log, Add tank, etc.) bottom-right, above safe area.
- Toast/notify positioning already centered; verify it sits above bottom nav/FAB on mobile.

Specific pages:
- **dashboard / home**: stack hero cards; KPIs in 2-col grid on mobile, not 4-col.
- **schedule**: day view becomes vertical timeline; weekly grid hidden < md, replaced by date picker + day list.
- **medications**: list as cards, doses as pill chips; "Mark given" full-width.
- **vitals / oxygen**: charts get `aspect-square` and overflow scroll; latest-reading card pinned on top.
- **handover**: sections collapsible accordions on mobile.
- **shifts / caregivers**: avatar + name + role stacked; actions in row sheet.
- **inventory / shopping**: quantity stepper buttons 44px; swipe-to-delete via long-press menu instead (simpler).
- **instructions / child / settings**: form spacing + sticky save bar.
- **auth pages**: center card, full width with `px-4`, larger inputs and primary button.
- **onboarding**: step indicator condenses to "Step x/y", next button sticky.

## 5. Components touched (utility, no logic changes)

- `DashboardLayout.tsx`, `AppSidebar.tsx`
- New `src/components/ui/responsive-dialog.tsx`
- `QuickLogDialog.tsx`, `TaskActionDialog.tsx`, `CarePlaceCheckBanner.tsx`, `EnableNotificationsCard.tsx`
- Page files under `src/routes/_authenticated/*` and `src/routes/auth.*.tsx`
- `src/styles.css` (safe-area utilities, `.tap`, input min-size)
- `index.html` viewport

## 6. Verification

- Switch preview to mobile viewport.
- Drive Playwright at 390×844 across each route: screenshot header, key cards, one dialog, one form. Confirm: no horizontal scroll, 44px targets, drawer opens, dialog renders as bottom sheet, sticky actions visible above safe area.
- Spot-check desktop (1280×800) to confirm no regressions.

## Out of scope

- No business-logic, data, or backend changes.
- No desktop layout changes beyond what's needed to introduce mobile-first classes.
- No redesign of color/typography system.

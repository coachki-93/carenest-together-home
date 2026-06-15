## Goal

Stop the Today page and Schedule page from stacking finished items inline. Move them into their own collapsible "Previous tasks" section that's hidden by default, with a counter and a toggle button. Pending and overdue items keep their current placement.

## What counts as "previous"

Any task whose status is `given`, `skipped`, or `postponed` (including spontaneous events logged via Quick Log, which already render with `status = "given"`). Pending and overdue items stay in the main list as they are today.

## UI changes

**Today's page (`src/routes/_authenticated/dashboard.tsx`)**

- Split the existing `tasks` array into `activeTasks` (pending/overdue) and `pastTasks` (given/skipped/postponed).
- Render `activeTasks` exactly as today inside the "Today's schedule" card.
- Below the active list, render a slim divider + a ghost button:
  - Label: `t("schedule.showPrevious", { count })` → "Show previous tasks ({{count}})" / "Visa tidigare uppgifter ({{count}})".
  - Chevron rotates when expanded; second label `t("schedule.hidePrevious")`.
- When expanded, render `pastTasks` using the same row component already used for the active list (keeps undo + attribution intact).
- Empty state unchanged. If `pastTasks.length === 0`, the toggle is not rendered.

**Schedule page (`src/routes/_authenticated/schedule.tsx`)**

- Same split applied per day group in the timeline. Within each day, render active rows first, then a collapsible "Previous tasks ({{n}})" section underneath.
- For days entirely in the past (every row is done/skipped), default the section to collapsed too, with the same toggle.

**State**

- Local `useState<boolean>` per page (and per day on the schedule). No persistence — it resets on navigation, which keeps the page tidy by default.

**i18n**

Add to both `en.ts` and `sv.ts` under `schedule`:
- `showPrevious`: "Show previous tasks ({{count}})" / "Visa tidigare uppgifter ({{count}})"
- `hidePrevious`: "Hide previous tasks" / "Dölj tidigare uppgifter"
- `previousSection`: "Previous tasks" / "Tidigare uppgifter"

## Files touched

- `src/routes/_authenticated/dashboard.tsx` — split task list, add toggle.
- `src/routes/_authenticated/schedule.tsx` — same split per day group.
- `src/lib/i18n/en.ts`, `src/lib/i18n/sv.ts` — new keys.

No DB changes, no new components required (rows are reused).

---

## On your second question: notifications on iPad

Short version: **yes, but with limits, and only after the user installs the app to the Home Screen.**

- **iPad / iPhone (Safari)**: Web Push works on iOS/iPadOS 16.4+, but **only** after the user adds the site to the Home Screen ("Add to Home Screen") and opens it from that icon. Notifications won't work in a regular Safari tab — that's an Apple restriction, not something the code can bypass.
- **Android (Chrome/Edge/Firefox)**: Works in the regular browser tab, no install required.
- **Desktop (Chrome, Edge, Firefox, Safari)**: Works directly in the browser.

To make this work the app needs:
1. A small PWA setup (manifest + service worker) so iPads can install it to the Home Screen.
2. A push provider — either Web Push (VAPID keys, free, more setup) or Firebase Cloud Messaging (easier API, free tier).
3. A backend job that triggers a push when something happens (e.g. 30 minutes before shift end → handover reminder; missed dose → caregiver ping).

This is a separate piece of work from the task-list cleanup above. If you want it, say the word and I'll plan it out — including which provider fits best and what the install flow looks like for caregivers on iPad.

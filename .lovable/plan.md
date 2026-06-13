# Onboarding plan

Goal: a family signs up and immediately understands (1) how to get their data into CareNest and (2) where everything lives on the dashboard. Two distinct experiences, both skippable, both replayable from Settings.

## 1. Owner welcome wizard (new)

The existing `/onboarding/child` page becomes step 2 of a 4-step wizard. Replaces the single-page child setup; nothing else about it changes.

```text
Step 1 — Welcome             "Let's set up CareNest in 2 minutes."
                              · what we'll do (3 bullets) · Skip setup
Step 2 — Your child           current child form
Step 3 — First medication     name, dose, times (optional, can skip)
Step 4 — Invite caregivers    generate invite code + copy/share (optional)
Step 5 — All set              CTA to dashboard, kicks off the guided tour
```

- Sidebar progress dots at the top, **Back / Skip step / Continue** at the bottom of every step.
- Every step writes immediately on Continue; closing the browser mid-flow is safe.
- `profiles.onboarded` flips to true after step 2 (so they can always come back via the dashboard CTA).
- A persistent "Resume setup" banner appears on the dashboard until all 4 steps are complete.

## 2. Caregiver mini-intro (existing, lightly polished)

The current `/onboarding/caregiver` page (name + avatar + color) stays as-is. After saving we send them straight into the guided dashboard tour with a caregiver-specific copy track ("Here's how this family logs care…").

## 3. Guided dashboard tour (new)

A lightweight overlay that highlights 5 dashboard regions in sequence:

```text
1. Today's schedule  — "Medications and events for today. Tap Mark done to log."
2. Vitals snapshot   — "Latest readings. Log new ones from here or the Vitals page."
3. Handover preview  — "End-of-shift summary the next caregiver sees first."
4. Care team         — "Everyone who can see and log for this child."
5. Sidebar nav       — "Schedule, Meds, Vitals, Handover, Caregivers, Settings."
```

- Dim background + spotlight cutout around the target element.
- Tooltip card with title, body, **Skip tour / Back / Next**.
- Triggers automatically on first dashboard visit (tracked in localStorage per user).
- Owner and caregiver get slightly different copy on steps 1 and 3.

## 4. Settings — replay controls

A new "Help & onboarding" section in `/settings`:

- **Replay dashboard tour** — clears the localStorage flag and routes to `/dashboard?tour=1`.
- **Restart setup wizard** — routes to `/onboarding/child?step=1`.

## Technical notes

- New file `src/components/carenest/GuidedTour.tsx` — self-contained overlay; no new deps. Targets elements by `data-tour="..."` attribute, so the dashboard sections just add those attributes.
- New file `src/lib/onboarding/tour-state.ts` — read/write `carenest.tour.dashboard.done` in localStorage, keyed by `user.id`.
- Convert `onboarding.child.tsx` into a stepped wizard internally; URL becomes `/onboarding/child` with `?step=1..5` query param. Existing `/onboarding/caregiver` route untouched.
- All new copy goes through `t()` with keys added to both `en.ts` and `sv.ts`.
- Auto-launch on dashboard: if `?tour=1` OR (first visit AND user is `onboarded`), start the tour after mount; otherwise no-op.

No database changes required.
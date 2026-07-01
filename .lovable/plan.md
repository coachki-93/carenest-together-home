## Emergency Info Page Overhaul

Turn `/emergency` into a serious under-stress reference: a rich condition summary, an owner-editable numbered action guide with color-coded severity, and clearer med info. Offline-safe by caching the last snapshot in localStorage.

### 1. Rich condition description

Replace the plain `child.diagnosis` text with a structured "Condition & devices" block:
- Owner edits from Settings → Child profile with a simple multi-line editor supporting bullet points (Markdown-lite: lines starting with `-` render as bullets; blank lines break paragraphs). No heavy WYSIWYG.
- New nullable column `children.condition_details` (text). `diagnosis` stays as a short one-liner ("Apert syndrome") shown as a badge; `condition_details` renders below as the formatted body (tracheostomy, PEG, allergies context, etc.).
- Allergies stay in their own red high-contrast box (already exists).

### 2. Emergency Action Steps (new)

New owner-managed, ordered checklist rendered as huge, high-contrast cards.

Data model — new table `emergency_steps`:
- `family_id` (fk families), `position` int, `title` text, `description` text nullable
- `severity` enum: `critical` (red), `monitor` (yellow), `info` (neutral)
- RLS: family members read; owners write. Standard GRANTs.

UI on `/emergency`:
- Section "Emergency action steps" above medications, below diagnosis.
- Each step: large numbered circle, bold title (text-xl), optional description, left border + soft background tinted by severity (red-600 / amber-500 / slate-300).
- Empty state prompts owner to add steps (owner sees "Edit steps" button linking to Settings).

Owner editor in Settings (new `EmergencyStepsSettings` component):
- List with drag-to-reorder (or up/down buttons for simplicity/a11y), inline title, expandable description, severity selector, delete. "Add step" button.
- Persist reorder by rewriting `position`.

### 3. Meds — dosage + route clarity

Extend the meds list on `/emergency` to render everything the responder needs at a glance:
- Show dose (`dose_amount dose_unit`), route (existing `medications.route`), and schedule summary if present.
- Bold name, dose/route on second line, small "PRN" pill if `as_needed`.

### 4. Offline resilience

- On every successful load of child + steps + meds + contacts, snapshot the rendered data into `localStorage` under `emergency:<familyId>`.
- On mount, hydrate from snapshot immediately so the page renders even with no network; live query overwrites when it resolves.
- Small "Last updated <relative time>" line at the bottom + amber "Offline — showing last saved copy" banner when `navigator.onLine === false`.

### 5. Small UX polish

- Sticky "Call 112" button remains at top; add a second sticky quick-call for the first emergency contact if present.
- Ensure text is at least `text-base`; step titles `text-xl`; tap targets ≥ 44px.
- All new strings added to both `en.ts` and `sv.ts`.

### Technical outline

- Migration: add `children.condition_details text`; create `emergency_steps` with GRANTs, RLS (member read, owner write via `is_family_owner`), and updated_at trigger.
- New `src/lib/data/emergency-steps.ts` with `useEmergencySteps`, `useUpsertEmergencyStep`, `useDeleteEmergencyStep`, `useReorderEmergencySteps`.
- New `src/components/carenest/EmergencyStepsSettings.tsx` mounted inside the existing child/owner settings page.
- Rewrite `src/routes/_authenticated/emergency.tsx` for the new layout + offline snapshot hook.
- Extend the child edit form for `condition_details`.
- i18n keys in `en.ts` and `sv.ts`.

### Out of scope

- Rich WYSIWYG / images in condition body.
- Printable / QR-code lock-screen card (can be a follow-up).
- Push-notification-based caregiver alerts.

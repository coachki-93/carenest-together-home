# In-app Guidebook

A new logged-in page that explains every feature of Tillsa, accurately, based on what the code actually does today. Grouped exactly like the sidebar so users navigate with the same mental model.

## Files

| File | Change |
| --- | --- |
| `src/routes/_authenticated/guidebook.tsx` | New. Route `/guidebook`, `DashboardLayout` + intro + accordion sections. |
| `src/components/carenest/GuidebookSection.tsx` | New. Small renderer that turns a structured i18n body (headings / paragraphs / step lists) into readable long-form markup inside an accordion row. |
| `src/components/carenest/AppSidebar.tsx` | Add `Guidebook` footer nav item (lucide `BookOpen`), placed above Settings, visible to all logged-in users (not owner-gated). |
| `src/lib/i18n/en.ts` | Add `nav.guidebook` + full `guidebook.*` content tree. |
| `src/lib/i18n/sv.ts` | Same keys, natural Swedish. |

No other files change. No data, schema, or feature-behaviour changes.

## Key structure

```text
nav.guidebook
guidebook.title / .intro.*        (what Tillsa is + first steps)
guidebook.groups.care | .caregivers | .family | .account
guidebook.sections.<key>.title
guidebook.sections.<key>.body     (array of blocks: {h}, {p}, {steps:[...]})
```

Section keys, in sidebar order:

- Care: `dashboard`, `schedule`, `appointments`, `medications`, `vitals`, `events`, `oxygen`, `handover`, `instructions`, `inventory`, `maintenance`, `shopping`, `emergency`
- Caregivers: `caregivers`, `shifts`
- Family: `child`
- Account: `billing`, `settings`

18 sections + intro.

## Content rules

- Describes only behaviour confirmed in the current code (routes, dialogs, mutations).
- Explains the app, never care or medical judgement; the existing "coordination tool, not medical advice" framing is repeated once in the intro.
- Each section: one short "what it is" paragraph, then "how to use it" steps where the feature has clear steps, then any conditions (owner-only, hidden when equipment is off, module-gated).
- Anything not verifiable gets an inline `[NEEDS REVIEW: ...]` marker in the copy so you can spot it on the page.

## Accuracy notes already gathered (will be reflected in the copy)

- Medications: doses are generated from each medication's list of times, in the family timezone, for active medications only; a course limits doses by a first-dose datetime plus a total dose count. Marking a dose stores status, time, the acting account and the selected caregiver profile; skip/postpone require a reason; Undo deletes the log row.
- Schedule uses a simple confirm for given/skipped; the dashboard uses the richer dialog with reason, postpone time, notes and (for some appointments) a vital value.
- Events: author-only archive, author edit within a limited window.
- Handover: author-only edit within 2 hours, editing clears read receipts, drafts are prefilled from the shift window, read receipts show who read and flag reads made before an edit.
- Maintenance is hidden entirely when the family has equipment turned off in Settings.
- Shopping list is read-only; ordering and stock changes happen in Förråd.
- Emergency is read-only, cached for offline, with 112 and contact call links; steps are edited on the child page.
- Billing is owner-only; families with a Stripe customer get "Manage" (portal), others get "Subscribe".

## Sections that will carry `[NEEDS REVIEW]` markers

These behaviours could not be confirmed with certainty and will be flagged rather than guessed:

1. Medications — whether any UI starts the per-item timer fields.
2. Events — the exact length/ownership rule of the edit window.
3. Instructions — no permission gate found; copy will say all members can add and edit, flagged for confirmation.
4. Billing — what a cancelled family that still has a Stripe customer sees.
5. Settings — the exact contents of the team/account card.
6. Oxygen — only one tank type is selectable in the UI.

## Verification

- `/guidebook` reachable from the sidebar for a non-owner account.
- All 18 sections render, grouped by the four sidebar groups.
- en/sv key parity check.
- `tsgo --noEmit` clean.

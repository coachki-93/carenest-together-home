## Goal

When a caregiver's shift is about to end, surface a "Handover due" task in the schedule 30 minutes before `shift.end_at`. Opening it shows the handover form **pre-filled** with everything that happened during that shift window — missed/skipped/postponed meds, missed appointments, abnormal vitals, and still-open tasks. The caregiver reviews, edits, and submits.

## Approach

Derive the reminder at runtime instead of inserting rows into the DB. For each expanded shift occurrence we already compute in the schedule view, we emit a synthetic "Handover due" entry at `end - 30min`. No new table, no cron, no drift if a shift is edited/deleted.

The pre-fill is generated on the fly from existing data the moment the dialog opens — querying meds, appointments, vitals for `[shift.start, shift.end]`.

## What lands in the schedule

```text
Mon  ┌───────────────┐
     │ Morning shift │  07:00 – 14:00
     │   Anna        │
     └───────────────┘
     ⏰ Handover due  13:30   ← new synthetic card, amber/accent
```

- Renders only for shifts assigned to the **current user's** caregiver profile (you don't see other caregivers' handover prompts).
- Only shows when `now < shift.end` (don't nag after the shift is over and a handover already exists for it).
- Clicking opens the existing handover dialog in `/handover`, pre-filled.
- A "Skip" affordance dismisses it (stored in localStorage per shift-occurrence id).

## What gets pre-filled

For the shift window `[shift.start, shift.end]`:

- **Meds field** — bulleted list of every `med_log` with status `skipped`, `refused`, or `postponed`, plus any scheduled dose with no log yet (= missed). Each line includes med name, scheduled time, status, and the reason note when present.
  - Example: `• 12:00 Keppra — postponed to 14:00 (child napping)`
- **Notes field** — any appointment in the window marked `cancelled` or with no completion row (missed), and any vitals reading flagged out-of-range.
- **Summary** — left blank for the caregiver to write the human takeaway.
- Other fields (`sleep`, `mood`, `seizures`, `fluids`) — left blank; pre-fill only what we can derive factually.

If nothing eventful happened, the meds/notes fields show "Nothing to flag" placeholder text instead of empty.

## Technical details

### New helper: `src/lib/data/handover-prefill.ts`

```ts
export interface HandoverPrefillInput {
  familyId: string;
  childId: string;
  shiftStart: Date;
  shiftEnd: Date;
}

export interface HandoverPrefill {
  meds: string;   // ready-to-paste multiline text
  notes: string;
  hasContent: boolean;
}

export function useHandoverPrefill(input: HandoverPrefillInput | null): UseQueryResult<HandoverPrefill>
```

Uses existing `med_logs`, `medications`, `appointments` (+ completions), `vitals` queries scoped to the window. Returns formatted strings.

### Schedule view changes (`src/routes/_authenticated/schedule.tsx`)

- For each expanded `ShiftOccurrence` where `caregiverUserId === currentUser.id` and `end > now`, push a synthetic schedule item `{ kind: 'handover-due', at: end - 30min, shiftStart, shiftEnd }`.
- Filter out occurrences the user dismissed (localStorage `carenest.handover-skipped.<masterId>:<startMs>`).
- Render with an amber/accent card distinct from appointments and shifts; clicking calls `navigate({ to: '/handover', search: { shiftStart, shiftEnd } })`.

### Handover route changes (`src/routes/_authenticated/handover.tsx`)

- Add `validateSearch` for optional `shiftStart` / `shiftEnd` ISO strings.
- When present, auto-open the dialog and seed `form.meds` + `form.notes` from `useHandoverPrefill`. Show a small banner: "Pre-filled from your <morning> shift · <time range>".
- On submit, the dialog still uses the existing `useCreateHandover` mutation — no schema changes needed.

### i18n

Add keys to both `en.ts` and `sv.ts` under `handoverPage`:
- `due` ("Handover due")
- `prefilledBanner`, `prefillEmpty`, `skip`
- `prefill.medSkipped`, `prefill.medRefused`, `prefill.medPostponed`, `prefill.medMissed`
- `prefill.apptMissed`, `prefill.vitalAbnormal`

## Out of scope (per your call)

- Push/email notifications at T-30 (skipped).
- Storing handover-due reminders in the DB (not needed — derived at runtime).
- Cron jobs.

## Files touched

- new: `src/lib/data/handover-prefill.ts`
- edit: `src/routes/_authenticated/schedule.tsx` (render synthetic card + dismiss)
- edit: `src/routes/_authenticated/handover.tsx` (search params + prefill seeding)
- edit: `src/lib/i18n/en.ts`, `src/lib/i18n/sv.ts`

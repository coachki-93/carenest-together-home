# Resolve the 6 guidebook [NEEDS REVIEW] markers

Replace placeholder hedging copy with confirmed behavior in `src/lib/i18n/en.ts` and `src/lib/i18n/sv.ts`. No component changes.

## Timer question (Kim)

Checked the app: the timer is a countdown a caregiver starts on the task, and the task auto-completes when it ends (see the existing field help: "Caregivers can start a countdown. The task is auto-completed when the timer ends."). So it is a duration/wait countdown tied to the dose task, not a separately labelled observation window. Copy is phrased that way.

## Edits (en.ts / sv.ts, same line numbers in both)

| Line | Section | Change |
|---|---|---|
| 3366 | `reviewNote` | delete unused key (only existed for the markers) |
| 3479–3481 | Medications → Timers | heading `Timers`; body: optional timer 1–120 min set when adding/editing; caregiver starts the countdown, task auto-completes at zero |
| 3529–3531 | Events → Editing | heading `Editing`; body: only the author, only within 2 hours; otherwise read-only |
| 3561–3563 | Oxygen → Tank types | heading `Tank types`; body: one tank type today, so no type choice when starting a tank |
| 3616–3618 | Instructions → Who can edit | heading `Who can edit`; body: only the family owner adds/edits/deletes, all caregivers can read |
| 3799–3801 | Subscription → After cancelling | heading `After cancelling`; body: access until paid period ends, page shows "Active until [date], then cancels" plus Manage → billing portal to resubscribe or change payment |
| 3837–3839 | Settings → Team account | heading `Team account`; body: owners manage a shared team login as an alternative to individual invites |

Swedish is a natural translation, not literal; keys stay identical.

## Verification

- `rg -n "NEEDS REVIEW" src/` → no matches
- en/sv key parity script
- `tsgo --noEmit`

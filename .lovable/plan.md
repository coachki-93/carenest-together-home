# "Check the oxygen tank" banner on Today

Surface the Stage-2/3 oxygen check reminder in-app, using the exact same decision function as the push, so the banner and the notification can never disagree.

## New file: `src/components/carenest/OxygenCheckBanner.tsx`

Self-contained, takes `familyId`, returns `null` when not applicable.

Data it reads (all existing hooks):
- `useActiveOxygenTank(familyId)` — active tank (`replaced_at IS NULL`)
- `useFamily(familyId)` — for `hospital_paused` and `oxygen_check_interval_minutes`
- `useConfirmTank()` — Stage-3 mutation that stamps `last_checked_at`

Show condition (no duplicated logic):
```ts
if (!familyId || !tank) return null;
if (tank.paused_at) return null;
if (isPaused(family, "oxygen")) return null;
const due = shouldSendCheckReminder({
  startedAt: tank.started_at,
  lastCheckedAt: tank.last_checked_at,
  checkReminderSentAt: tank.check_reminder_sent_at,
  intervalMinutes: family?.oxygen_check_interval_minutes,
  now,                    // ticking every 60s so it appears without a reload
});
if (!due) return null;
```
`shouldSendCheckReminder` is imported from `src/lib/oxygen/check-reminder.ts` — the same function the sweep calls.

Presentation: soft amber card (`border-amber-300 bg-amber-50`), lungs icon, matching the existing banner shell.
- Title: `oxygen.checkBannerTitle`
- Sub-line: `oxygen.basedOnFlow` with `formatFlow(tank.flow_lpm)` (reused key)
- Card body is a click target that navigates to `/oxygen`
- `Confirm` button (stops propagation) → `useConfirmTank({ tankId })` → `toast.success(t("oxygen.confirmed"))` (the Stage-3 toast). The stamp flips the show-condition false and resets the push clock, since both read `last_checked_at`.

## Edit: `src/routes/_authenticated/dashboard.tsx`

Import and render `<OxygenCheckBanner familyId={familyId} />` in the banner stack next to `CarePlaceCheckBanner` / `AppointmentsReminderBanner`.

## i18n (`en.ts` + `sv.ts`, oxygen block)

| key | en | sv |
| --- | --- | --- |
| `oxygen.checkBannerTitle` | Check the oxygen tank | Kontrollera syrgastuben |
| `oxygen.checkBannerBody` | Confirm the tank is connected and the flow is right. | Bekräfta att tuben är kopplad och att flödet stämmer. |

`oxygen.confirmTank` / `oxygen.confirmed` / `oxygen.basedOnFlow` already exist and are reused.

## Verification

`tsgo --noEmit`, full vitest, en/sv key parity, and a live trace of the due/not-due/paused/no-tank cases plus a confirm write that clears the banner.

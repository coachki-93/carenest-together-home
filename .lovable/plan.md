# Fix: Today "check the oxygen tank" banner never appears

The banner reuses the push's send-dedup, so once the push stamps `check_reminder_sent_at` the banner hides. Give the banner its own persistent overdue predicate.

## `src/lib/oxygen/check-reminder.ts` (add, nothing removed)

```ts
export type CheckOverdueInput = Pick<
  CheckReminderInput,
  "startedAt" | "lastCheckedAt" | "intervalMinutes" | "now"
>;

/**
 * In-app "a check is overdue" state. Same lastInteraction + interval math as
 * the push, but deliberately WITHOUT the send-dedup: the banner is persistent
 * until a caregiver confirms, and must not be silenced by the push firing.
 */
export function isOxygenCheckOverdue(input: CheckOverdueInput): boolean {
  const intervalMs = resolveCheckIntervalMinutes(input.intervalMinutes) * 60_000;
  const last = lastInteractionAt(input);
  if (!last) return true; // fail-safe
  return input.now.getTime() - last.getTime() >= intervalMs;
}
```

`shouldSendCheckReminder` is untouched — the push keeps its dedup.

## `src/components/carenest/OxygenCheckBanner.tsx`

```diff
-import { shouldSendCheckReminder } from "@/lib/oxygen/check-reminder";
+import { isOxygenCheckOverdue } from "@/lib/oxygen/check-reminder";
...
-  const due = shouldSendCheckReminder({
+  const due = isOxygenCheckOverdue({
     startedAt: tank.started_at,
     lastCheckedAt: tank.last_checked_at,
-    checkReminderSentAt: tank.check_reminder_sent_at,
     intervalMinutes: family?.oxygen_check_interval_minutes,
     now,
   });
```

Everything else in the banner is unchanged: pause / hospital / no-tank guards, confirm action, styling, 60s tick.

## Tests (`src/lib/oxygen/check-reminder.test.ts`)

New `describe("isOxygenCheckOverdue")`: not overdue before the interval; overdue after it; **still overdue with a fresh `check_reminder_sent_at`** (the regression); not overdue right after a confirm; null interaction → true.

## Verify

`tsgo --noEmit`, full vitest, and a live trace: banner shows for a due tank whose push already fired, persists, disappears on confirm, stays hidden when paused / hospital-paused / no tank.

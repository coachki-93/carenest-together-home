# Fix: "confirm the tank" reminder self-silences

## Root cause (confirmed)

`lastInteractionAt` includes `updated_at`. The sweep's own write of
`check_reminder_sent_at` fires the `set_updated_at` trigger, so `updated_at`
becomes "now" right after every reminder. The next sweep then sees
`now - lastInteraction < interval` and never fires again.

## 1. `src/lib/oxygen/check-reminder.ts`

- `CheckReminderInput`: drop `updatedAt`.
- `lastInteractionAt`: `GREATEST(started_at, last_checked_at)` only.

```diff
 export type CheckReminderInput = {
   startedAt: string | null | undefined;
   lastCheckedAt: string | null | undefined;
-  updatedAt: string | null | undefined;
   checkReminderSentAt: string | null | undefined;
   ...
 export function lastInteractionAt(
-  input: Pick<CheckReminderInput, "startedAt" | "lastCheckedAt" | "updatedAt">,
+  input: Pick<CheckReminderInput, "startedAt" | "lastCheckedAt">,
 ): Date | null {
-  const candidates = [parse(startedAt), parse(lastCheckedAt), parse(updatedAt)]
+  const candidates = [parse(startedAt), parse(lastCheckedAt)]
```

Comment added explaining why `updated_at` must never be used (system writes).

No signal lost: start/change-flow/replace each INSERT a row with a fresh
`started_at`; confirm stamps `last_checked_at`. Fail-safe behaviour unchanged —
no usable timestamp still fires.

## 2. `src/routes/api/public/hooks/oxygen-low-sweep.ts`

Stop passing `updatedAt` in the `shouldSendCheckReminder` call (~line 191);
drop `updated_at` from the select list only if unused elsewhere (it is used by
`computeRemaining`'s row type, so the select stays).

## 3. Tests `src/lib/oxygen/check-reminder.test.ts`

- Remove `updatedAt` from the fixture and the two cases that assert on it.
- **New regression test**: reminded-but-unconfirmed tank —
  `check_reminder_sent_at = 181 min ago`, `updated_at` bumped to the same
  moment (now irrelevant), `last_checked_at = null`, `started_at` old →
  must return `true`. Plus the paired case at 179 min → `false`, and a
  "three consecutive intervals keep nagging" loop.

## Verification

`tsgo --noEmit`, full vitest incl. the new regression test.

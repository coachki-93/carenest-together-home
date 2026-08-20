# Stage 2 — periodic "confirm the tank" reminder in the oxygen sweep

Adds an independent check-reminder pass to the existing 15-minute oxygen sweep. No UI, no confirm action, no change to low/critical behaviour.

## 1. New pure decision module — `src/lib/oxygen/check-reminder.ts`

Extractable, fully testable, no Supabase or push dependency.

```ts
export const DEFAULT_OXYGEN_CHECK_INTERVAL_MINUTES = 180;

export type CheckReminderInput = {
  startedAt: string | null;
  lastCheckedAt: string | null;
  updatedAt: string | null;
  checkReminderSentAt: string | null;
  intervalMinutes: number | null | undefined;
  now: Date;
};

// GREATEST(started_at, last_checked_at, updated_at); nulls ignored.
// If all three are unparsable/null -> lastInteraction = null -> FIRE (fail-safe).
export function lastInteractionAt(i): Date | null
export function shouldSendCheckReminder(i: CheckReminderInput): boolean
```

Rules (fail-safe: ambiguity fires):
- interval = finite, >= 30 value of `intervalMinutes`, otherwise 180.
- no valid lastInteraction → fire.
- elapsed since lastInteraction < interval → do not fire.
- otherwise fire when: `checkReminderSentAt` null OR unparsable, OR `checkReminderSentAt < lastInteraction`, OR `now - checkReminderSentAt >= interval`.

## 2. Sweep changes — `src/routes/api/public/hooks/oxygen-low-sweep.ts`

- Select `updated_at, last_checked_at, check_reminder_sent_at` on `oxygen_tanks`; select `oxygen_check_interval_minutes` on `families` and store it in `famSettings` as `checkInterval`.
- Wrap the whole per-tank body in `try { … } catch { /* continue */ }` so one bad row can't abort the loop.
- Restructure the body into two independent passes:
  - **Pass A (unchanged logic):** `computeRemaining` → low/critical push + stamp. `if (!info) continue;` becomes a local skip of pass A only (`if (info) { … }`), and it is wrapped in its own try/catch so a throw there cannot skip pass B.
  - **Pass B (new, timestamp-only):** `shouldSendCheckReminder(...)` → push to the `"oxygen"` recipient category via the existing `createRecipientResolver`, then `update({ check_reminder_sent_at: nowIso })` on the tank. Stale endpoints go into the same `stale` array; `pushes` counted the same way.
- Copy added next to `OX_COPY`:
  - sv title `🫁 Kontrollera syrgastuben`, body `Bekräfta nivå och flöde. Appen räknar med {flow} l/min — stämmer det?`
  - en title `🫁 Check the oxygen tank`, body `Confirm the level and flow. The app assumes {flow} l/min — is that still correct?`
  - `tag: oxygen-check-${tank.id}`, `url: "/oxygen"`, family `notification_language`.
- Response becomes `{ ok: true, pushes, checkPushes }` for observability.

## 3. Test — `src/lib/oxygen/check-reminder.test.ts`

Covers: untouched > interval fires once; second sweep 15 min later does not re-fire; interaction after a reminder resets and re-fires only after a new interval; missing/invalid interval defaults to 180; interval below 30 clamps to 180; all-null timestamps fire; unparsable `check_reminder_sent_at` fires.

## Verification
`tsgo --noEmit`, full vitest run, and a manual trace confirming the check pass is reached when `computeRemaining` returns null or throws.

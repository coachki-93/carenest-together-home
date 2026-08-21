/**
 * Pure decision logic for the periodic "confirm the tank" oxygen reminder.
 *
 * Deliberately independent of the depletion estimate (`computeRemaining`):
 * it only uses timestamps + the family's configured interval, so a wrong or
 * unavailable calculation can never silence the safety net.
 *
 * Guiding principle: FAIL-SAFE. On any ambiguity (missing/unparsable data,
 * missing setting) the reminder FIRES rather than being silently skipped.
 */

export const DEFAULT_OXYGEN_CHECK_INTERVAL_MINUTES = 180;
/** Mirrors the DB CHECK constraint on families.oxygen_check_interval_minutes. */
export const MIN_OXYGEN_CHECK_INTERVAL_MINUTES = 30;

export type CheckReminderInput = {
  startedAt: string | null | undefined;
  lastCheckedAt: string | null | undefined;
  
  checkReminderSentAt: string | null | undefined;
  intervalMinutes: number | null | undefined;
  now: Date;
};

function parse(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * GREATEST(started_at, last_checked_at); nulls ignored.
 *
 * NEVER include `updated_at`: the `set_updated_at` trigger bumps it on every
 * write, including the sweep's own `check_reminder_sent_at` stamp, which made
 * the reminder reset its own clock and fire only once. Genuine human actions
 * are fully covered — start/change-flow/replace INSERT a row with a fresh
 * `started_at`, confirm stamps `last_checked_at`.
 */
export function lastInteractionAt(
  input: Pick<CheckReminderInput, "startedAt" | "lastCheckedAt">,
): Date | null {
  const candidates = [parse(input.startedAt), parse(input.lastCheckedAt)].filter(
    (d): d is Date => d !== null,
  );
  if (!candidates.length) return null;
  return new Date(Math.max(...candidates.map((d) => d.getTime())));
}

/** Family setting with fail-safe fallback to the 180 min default. */
export function resolveCheckIntervalMinutes(
  intervalMinutes: number | null | undefined,
): number {
  if (
    typeof intervalMinutes !== "number" ||
    !Number.isFinite(intervalMinutes) ||
    intervalMinutes < MIN_OXYGEN_CHECK_INTERVAL_MINUTES
  ) {
    return DEFAULT_OXYGEN_CHECK_INTERVAL_MINUTES;
  }
  return intervalMinutes;
}

export type CheckOverdueInput = Pick<
  CheckReminderInput,
  "startedAt" | "lastCheckedAt" | "intervalMinutes" | "now"
>;

/**
 * In-app "a check is overdue" state for the Today banner.
 *
 * Same lastInteraction + interval math as the push, but deliberately WITHOUT
 * the send-dedup (`check_reminder_sent_at`): the banner is persistent until a
 * caregiver confirms the tank, and must never be silenced by the push firing.
 */
export function isOxygenCheckOverdue(input: CheckOverdueInput): boolean {
  const intervalMs = resolveCheckIntervalMinutes(input.intervalMinutes) * 60_000;
  const last = lastInteractionAt(input);
  if (!last) return true; // fail-safe
  return input.now.getTime() - last.getTime() >= intervalMs;
}

export function shouldSendCheckReminder(input: CheckReminderInput): boolean {
  const intervalMs = resolveCheckIntervalMinutes(input.intervalMinutes) * 60_000;
  const now = input.now.getTime();

  const lastInteraction = lastInteractionAt(input);
  // No usable timestamp at all -> we cannot prove the tank was seen recently.
  if (!lastInteraction) return true;

  if (now - lastInteraction.getTime() < intervalMs) return false;

  const sentAt = parse(input.checkReminderSentAt);
  // Never reminded, or the stamp is unreadable -> fire.
  if (!sentAt) return true;
  // Caregiver interacted after our last reminder -> dedup window resets.
  if (sentAt.getTime() < lastInteraction.getTime()) return true;
  // Still untouched a full interval later -> re-nag.
  return now - sentAt.getTime() >= intervalMs;
}

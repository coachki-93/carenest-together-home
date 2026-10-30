// Pure helpers for the task push sweep (passes 1–4). Kept free of I/O so the
// moved-occurrence rules can be unit tested.
//
// Identity vs. time: an occurrence is identified by its ORIGINAL slot
// (`occurrence_at` = recurrence_override_at for overrides) — that is the key
// completions and dedupe rows use. The time it actually happens (`at_ms`) is
// the override's starts_at when the occurrence was moved, matching Today.

import { expandRecurrence, shouldSendLatePush } from "@/lib/schedule/recurrence";

/**
 * How far an occurrence may be moved earlier and still be picked up: the
 * sweep expands masters this far past `now`, so a 20:00 slot moved to 19:00
 * is already a candidate at 19:00.
 */
export const MOVE_LOOKAHEAD_MS = 2 * 24 * 60 * 60 * 1000;

type MasterLike = Parameters<typeof expandRecurrence>[0] & {
  id: string;
  family_id: string;
  title: string | null;
  kind?: string | null;
  late_after_minutes?: number | null;
  missed_after_minutes?: number | null;
  notify_start?: boolean | null;
  reminder_minutes?: number | null;
};

export type OverrideLike = {
  recurrence_parent_id: string;
  recurrence_override_at: string;
  recurrence_cancelled: boolean | null;
  starts_at?: string | null;
  title?: string | null;
  kind?: string | null;
};

export type SweepOccurrence = {
  master_id: string;
  /** Identity / dedupe / completion key: the original slot. */
  occurrence_at: string;
  /** When it actually happens (moved time for overrides). */
  occurrence_ms: number;
  family_id: string;
  title: string | null;
  kind: string | null;
  late_after_minutes: number;
  missed_after_minutes: number;
  notify_start: boolean;
  reminder_minutes: number | null;
};

export const overrideKey = (masterId: string, iso: string) =>
  `${masterId}@${new Date(iso).toISOString()}`;

/**
 * Expand one recurring master into sweep occurrences whose actual time falls
 * in [fromMs, toMs]. Cancelled overrides are dropped; moved ones keep the
 * original key but use the override's starts_at as their time. Thresholds,
 * notify_start and reminder come from the master (overrides don't carry
 * their own — same as the Today view).
 */
export function expandMasterForSweep(
  m: MasterLike,
  overrides: OverrideLike[],
  fromMs: number,
  toMs: number,
  tz: string,
): SweepOccurrence[] {
  const byKey = new Map<string, OverrideLike>();
  for (const o of overrides) {
    if (o.recurrence_parent_id !== m.id) continue;
    byKey.set(overrideKey(m.id, o.recurrence_override_at), o);
  }
  // Expand the original slots wide enough to catch occurrences moved in
  // either direction, then filter on the actual time.
  const occs = expandRecurrence(
    m,
    new Date(fromMs - MOVE_LOOKAHEAD_MS),
    new Date(toMs + MOVE_LOOKAHEAD_MS),
    tz,
  );
  const out: SweepOccurrence[] = [];
  for (const occ of occs) {
    const iso = occ.toISOString();
    const ov = byKey.get(`${m.id}@${iso}`);
    if (ov?.recurrence_cancelled) continue;
    const atMs = ov?.starts_at ? new Date(ov.starts_at).getTime() : occ.getTime();
    if (atMs < fromMs || atMs > toMs) continue;
    out.push({
      master_id: m.id,
      occurrence_at: iso,
      occurrence_ms: atMs,
      family_id: m.family_id,
      title: ov?.title ?? m.title,
      kind: ov?.kind ?? m.kind ?? null,
      late_after_minutes: m.late_after_minutes ?? 0,
      missed_after_minutes: m.missed_after_minutes ?? 15,
      notify_start: m.notify_start !== false,
      reminder_minutes: m.reminder_minutes ?? null,
    });
  }
  return out;
}

export function isStartDue(c: SweepOccurrence, nowMs: number, graceMinutes: number): boolean {
  if (!c.notify_start) return false;
  const diffMin = (nowMs - c.occurrence_ms) / 60_000;
  return diffMin >= 0 && diffMin <= graceMinutes;
}

export function isLateDue(c: SweepOccurrence, nowMs: number, hasCompletion: boolean): boolean {
  if (hasCompletion) return false;
  return shouldSendLatePush(c, nowMs);
}

export function isMissedDue(c: SweepOccurrence, nowMs: number, hasCompletion: boolean): boolean {
  if (hasCompletion) return false;
  return nowMs >= c.occurrence_ms + c.missed_after_minutes * 60_000;
}

export function isReminderDue(c: SweepOccurrence, nowMs: number, hasCompletion: boolean): boolean {
  if (!c.reminder_minutes || hasCompletion) return false;
  if (nowMs >= c.occurrence_ms) return false;
  return nowMs >= c.occurrence_ms - c.reminder_minutes * 60_000;
}

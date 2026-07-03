import { useEffect, useMemo, useState } from "react";
import { expandShifts, type ShiftRow } from "@/lib/data/shifts";

export interface HandoverDueItem {
  /** Time to surface the reminder (30 min before the shift ends). */
  at: Date;
  shiftStart: Date;
  shiftEnd: Date;
  /** Stable id for dismissal persistence. */
  dismissId: string;
}

/**
 * Returns at most ONE handover-due reminder for the current user within
 * [rangeStart, rangeEnd). Even if multiple caregivers share a shift, only
 * one handover report is needed, so we dedupe to the earliest upcoming one.
 */
export function useHandoverDueItem(
  shifts: ShiftRow[],
  userId: string | undefined,
  rangeStart: Date,
  rangeEnd: Date,
  dismissed: Set<string>,
  leadMinutes: number = 30,
  durationMinutes: number = 30,
): HandoverDueItem | null {
  return useMemo(() => {
    if (!userId) return null;
    const occs = expandShifts(shifts, rangeStart, rangeEnd);
    const now = new Date();
    const lead = Math.max(1, leadMinutes);
    const duration = Math.max(1, durationMinutes);
    const candidates: HandoverDueItem[] = [];
    for (const o of occs) {
      if (o.caregiverUserId !== userId) continue;
      const at = new Date(o.end.getTime() - lead * 60 * 1000);
      const until = new Date(at.getTime() + duration * 60 * 1000);
      if (until <= rangeStart || at >= rangeEnd) continue;
      if (until <= now) continue;
      const dismissId = `${o.masterId}:${o.start.getTime()}`;
      if (dismissed.has(dismissId)) continue;
      candidates.push({
        at,
        shiftStart: o.start,
        shiftEnd: o.end,
        dismissId,
      });
    }
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => a.at.getTime() - b.at.getTime());
    return candidates[0];
  }, [shifts, userId, rangeStart, rangeEnd, dismissed, leadMinutes, durationMinutes]);
}

export function useDismissedHandovers(userId: string | undefined) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (typeof window === "undefined" || !userId) return;
    try {
      const raw = window.localStorage.getItem(
        `carenest.handover-skipped.${userId}`,
      );
      if (raw) setDismissed(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
  }, [userId]);
  function dismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      if (typeof window !== "undefined" && userId) {
        try {
          window.localStorage.setItem(
            `carenest.handover-skipped.${userId}`,
            JSON.stringify([...next]),
          );
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  }
  return { dismissed, dismiss };
}

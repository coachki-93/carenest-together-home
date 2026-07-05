import { useEffect, useMemo, useState } from "react";
import type { HandoverTime } from "@/lib/data/handover-times";

export interface HandoverDueItem {
  /** When the reminder starts being visible (that specific clock time today). */
  at: Date;
  /** When it stops being visible (at + grace_minutes). */
  until: Date;
  /** Optional label from settings (e.g. "Night handover"). */
  label: string | null;
  /** Stable id for dismissal persistence. */
  dismissId: string;
}

/**
 * Returns at most ONE handover-due reminder within [rangeStart, rangeEnd),
 * based on the family's configured handover clock times. Mirrors the tidy
 * time model: each entry has a specific time-of-day and a grace duration
 * (how long the banner stays visible).
 */
export function useHandoverDueItem(
  times: HandoverTime[],
  dismissed: Set<string>,
  rangeStart: Date,
  rangeEnd: Date,
): HandoverDueItem | null {
  return useMemo(() => {
    if (!times.length) return null;
    const now = new Date();

    // Iterate every day in the range and expand each active time.
    const candidates: HandoverDueItem[] = [];
    const dayCursor = new Date(rangeStart);
    dayCursor.setHours(0, 0, 0, 0);
    const endDay = new Date(rangeEnd);
    endDay.setHours(0, 0, 0, 0);

    while (dayCursor <= endDay) {
      const y = dayCursor.getFullYear();
      const m = dayCursor.getMonth();
      const d = dayCursor.getDate();
      const dateIso = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

      for (const tm of times) {
        if (!tm.active) continue;
        const [hh, mm] = tm.time_of_day.split(":").map((n) => Number(n));
        if (Number.isNaN(hh) || Number.isNaN(mm)) continue;
        const at = new Date(y, m, d, hh, mm, 0, 0);
        const grace = Math.max(1, tm.grace_minutes ?? 30);
        const until = new Date(at.getTime() + grace * 60 * 1000);
        if (until <= rangeStart || at >= rangeEnd) continue;
        // Only visible between `at` and `until` (grace window).
        if (now < at || now >= until) continue;
        const dismissId = `${tm.id}:${dateIso}`;
        if (dismissed.has(dismissId)) continue;
        candidates.push({ at, until, label: tm.label, dismissId });
      }

      dayCursor.setDate(dayCursor.getDate() + 1);
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => a.at.getTime() - b.at.getTime());
    return candidates[0];
  }, [times, dismissed, rangeStart, rangeEnd]);
}

/**
 * Persist per-caregiver handover-reminder dismissals.
 *
 * Keyed by (familyId, caregiverProfileId ?? userId) so that on a shared
 * account (e.g. municipal staff signed in as "Kommun" with multiple
 * caregiver profiles) one caregiver dismissing the banner does not hide it
 * for the next caregiver on the same account. When no profile is selected
 * or the account only has one profile, we fall back to userId — behaves
 * identically to the previous single-key implementation.
 *
 * A previously-stored dismissal under the old `carenest.handover-skipped.{userId}`
 * key is intentionally not migrated; a reminder re-appearing once after this
 * change is acceptable.
 */
export function useDismissedHandovers(
  userId: string | undefined,
  familyId?: string | null,
  caregiverProfileId?: string | null,
) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const storageKey =
    userId && familyId
      ? `carenest.handover-skipped.${familyId}.${caregiverProfileId ?? userId}`
      : userId
        ? `carenest.handover-skipped.${userId}`
        : null;
  useEffect(() => {
    if (typeof window === "undefined" || !storageKey) {
      setDismissed(new Set());
      return;
    }
    try {
      const raw = window.localStorage.getItem(storageKey);
      setDismissed(raw ? new Set(JSON.parse(raw) as string[]) : new Set());
    } catch {
      setDismissed(new Set());
    }
  }, [storageKey]);
  function dismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      if (typeof window !== "undefined" && storageKey) {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify([...next]));
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  }
  return { dismissed, dismiss };
}

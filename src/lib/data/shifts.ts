import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ShiftRow = Database["public"]["Tables"]["caregiver_shifts"]["Row"];
export type ShiftInsert = Database["public"]["Tables"]["caregiver_shifts"]["Insert"];
export type ShiftUpdate = Database["public"]["Tables"]["caregiver_shifts"]["Update"];

export interface ShiftOccurrence {
  id: string;
  masterId: string;
  caregiverUserId: string;
  caregiverProfileId: string | null;
  start: Date;
  end: Date;
  color: string | null;
  category: string | null;
  recurring: boolean;
}

export function useShifts(familyId: string | undefined | null) {
  return useQuery({
    queryKey: ["caregiver-shifts", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caregiver_shifts")
        .select("*")
        .eq("family_id", familyId!)
        .order("start_at", { ascending: true });
      if (error) throw error;
      return data as ShiftRow[];
    },
  });
}

export function useCreateShift() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true }, // safe: all callers try/catch mutateAsync or set per-call onError (audited 2026-07-19)
    mutationFn: async (input: ShiftInsert) => {
      const { data, error } = await supabase
        .from("caregiver_shifts")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as ShiftRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["caregiver-shifts"] }),
  });
}

export function useUpdateShift() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true }, // safe: all callers try/catch mutateAsync or set per-call onError (audited 2026-07-19)
    mutationFn: async ({ id, patch }: { id: string; patch: ShiftUpdate }) => {
      const { data, error } = await supabase
        .from("caregiver_shifts")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as ShiftRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["caregiver-shifts"] }),
  });
}

export function useDeleteShift() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true }, // safe: all callers try/catch mutateAsync or set per-call onError (audited 2026-07-19)
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("caregiver_shifts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["caregiver-shifts"] }),
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

/**
 * Expand recurring shifts into concrete occurrences in [rangeStart, rangeEnd).
 */
export function expandShifts(
  shifts: ShiftRow[],
  rangeStart: Date,
  rangeEnd: Date,
): ShiftOccurrence[] {
  const out: ShiftOccurrence[] = [];
  for (const s of shifts) {
    const start = new Date(s.start_at);
    const end = new Date(s.end_at);
    const durationMs = end.getTime() - start.getTime();
    const freq = s.recurrence_freq;
    const interval = Math.max(1, s.recurrence_interval ?? 1);
    const until = s.recurrence_until ? new Date(s.recurrence_until) : null;

    if (!freq) {
      if (end > rangeStart && start < rangeEnd) {
        out.push({
          id: s.id,
          masterId: s.id,
          caregiverUserId: s.caregiver_user_id,
            caregiverProfileId: s.caregiver_profile_id,
          start,
          end,
          color: s.color,
          category: s.category,
          recurring: false,
        });
      }
      continue;
    }

    // Walk day-by-day from the master start to rangeEnd (capped by until).
    const hardStop = until && until < rangeEnd ? until : rangeEnd;
    // Optimisation: jump forward to rangeStart if master is far in the past.
    let cursor = new Date(start);
    if (freq === "daily") {
      if (cursor < rangeStart) {
        const daysDiff = Math.floor((rangeStart.getTime() - cursor.getTime()) / DAY_MS);
        const skip = Math.floor(daysDiff / interval) * interval;
        cursor = addDays(cursor, skip);
      }
      while (cursor < hardStop) {
        const occEnd = new Date(cursor.getTime() + durationMs);
        if (occEnd > rangeStart) {
          out.push({
            id: `${s.id}:${cursor.getTime()}`,
            masterId: s.id,
            caregiverUserId: s.caregiver_user_id,
            caregiverProfileId: s.caregiver_profile_id,
            start: new Date(cursor),
            end: occEnd,
            color: s.color,
            category: s.category,
            recurring: true,
          });
        }
        cursor = addDays(cursor, interval);
      }
    } else if (freq === "weekly") {
      const days =
        s.recurrence_days_of_week && s.recurrence_days_of_week.length > 0
          ? s.recurrence_days_of_week
          : [start.getDay()];
      // Walk week-by-week starting from the master week containing start.
      // We anchor on the Sunday of the start's week, then advance by interval weeks.
      const anchor = addDays(start, -start.getDay()); // Sunday of master week
      let weekStart = new Date(anchor);
      if (weekStart < rangeStart) {
        const weeksDiff = Math.floor(
          (rangeStart.getTime() - weekStart.getTime()) / (7 * DAY_MS),
        );
        const skip = Math.floor(weeksDiff / interval) * interval;
        weekStart = addDays(weekStart, skip * 7);
      }
      while (weekStart < hardStop) {
        for (const dow of days) {
          const occStart = new Date(weekStart);
          occStart.setDate(occStart.getDate() + dow);
          occStart.setHours(start.getHours(), start.getMinutes(), 0, 0);
          if (occStart < start) continue;
          if (occStart >= hardStop) continue;
          const occEnd = new Date(occStart.getTime() + durationMs);
          if (occEnd > rangeStart && occStart < rangeEnd) {
            out.push({
              id: `${s.id}:${occStart.getTime()}`,
              masterId: s.id,
              caregiverUserId: s.caregiver_user_id,
            caregiverProfileId: s.caregiver_profile_id,
              start: occStart,
              end: occEnd,
              color: s.color,
              category: s.category,
              recurring: true,
            });
          }
        }
        weekStart = addDays(weekStart, 7 * interval);
      }
    }
  }
  return out;
}

export function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  r.setDate(r.getDate() - r.getDay()); // Sunday start
  return r;
}

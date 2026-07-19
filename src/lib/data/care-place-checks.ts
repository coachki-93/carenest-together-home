import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { adjustInventory } from "./inventory";
import { notifyCriticalNo } from "./care-place-notify.functions";

export type CarePlaceItem =
  Database["public"]["Tables"]["care_place_checklist_items"]["Row"];
export type CarePlaceItemInsert =
  Database["public"]["Tables"]["care_place_checklist_items"]["Insert"];
export type CarePlaceTime =
  Database["public"]["Tables"]["care_place_check_times"]["Row"];
export type CarePlaceTimeInsert =
  Database["public"]["Tables"]["care_place_check_times"]["Insert"];
export type CarePlaceCheck =
  Database["public"]["Tables"]["care_place_checks"]["Row"];
export type CarePlaceAnswer =
  Database["public"]["Tables"]["care_place_check_answers"]["Row"];
export type CarePlaceItemType =
  Database["public"]["Enums"]["care_place_item_type"];

export function useCarePlaceItems(familyId: string | undefined | null) {
  return useQuery({
    queryKey: ["care-place-items", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("care_place_checklist_items")
        .select("*")
        .eq("family_id", familyId!)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as CarePlaceItem[];
    },
  });
}

export function useCarePlaceTimes(familyId: string | undefined | null) {
  return useQuery({
    queryKey: ["care-place-times", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("care_place_check_times")
        .select("*")
        .eq("family_id", familyId!)
        .order("time_of_day", { ascending: true });
      if (error) throw error;
      return data as CarePlaceTime[];
    },
  });
}

function toDateString(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function useTodayCarePlaceChecks(familyId: string | undefined | null) {
  const today = toDateString(new Date());
  return useQuery({
    queryKey: ["care-place-checks-today", familyId, today],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("care_place_checks")
        .select("*")
        .eq("family_id", familyId!)
        .eq("scheduled_date", today);
      if (error) throw error;
      return data as CarePlaceCheck[];
    },
  });
}

export function useCarePlaceCheckHistory(
  familyId: string | undefined | null,
  limit = 50,
) {
  return useQuery({
    queryKey: ["care-place-check-history", familyId, limit],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("care_place_checks")
        .select("*, answers:care_place_check_answers(*)")
        .eq("family_id", familyId!)
        .order("performed_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as (CarePlaceCheck & { answers: CarePlaceAnswer[] })[];
    },
  });
}

export const CARE_PLACE_WINDOW_MIN = 30;

/** Returns active slots for today whose window [slotTime, slotTime+30min] contains `now` and that are not yet completed. */
export function pendingSlots(
  times: CarePlaceTime[],
  todaysChecks: CarePlaceCheck[],
  now: Date,
): CarePlaceTime[] {
  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const done = new Set(
    todaysChecks.map((c) => c.scheduled_time.slice(0, 5)), // "HH:MM"
  );
  return times
    .filter((t) => t.active)
    .filter((t) => {
      const [h, m] = t.time_of_day.split(":").map(Number);
      const slotMin = h * 60 + m;
      if (nowMin < slotMin) return false;
      if (nowMin > slotMin + CARE_PLACE_WINDOW_MIN) return false;
      const key = t.time_of_day.slice(0, 5);
      return !done.has(key);
    })
    .sort((a, b) => a.time_of_day.localeCompare(b.time_of_day));
}

/** Seconds remaining in the 30-minute window for a slot. Negative if past. */
export function slotSecondsRemaining(slot: CarePlaceTime, now: Date): number {
  const [h, m] = slot.time_of_day.split(":").map(Number);
  const end = new Date(now);
  end.setHours(h, m + CARE_PLACE_WINDOW_MIN, 0, 0);
  return Math.floor((end.getTime() - now.getTime()) / 1000);
}

export type QuantityEstimate = "mycket" | "lite" | "slut";

export interface SubmitCheckInput {
  family_id: string;
  performed_by: string;
  caregiver_profile_id?: string | null;
  scheduled_time: string; // HH:MM:SS
  scheduled_date: string; // YYYY-MM-DD
  notes?: string | null;
  answers: {
    item_id: string;
    item_label_snapshot: string;
    item_type_snapshot: CarePlaceItemType;
    yesno_value?: boolean | null;
    count_value?: number | null;
    /** For quantity_estimate questions. */
    estimate_value?: QuantityEstimate | null;
    /** Min count for count questions (drives smarter decrement). */
    min_count_snapshot?: number | null;
    /** Linked inventory item to act on. */
    inventory_item_id?: string | null;
    /** Amount to decrement on usage. Defaults to 1. */
    decrement_amount?: number | null;
    /** Severity of the question — drives critical push notifications. */
    severity?: "routine" | "critical";
    /** Days-left threshold snapshot — answers ≤ this trigger a critical push. */
    days_left_threshold_snapshot?: number | null;
  }[];
}

export function useSubmitCarePlaceCheck() {
  const qc = useQueryClient();
  const notifyCritical = useServerFn(notifyCriticalNo);
  return useMutation({
    meta: { suppressGlobalError: true }, // safe: all callers try/catch mutateAsync or set per-call onError (audited 2026-07-19)
    mutationFn: async (input: SubmitCheckInput) => {
      const { data: check, error } = await supabase
        .from("care_place_checks")
        .insert({
          family_id: input.family_id,
          performed_by: input.performed_by,
          caregiver_profile_id: input.caregiver_profile_id ?? null,
          scheduled_date: input.scheduled_date,
          scheduled_time: input.scheduled_time,
          notes: input.notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      if (input.answers.length) {
        const { error: aerr } = await supabase
          .from("care_place_check_answers")
          .insert(
            input.answers.map((a) => ({
              check_id: check.id,
              family_id: input.family_id,
              item_id: a.item_id,
              item_label_snapshot: a.item_label_snapshot,
              item_type_snapshot: a.item_type_snapshot,
              yesno_value: a.yesno_value ?? null,
              count_value: a.count_value ?? null,
            })),
          );
        if (aerr) throw aerr;
      }

      // Side-effects on linked inventory.
      for (const a of input.answers) {
        if (!a.inventory_item_id) continue;
        try {
          if (a.item_type_snapshot === "yesno" && a.yesno_value === false) {
            const amount = Math.max(1, Number(a.decrement_amount ?? 1));
            await adjustInventory({
              itemId: a.inventory_item_id,
              familyId: input.family_id,
              performedBy: input.performed_by,
              delta: -amount,
              reason: "care_place_check",
              note: a.item_label_snapshot,
              sourceCheckId: check.id,
            });
          } else if (a.item_type_snapshot === "count" && a.yesno_value === false) {
            // 3B: smarter decrement = max(decrement_amount, min_count - reported_count).
            const baseDec = Math.max(1, Number(a.decrement_amount ?? 1));
            const reported = Number(a.count_value ?? 0);
            const min = Number(a.min_count_snapshot ?? 0);
            const gap = min > reported ? min - reported : 0;
            const amount = Math.max(baseDec, gap);
            await adjustInventory({
              itemId: a.inventory_item_id,
              familyId: input.family_id,
              performedBy: input.performed_by,
              delta: -amount,
              reason: "care_place_check",
              note: a.item_label_snapshot,
              sourceCheckId: check.id,
            });
          } else if (a.item_type_snapshot === "days_left" && a.count_value != null) {
            // Update the days-left estimate on the linked item, write an audit row.
            await supabase
              .from("inventory_items")
              .update({
                days_left_estimate: Number(a.count_value),
                days_left_updated_at: new Date().toISOString(),
              })
              .eq("id", a.inventory_item_id);
            await supabase.from("inventory_adjustments").insert({
              family_id: input.family_id,
              inventory_item_id: a.inventory_item_id,
              delta: 0,
              reason: "days_left_update",
              note: `${a.item_label_snapshot}: ~${a.count_value}d`,
              performed_by: input.performed_by,
              source_check_id: check.id,
            });
          } else if (a.item_type_snapshot === "quantity_estimate" && a.estimate_value) {
            if (a.estimate_value === "lite") {
              const amount = Math.max(1, Number(a.decrement_amount ?? 1));
              await adjustInventory({
                itemId: a.inventory_item_id,
                familyId: input.family_id,
                performedBy: input.performed_by,
                delta: -amount,
                reason: "care_place_check",
                note: `${a.item_label_snapshot} (lite)`,
                sourceCheckId: check.id,
              });
            } else if (a.estimate_value === "slut") {
              // Drain to zero — adjustInventory clamps at 0 and logs the real delta.
              await adjustInventory({
                itemId: a.inventory_item_id,
                familyId: input.family_id,
                performedBy: input.performed_by,
                delta: -1_000_000,
                reason: "care_place_check",
                note: `${a.item_label_snapshot} (slut)`,
                sourceCheckId: check.id,
              });
            }
          }
        } catch (e) {
          console.error("Inventory side-effect failed", e);
        }
      }

      // Critical push: classic "No", "Slut", or days_left ≤ per-question threshold.
      const criticalNos = input.answers
        .filter((a) => {
          if (a.severity !== "critical") return false;
          if (a.yesno_value === false) return true;
          if (a.estimate_value === "slut") return true;
          if (a.item_type_snapshot === "days_left") {
            const threshold = Number(a.days_left_threshold_snapshot ?? 2);
            if (Number(a.count_value ?? 99) <= threshold) return true;
          }
          return false;
        })
        .map((a) => a.item_label_snapshot);
      if (criticalNos.length > 0) {
        try {
          await notifyCritical({
            data: {
              family_id: input.family_id,
              scheduled_time: input.scheduled_time,
              items: criticalNos,
            },
          });
        } catch (e) {
          console.error("Critical-no push failed", e);
        }
      }
      return check as CarePlaceCheck;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["care-place-checks-today"] });
      qc.invalidateQueries({ queryKey: ["care-place-check-history"] });
      qc.invalidateQueries({ queryKey: ["inventory-items"] });
      qc.invalidateQueries({ queryKey: ["inventory-history"] });
      qc.invalidateQueries({ queryKey: ["inventory-activity"] });
    },
  });
}

export function useUpsertCarePlaceItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CarePlaceItemInsert & { id?: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase
          .from("care_place_checklist_items")
          .update(rest)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("care_place_checklist_items")
          .insert(input);
        if (error) throw error;
      }
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["care-place-items"] }),
  });
}

export function useDeleteCarePlaceItem() {
  const qc = useQueryClient();
  return useMutation({
      const { error } = await supabase
        .from("care_place_checklist_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["care-place-items"] }),
  });
}

export function useUpsertCarePlaceTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CarePlaceTimeInsert & { id?: string }) => {
        const { id, ...rest } = input;
        const { error } = await supabase
          .from("care_place_check_times")
          .update(rest)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("care_place_check_times")
          .insert(input);
        if (error) throw error;
      }
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["care-place-times"] }),
  });
}

export function useDeleteCarePlaceTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["care-place-times"] }),
  });
}

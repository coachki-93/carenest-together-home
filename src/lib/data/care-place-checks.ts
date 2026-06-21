import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

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

/** Returns time strings (HH:MM) for slots today that have already started and are not yet completed. */
export function pendingSlots(
  times: CarePlaceTime[],
  todaysChecks: CarePlaceCheck[],
  now: Date,
): CarePlaceTime[] {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const done = new Set(
    todaysChecks.map((c) => c.scheduled_time.slice(0, 5)), // "HH:MM"
  );
  return times
    .filter((t) => t.active)
    .filter((t) => {
      const [h, m] = t.time_of_day.split(":").map(Number);
      const slotMin = h * 60 + m;
      if (slotMin > nowMin) return false;
      const key = t.time_of_day.slice(0, 5);
      return !done.has(key);
    })
    .sort((a, b) => a.time_of_day.localeCompare(b.time_of_day));
}

export interface SubmitCheckInput {
  family_id: string;
  performed_by: string;
  scheduled_time: string; // HH:MM:SS
  scheduled_date: string; // YYYY-MM-DD
  notes?: string | null;
  answers: {
    item_id: string;
    item_label_snapshot: string;
    item_type_snapshot: CarePlaceItemType;
    yesno_value?: boolean | null;
    count_value?: number | null;
  }[];
}

export function useSubmitCarePlaceCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitCheckInput) => {
      const { data: check, error } = await supabase
        .from("care_place_checks")
        .insert({
          family_id: input.family_id,
          performed_by: input.performed_by,
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
      return check as CarePlaceCheck;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["care-place-checks-today"] });
      qc.invalidateQueries({ queryKey: ["care-place-check-history"] });
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
    mutationFn: async (id: string) => {
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
      if (input.id) {
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
        .from("care_place_check_times")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["care-place-times"] }),
  });
}

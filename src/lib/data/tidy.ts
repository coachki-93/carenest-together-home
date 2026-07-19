import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type TidySettings = Database["public"]["Tables"]["tidy_settings"]["Row"];
export type TidyItem = Database["public"]["Tables"]["tidy_checklist_items"]["Row"];
export type TidyItemInsert =
  Database["public"]["Tables"]["tidy_checklist_items"]["Insert"];
export type TidyTime = Database["public"]["Tables"]["tidy_times"]["Row"];
export type TidyTimeInsert =
  Database["public"]["Tables"]["tidy_times"]["Insert"];
export type TidySubmission =
  Database["public"]["Tables"]["tidy_submissions"]["Row"];

export type TidyStatus = "done" | "skipped";

export function useTidySettings(familyId: string | undefined | null) {
  return useQuery({
    queryKey: ["tidy-settings", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tidy_settings")
        .select("*")
        .eq("family_id", familyId!)
        .maybeSingle();
      if (error) throw error;
      return data as TidySettings | null;
    },
  });
}

export function useUpsertTidySettings() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (input: { family_id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("tidy_settings")
        .upsert(input, { onConflict: "family_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tidy-settings"] }),
  });
}

export function useTidyItems(familyId: string | undefined | null) {
  return useQuery({
    queryKey: ["tidy-items", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tidy_checklist_items")
        .select("*")
        .eq("family_id", familyId!)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as TidyItem[];
    },
  });
}

export function useUpsertTidyItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TidyItemInsert & { id?: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase
          .from("tidy_checklist_items")
          .update(rest)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("tidy_checklist_items")
          .insert(input);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tidy-items"] }),
  });
}

export function useDeleteTidyItem() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
      const { error } = await supabase
        .from("tidy_checklist_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tidy-items"] }),
  });
}

/* -------- Tidy times -------- */

export function useTidyTimes(familyId: string | undefined | null) {
  return useQuery({
    queryKey: ["tidy-times", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tidy_times")
        .select("*")
        .eq("family_id", familyId!)
        .order("time_of_day", { ascending: true });
      if (error) throw error;
      return data as TidyTime[];
    },
  });
}

export function useUpsertTidyTime() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (input: TidyTimeInsert & { id?: string }) => {
        const { id, ...rest } = input;
        const { error } = await supabase
          .from("tidy_times")
          .update(rest)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tidy_times").insert(input);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tidy-times"] }),
  });
}

export function useDeleteTidyTime() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tidy_times").delete().eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tidy-times"] }),
  });
}

/* -------- Submissions -------- */

export interface SubmitTidyInput {
  family_id: string;
  performed_by: string;
  tidy_time_id: string;
  slot_date: string; // YYYY-MM-DD
  slot_time: string; // HH:MM:SS
  notes?: string | null;
  answers: {
    item_id: string;
    item_label_snapshot: string;
    status: TidyStatus;
    note?: string | null;
  }[];
}

export function useSubmitTidy() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (input: SubmitTidyInput) => {
      const { data: sub, error } = await supabase
        .from("tidy_submissions")
        .insert({
          family_id: input.family_id,
          performed_by: input.performed_by,
          tidy_time_id: input.tidy_time_id,
          slot_date: input.slot_date,
          slot_time: input.slot_time,
          notes: input.notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      if (input.answers.length) {
        const { error: aerr } = await supabase
          .from("tidy_submission_answers")
          .insert(
            input.answers.map((a) => ({
              submission_id: sub.id,
              family_id: input.family_id,
              item_id: a.item_id,
              item_label_snapshot: a.item_label_snapshot,
              status: a.status,
              note: a.note ?? null,
            })),
          );
        if (aerr) throw aerr;
      }
      return sub as TidySubmission;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tidy-submissions"] });
    },
  });
}

/** Today's tidy submissions for the family, keyed by slot. */
export function useTodayTidySubmissions(familyId: string | undefined | null) {
  return useQuery({
    queryKey: ["tidy-submissions", "today", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, "0");
      const d = String(today.getDate()).padStart(2, "0");
      const iso = `${y}-${m}-${d}`;
      const { data, error } = await supabase
        .from("tidy_submissions")
        .select("*")
        .eq("family_id", familyId!)
        .eq("slot_date", iso);
      if (error) throw error;
      return data as TidySubmission[];
    },
  });
}

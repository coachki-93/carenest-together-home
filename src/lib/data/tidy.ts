import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type TidySettings = Database["public"]["Tables"]["tidy_settings"]["Row"];
export type TidyItem = Database["public"]["Tables"]["tidy_checklist_items"]["Row"];
export type TidyItemInsert =
  Database["public"]["Tables"]["tidy_checklist_items"]["Insert"];
export type TidySubmission =
  Database["public"]["Tables"]["tidy_submissions"]["Row"];
export type TidyAnswer =
  Database["public"]["Tables"]["tidy_submission_answers"]["Row"];

export type TidyStatus = "done" | "skipped";

export const TIDY_LEAD_OPTIONS = [15, 30, 45, 60] as const;

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
    mutationFn: async (input: {
      family_id: string;
      enabled: boolean;
      lead_minutes: number;
    }) => {
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
    mutationFn: async (
      input: (TidyItemInsert & { id?: string }),
    ) => {
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
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tidy_checklist_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tidy-items"] }),
  });
}

export interface SubmitTidyInput {
  family_id: string;
  performed_by: string;
  shift_master_id: string | null;
  shift_occurrence_start: string | null;
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
    mutationFn: async (input: SubmitTidyInput) => {
      const { data: sub, error } = await supabase
        .from("tidy_submissions")
        .insert({
          family_id: input.family_id,
          performed_by: input.performed_by,
          shift_master_id: input.shift_master_id,
          shift_occurrence_start: input.shift_occurrence_start,
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

/** Look up whether a tidy submission already exists for a given shift occurrence. */
export function useShiftTidySubmission(
  familyId: string | undefined | null,
  shiftMasterId: string | null | undefined,
  occurrenceStartIso: string | null | undefined,
) {
  return useQuery({
    queryKey: ["tidy-submissions", "shift", familyId, shiftMasterId, occurrenceStartIso],
    enabled: !!familyId && !!shiftMasterId && !!occurrenceStartIso,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tidy_submissions")
        .select("*")
        .eq("family_id", familyId!)
        .eq("shift_master_id", shiftMasterId!)
        .eq("shift_occurrence_start", occurrenceStartIso!)
        .maybeSingle();
      if (error) throw error;
      return data as TidySubmission | null;
    },
  });
}

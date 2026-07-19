import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Handover = Database["public"]["Tables"]["handovers"]["Row"];
export type HandoverInsert = Database["public"]["Tables"]["handovers"]["Insert"];
export type ShiftLabel = Database["public"]["Enums"]["shift_label"];

export const SHIFT_LABELS: ShiftLabel[] = ["morning", "afternoon", "night", "custom"];

export function useHandovers(familyId: string | undefined | null, limit = 20) {
  return useQuery({
    queryKey: ["handovers", familyId, limit],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handovers")
        .select("*")
        .eq("family_id", familyId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as Handover[];
    },
  });
}

export function useLatestHandover(familyId: string | undefined | null) {
  return useQuery({
    queryKey: ["handovers-latest", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handovers")
        .select("*")
        .eq("family_id", familyId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Handover | null;
    },
  });
}

export function useCreateHandover() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (input: HandoverInsert) => {
      const { data, error } = await supabase
        .from("handovers")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as Handover;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["handovers"] });
      qc.invalidateQueries({ queryKey: ["handovers-latest"] });
    },
  });
}

export function useDeleteHandover() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("handovers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["handovers"] });
      qc.invalidateQueries({ queryKey: ["handovers-latest"] });
    },
  });
}

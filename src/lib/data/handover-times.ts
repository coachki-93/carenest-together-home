import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type HandoverTime =
  Database["public"]["Tables"]["handover_times"]["Row"];
export type HandoverTimeInsert =
  Database["public"]["Tables"]["handover_times"]["Insert"];

export function useHandoverTimes(familyId: string | undefined | null) {
  return useQuery({
    queryKey: ["handover-times", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handover_times")
        .select("*")
        .eq("family_id", familyId!)
        .order("time_of_day", { ascending: true });
      if (error) throw error;
      return data as HandoverTime[];
    },
  });
}

export function useUpsertHandoverTime() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (input: HandoverTimeInsert & { id?: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase
          .from("handover_times")
          .update(rest)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("handover_times").insert(input);
        if (error) throw error;
      }
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["handover-times"] }),
  });
}

export function useDeleteHandoverTime() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("handover_times")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["handover-times"] }),
  });
}

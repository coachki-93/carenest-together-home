import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EmergencyStepSeverity = "critical" | "monitor" | "info";

export interface EmergencyStep {
  id: string;
  family_id: string;
  position: number;
  title: string;
  description: string | null;
  severity: EmergencyStepSeverity;
  created_at: string;
  updated_at: string;
}

const table = () => supabase.from("emergency_steps");

export function useEmergencySteps(familyId: string | null | undefined) {
  return useQuery({
    queryKey: ["emergency-steps", familyId],
    enabled: !!familyId,
    queryFn: async (): Promise<EmergencyStep[]> => {
      const { data, error } = await table()
        .select("*")
        .eq("family_id", familyId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EmergencyStep[];
    },
  });
}

export function useSaveEmergencyStep() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (
      input: Partial<EmergencyStep> & { family_id: string; title: string },
    ) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await table().update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await table().insert(input);
        if (error) throw error;
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["emergency-steps", vars.family_id] });
    },
  });
}

export function useDeleteEmergencyStep(familyId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (id: string) => {
      const { error } = await table().delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emergency-steps", familyId] });
    },
  });
}

export function useReorderEmergencySteps(familyId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (ordered: { id: string; position: number }[]) => {
      // Update sequentially to keep RLS-friendly single-row writes.
      for (const row of ordered) {
        const { error } = await table()
          .update({ position: row.position })
          .eq("id", row.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emergency-steps", familyId] });
    },
  });
}

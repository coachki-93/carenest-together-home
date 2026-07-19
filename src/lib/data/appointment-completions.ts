import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppointmentCompletion =
  Database["public"]["Tables"]["appointment_completions"]["Row"];
export type AppointmentCompletionStatus =
  Database["public"]["Enums"]["appointment_completion_status"];

/** Read completions in [start, end). */
export function useAppointmentCompletions(
  familyId: string | undefined | null,
  start: Date,
  end: Date,
) {
  return useQuery({
    queryKey: [
      "appointment-completions",
      familyId,
      start.toISOString(),
      end.toISOString(),
    ],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_completions")
        .select("*")
        .eq("family_id", familyId!)
        .gte("occurrence_at", start.toISOString())
        .lt("occurrence_at", end.toISOString());
      if (error) throw error;
      return data as AppointmentCompletion[];
    },
  });
}

export function useLogAppointmentCompletion() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (input: {
      family_id: string;
      appointment_id: string;
      occurrence_at: string;
      status: AppointmentCompletionStatus;
      completed_by?: string | null;
      caregiver_profile_id?: string | null;
      reason?: string | null;
      postponed_to?: string | null;
      notes?: string | null;
      ongoing_started_at?: string | null;
      ongoing_started_by?: string | null;
      timer_started_at?: string | null;
      timer_started_by?: string | null;
    }) => {
      const payload = {
        ...input,
        completed_at: input.status === "done" ? new Date().toISOString() : null,
      };
      const { data, error } = await supabase
        .from("appointment_completions")
        .upsert(payload as never, { onConflict: "appointment_id,occurrence_at" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["appointment-completions"] }),
  });
}

export function useDeleteAppointmentCompletion() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("appointment_completions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["appointment-completions"] }),
  });
}

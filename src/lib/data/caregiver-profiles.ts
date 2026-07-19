import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type CaregiverProfile = Database["public"]["Tables"]["caregiver_profiles"]["Row"];
export type CaregiverProfileInsert = Database["public"]["Tables"]["caregiver_profiles"]["Insert"];
export type CaregiverProfileUpdate = Database["public"]["Tables"]["caregiver_profiles"]["Update"];

export function useCaregiverProfiles(familyId: string | undefined | null) {
  return useQuery({
    queryKey: ["caregiver-profiles", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caregiver_profiles")
        .select("*")
        .eq("family_id", familyId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as CaregiverProfile[];
    },
  });
}

export function useMyCaregiverProfiles(
  familyId: string | undefined | null,
  userId: string | undefined | null,
) {
  const all = useCaregiverProfiles(familyId);
  return {
    ...all,
    data: (all.data ?? []).filter((p) => p.account_user_id === userId),
  };
}

export function useSaveCaregiverProfile() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (input: CaregiverProfileInsert & { id?: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { data, error } = await supabase
          .from("caregiver_profiles")
          .update(rest as CaregiverProfileUpdate)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("caregiver_profiles")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["caregiver-profiles"] }),
  });
}

export function useDeleteCaregiverProfile() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("caregiver_profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["caregiver-profiles"] }),
  });
}

/** Returns the caregiver_profile_id currently on shift (via DB helper), or null. */
export function useSuggestedCaregiverProfile(familyId: string | undefined | null) {
  return useQuery({
    queryKey: ["suggest-caregiver", familyId],
    enabled: !!familyId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("suggest_caregiver_profile", {
        _family_id: familyId!,
      });
      if (error) throw error;
      return (data as string | null) ?? null;
    },
  });
}

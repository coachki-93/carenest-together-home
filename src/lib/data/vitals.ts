import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Vital = Database["public"]["Tables"]["vitals"]["Row"];
export type VitalInsert = Database["public"]["Tables"]["vitals"]["Insert"];
export type VitalType = Database["public"]["Enums"]["vital_type"];

export const VITAL_TYPES: VitalType[] = [
  "heart_rate",
  "spo2",
  "temperature",
  "weight",
  "seizure",
  "fluids",
  "other",
];

export const DEFAULT_UNIT: Record<VitalType, string> = {
  heart_rate: "bpm",
  spo2: "%",
  temperature: "°C",
  weight: "kg",
  seizure: "min",
  fluids: "ml",
  other: "",
};

export function useVitals(
  familyId: string | undefined | null,
  opts?: { types?: VitalType[]; sinceHours?: number; limit?: number },
) {
  const sinceHours = opts?.sinceHours;
  return useQuery({
    // NOTE: do NOT put the computed `since` ISO string in the key — it
    // changes every render (Date.now ticks) and would cause React Query to
    // create a brand-new query every render, so data never reaches the
    // component. Key on the stable inputs instead.
    queryKey: ["vitals", familyId, opts?.types, sinceHours, opts?.limit],
    enabled: !!familyId,
    queryFn: async () => {
      const since = sinceHours
        ? new Date(Date.now() - sinceHours * 3600 * 1000).toISOString()
        : null;
      let q = supabase
        .from("vitals")
        .select("*")
        .eq("family_id", familyId!)
        .order("logged_at", { ascending: false });
      if (opts?.types?.length) q = q.in("vital_type", opts.types);
      if (since) q = q.gte("logged_at", since);
      if (opts?.limit) q = q.limit(opts.limit);
      const { data, error } = await q;
      if (error) throw error;
      return data as Vital[];
    },
  });
}

export function useLatestVitals(familyId: string | undefined | null) {
  return useQuery({
    queryKey: ["vitals-latest", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vitals")
        .select("*")
        .eq("family_id", familyId!)
        .order("logged_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const rows = data as Vital[];
      // Pick the most-recent row per type
      const map = new Map<VitalType, Vital>();
      for (const r of rows) {
        if (!map.has(r.vital_type)) map.set(r.vital_type, r);
      }
      return map;
    },
  });
}

export function useLogVital() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: VitalInsert) => {
      const { data, error } = await supabase
        .from("vitals")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as Vital;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vitals"] });
      qc.invalidateQueries({ queryKey: ["vitals-latest"] });
    },
  });
}

export function useDeleteVital() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vitals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vitals"] });
      qc.invalidateQueries({ queryKey: ["vitals-latest"] });
    },
  });
}

/** Healthy reference ranges (rough guidance — informational only). */
export const VITAL_RANGES: Partial<Record<VitalType, { low: number; high: number }>> = {
  heart_rate: { low: 60, high: 130 },
  spo2: { low: 94, high: 100 },
  temperature: { low: 36.0, high: 37.5 },
};

export function vitalStatus(type: VitalType, value: number): "low" | "ok" | "high" | "neutral" {
  const r = VITAL_RANGES[type];
  if (!r) return "neutral";
  if (value < r.low) return "low";
  if (value > r.high) return "high";
  return "ok";
}

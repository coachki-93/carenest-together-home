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
  "breathing",
  "other",
];

export const DEFAULT_UNIT: Record<VitalType, string> = {
  heart_rate: "bpm",
  spo2: "%",
  temperature: "°C",
  weight: "kg",
  seizure: "min",
  fluids: "ml",
  breathing: "br/min",
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

/** Optional context for a vital reading (explains out-of-range values). */
export const VITAL_CONTEXTS = [
  "awake",
  "sleeping",
  "crying",
  "fever",
  "pain",
  "exercising",
  "anxious",
  "other",
] as const;
export type VitalContext = (typeof VITAL_CONTEXTS)[number];

type Range = { low: number; high: number };
export type VitalRangeOverrides = Partial<Record<VitalType, Partial<Range>>>;

/** Default reference ranges when child age is unknown (rough guidance — informational only). */
export const VITAL_RANGES: Partial<Record<VitalType, Range>> = {
  heart_rate: { low: 60, high: 100 },
  spo2: { low: 95, high: 100 },
  temperature: { low: 36.0, high: 37.9 },
  breathing: { low: 12, high: 18 },
};

/**
 * Age-adjusted screening reference ranges, aligned with the practical
 * pediatric table. Pass `overrides` (from `children.custom_vital_ranges`) to
 * apply parent/owner-set custom values on top of the age default.
 */
export function getVitalRanges(
  ageMonths: number | null | undefined,
  overrides?: VitalRangeOverrides | null,
): Partial<Record<VitalType, Range>> {
  const spo2: Range = { low: 95, high: 100 };
  const temperature: Range = { low: 36.0, high: 37.9 };
  let base: Partial<Record<VitalType, Range>>;
  if (ageMonths == null || Number.isNaN(ageMonths)) {
    base = { ...VITAL_RANGES };
  } else {
    let heart_rate: Range;
    let breathing: Range;
    if (ageMonths < 3) {
      heart_rate = { low: 110, high: 160 };
      breathing = { low: 30, high: 60 };
    } else if (ageMonths < 6) {
      heart_rate = { low: 100, high: 150 };
      breathing = { low: 30, high: 45 };
    } else if (ageMonths < 12) {
      heart_rate = { low: 90, high: 130 };
      breathing = { low: 25, high: 40 };
    } else if (ageMonths < 36) {
      heart_rate = { low: 80, high: 125 };
      breathing = { low: 20, high: 30 };
    } else if (ageMonths < 72) {
      heart_rate = { low: 70, high: 115 };
      breathing = { low: 20, high: 25 };
    } else if (ageMonths < 144) {
      heart_rate = { low: 60, high: 100 };
      breathing = { low: 14, high: 22 };
    } else {
      heart_rate = { low: 60, high: 100 };
      breathing = { low: 12, high: 18 };
    }
    base = { heart_rate, spo2, temperature, breathing };
  }
  if (!overrides) return base;
  const merged: Partial<Record<VitalType, Range>> = { ...base };
  for (const k of Object.keys(overrides) as VitalType[]) {
    const ov = overrides[k];
    const cur = base[k];
    if (!ov) continue;
    const low = typeof ov.low === "number" ? ov.low : cur?.low;
    const high = typeof ov.high === "number" ? ov.high : cur?.high;
    if (typeof low === "number" && typeof high === "number") {
      merged[k] = { low, high };
    }
  }
  return merged;
}

/** Parse the JSON shape stored on `children.custom_vital_ranges`. */
export function parseRangeOverrides(value: unknown): VitalRangeOverrides {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: VitalRangeOverrides = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (!(VITAL_TYPES as string[]).includes(k)) continue;
    if (!v || typeof v !== "object") continue;
    const o = v as { low?: unknown; high?: unknown };
    const r: Partial<Range> = {};
    if (typeof o.low === "number" && Number.isFinite(o.low)) r.low = o.low;
    if (typeof o.high === "number" && Number.isFinite(o.high)) r.high = o.high;
    if (r.low != null || r.high != null) out[k as VitalType] = r;
  }
  return out;
}

export function ageMonthsFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  return (
    (now.getFullYear() - d.getFullYear()) * 12 +
    (now.getMonth() - d.getMonth()) +
    (now.getDate() < d.getDate() ? -1 : 0)
  );
}

export function vitalStatus(
  type: VitalType,
  value: number,
  ageMonths?: number | null,
  overrides?: VitalRangeOverrides | null,
): "low" | "ok" | "high" | "neutral" {
  const ranges =
    ageMonths !== undefined ? getVitalRanges(ageMonths, overrides) : VITAL_RANGES;
  const r = ranges[type];
  if (!r) return "neutral";
  if (value < r.low) return "low";
  if (value > r.high) return "high";
  return "ok";
}


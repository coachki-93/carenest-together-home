// Pure helpers extracted so server-fn modules can import them without
// pulling React Query / hooks from `vitals.ts` (and avoiding a circular
// import between `vitals.ts` and `vitals-streak.functions.ts`).
import type { Database } from "@/integrations/supabase/types";

export type VitalType = Database["public"]["Enums"]["vital_type"];

type Range = { low: number; high: number };
export type VitalRangeOverrides = Partial<Record<VitalType, Partial<Range>>>;

const VITAL_TYPE_VALUES: VitalType[] = [
  "heart_rate",
  "spo2",
  "temperature",
  "weight",
  "seizure",
  "fluids",
  "breathing",
  "other",
];

export const VITAL_RANGES: Partial<Record<VitalType, Range>> = {
  heart_rate: { low: 60, high: 100 },
  spo2: { low: 95, high: 100 },
  temperature: { low: 36.0, high: 37.9 },
  breathing: { low: 12, high: 18 },
};

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
    if (ageMonths < 3) { heart_rate = { low: 110, high: 160 }; breathing = { low: 30, high: 60 }; }
    else if (ageMonths < 6) { heart_rate = { low: 100, high: 150 }; breathing = { low: 30, high: 45 }; }
    else if (ageMonths < 12) { heart_rate = { low: 90, high: 130 }; breathing = { low: 25, high: 40 }; }
    else if (ageMonths < 36) { heart_rate = { low: 80, high: 125 }; breathing = { low: 20, high: 30 }; }
    else if (ageMonths < 72) { heart_rate = { low: 70, high: 115 }; breathing = { low: 20, high: 25 }; }
    else if (ageMonths < 144) { heart_rate = { low: 60, high: 100 }; breathing = { low: 14, high: 22 }; }
    else { heart_rate = { low: 60, high: 100 }; breathing = { low: 12, high: 18 }; }
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
    if (typeof low === "number" && typeof high === "number") merged[k] = { low, high };
  }
  return merged;
}

export function parseRangeOverrides(value: unknown): VitalRangeOverrides {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: VitalRangeOverrides = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (!VITAL_TYPE_VALUES.includes(k as VitalType)) continue;
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

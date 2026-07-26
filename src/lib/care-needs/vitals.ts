import { CARE_CAPABILITIES } from "./catalog";
import type { CareNeeds } from "./parse";
import { VITAL_TYPES, type VitalType } from "@/lib/data/vitals";

/**
 * Fallback when a child has no capabilities selected AND no explicit
 * `care_needs.vitals`. Keeps the /vitals page from being empty for
 * brand-new profiles.
 */
export const DEFAULT_VITALS: VitalType[] = [
  "heart_rate",
  "spo2",
  "temperature",
  "weight",
];

const VITAL_TYPE_SET = new Set<string>(VITAL_TYPES);

function orderCanonical(input: Iterable<string>): VitalType[] {
  const set = new Set<string>();
  for (const v of input) if (VITAL_TYPE_SET.has(v)) set.add(v);
  // Emit in VITAL_TYPES order so the render is stable regardless of source order.
  return VITAL_TYPES.filter((v) => set.has(v));
}

/**
 * Union of `impliedVitals` for the given capability keys. Deduped and
 * returned in canonical VITAL_TYPES order.
 */
export function deriveVitalsFromCapabilities(caps: string[]): VitalType[] {
  const selected = new Set(caps);
  const acc: string[] = [];
  for (const cap of CARE_CAPABILITIES) {
    if (!selected.has(cap.key) || !cap.impliedVitals) continue;
    for (const v of cap.impliedVitals) acc.push(v);
  }
  return orderCanonical(acc);
}

/**
 * The single source of truth for which vitals /vitals renders.
 *
 * Precedence:
 *   1. explicit `care_needs.vitals` (non-empty)  → user's locked-in choice
 *   2. derived from `capabilities` (non-empty)   → auto-suggested set
 *   3. DEFAULT_VITALS                            → never-empty fallback
 *
 * This is a PRESENTATION filter only. Historical readings for a hidden
 * vital are never removed and re-appear the moment it's toggled back on.
 */
export function visibleVitalsFor(careNeeds: CareNeeds): VitalType[] {
  if (careNeeds.vitals && careNeeds.vitals.length > 0) {
    const explicit = orderCanonical(careNeeds.vitals);
    if (explicit.length > 0) return explicit;
  }
  const derived = deriveVitalsFromCapabilities(careNeeds.capabilities);
  if (derived.length > 0) return derived;
  return [...DEFAULT_VITALS];
}

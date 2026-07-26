import { CARE_CAPABILITIES } from "./catalog";
import { parseCareNeeds } from "./parse";

/**
 * Presentation-layer module keys. A module represents a coherent care
 * surface (e.g. the oxygen tank countdown on Today + related handover
 * lines). Extended as later Phase 1c slices land.
 */
export type CareModuleKey = "oxygen";

/**
 * Does the child's care_needs (parsed or raw) imply this module?
 * Walks selected capabilities and unions their `impliedModules`.
 * Pure and deterministic.
 */
export function hasModule(careNeeds: unknown, moduleKey: CareModuleKey): boolean {
  const parsed = parseCareNeeds(careNeeds);
  const selected = new Set(parsed.capabilities);
  for (const cap of CARE_CAPABILITIES) {
    if (!selected.has(cap.key) || !cap.impliedModules) continue;
    if (cap.impliedModules.includes(moduleKey)) return true;
  }
  return false;
}

/** Set of modules implied by the child's selected capabilities. */
export function visibleModulesFor(careNeeds: unknown): CareModuleKey[] {
  const parsed = parseCareNeeds(careNeeds);
  const selected = new Set(parsed.capabilities);
  const out = new Set<CareModuleKey>();
  for (const cap of CARE_CAPABILITIES) {
    if (!selected.has(cap.key) || !cap.impliedModules) continue;
    for (const m of cap.impliedModules) out.add(m as CareModuleKey);
  }
  return [...out];
}

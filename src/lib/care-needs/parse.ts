/**
 * Shape stored on `children.care_needs`. Forward-compatible envelope —
 * Phase 1a writes `capabilities` (+ optional `capabilitiesOther`); later
 * phases extend `vitals` and `settings` without another migration.
 */
export interface CareNeeds {
  capabilities: string[];
  capabilitiesOther?: string;
  vitals?: string[];
  settings?: Record<string, unknown>;
}

/**
 * Safely parse `children.care_needs`. Null/undefined/malformed input yields
 * an empty-but-valid CareNeeds. Unknown top-level keys on the raw value are
 * dropped by the parser but should be preserved on save via merge — see
 * the child-profile save path.
 */
export function parseCareNeeds(raw: unknown): CareNeeds {
  const safe: CareNeeds = { capabilities: [] };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return safe;
  const r = raw as Record<string, unknown>;

  if (Array.isArray(r.capabilities)) {
    safe.capabilities = r.capabilities.filter(
      (k): k is string => typeof k === "string",
    );
  }
  if (typeof r.capabilitiesOther === "string") {
    safe.capabilitiesOther = r.capabilitiesOther;
  }
  if (Array.isArray(r.vitals)) {
    safe.vitals = r.vitals.filter((v): v is string => typeof v === "string");
  }
  if (r.settings && typeof r.settings === "object" && !Array.isArray(r.settings)) {
    safe.settings = r.settings as Record<string, unknown>;
  }
  return safe;
}

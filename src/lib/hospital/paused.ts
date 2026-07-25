/**
 * Hospital-mode pause selection.
 *
 * When a family is "at hospital" (families.at_hospital_since is set), the
 * owner can pick which categories to pause. The selection lives in
 * families.hospital_paused (jsonb).
 *
 * Categories:
 *   - oxygen      : oxygen low-tank pushes
 *   - care_place  : care-place-control missed-check pushes + dashboard banner
 *   - tasks       : appointment start/late/missed/reminder pushes
 *   - handover    : handover-due prompts (banner + row)
 *
 * Legacy default (when hospital_paused is NULL or an empty object): pause
 * oxygen + care_place only — matches behavior before N9 shipped.
 */

export type HospitalCategory = "oxygen" | "care_place" | "tasks" | "handover";

export const HOSPITAL_CATEGORIES: readonly HospitalCategory[] = [
  "oxygen",
  "care_place",
  "tasks",
  "handover",
] as const;

const LEGACY_DEFAULT: Record<HospitalCategory, boolean> = {
  oxygen: true,
  care_place: true,
  tasks: false,
  handover: false,
};

export interface HospitalPausedFamily {
  at_hospital_since: string | null | undefined;
  hospital_paused: unknown;
}

function selectionOf(
  raw: unknown,
): Record<HospitalCategory, boolean> | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  if (Object.keys(rec).length === 0) return null;
  return {
    oxygen: rec.oxygen === true,
    care_place: rec.care_place === true,
    tasks: rec.tasks === true,
    handover: rec.handover === true,
  };
}

export function isPaused(
  family: HospitalPausedFamily | null | undefined,
  category: HospitalCategory,
): boolean {
  if (!family?.at_hospital_since) return false;
  const sel = selectionOf(family.hospital_paused);
  if (!sel) return LEGACY_DEFAULT[category];
  return sel[category];
}

/**
 * Read the remembered selection for pre-filling the picker dialog. Falls
 * back to the legacy default when nothing is stored yet.
 */
export function pausedSelection(
  family: HospitalPausedFamily | null | undefined,
): Record<HospitalCategory, boolean> {
  const sel = selectionOf(family?.hospital_paused);
  return sel ?? { ...LEGACY_DEFAULT };
}

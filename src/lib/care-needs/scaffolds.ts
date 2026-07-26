/**
 * Phase 3 — Capability DEPTH via the scaffold pattern.
 *
 * For each capability, one or more "offers" — pre-filled starters the family
 * can accept to set up the routine, or dismiss/snooze. Content is starter,
 * not prescriptive; the family enters their clinician's actual regimen.
 *
 * The scaffold suggestion card groups offers by capability (one card per
 * capability). Persistence lives in `children.care_needs.settings.scaffolds`.
 */

export type ScaffoldEngine = "task" | "instruction";

/** A single routine offer belonging to a capability. */
export interface ScaffoldOffer {
  key: string; // e.g. "feed_task"
  engine: ScaffoldEngine;
  /** Resolves the pre-fill payload from i18n at run time. */
  templateKey: string;
}

export interface ScaffoldDefinition {
  capability: string;
  /** i18n subkey under `scaffolds.capabilities`. */
  i18nKey: string;
  offers: ScaffoldOffer[];
}

/** Slice 1 — Feeding. Slice 2 — Respiratory. */
export const SCAFFOLD_DEFINITIONS: ScaffoldDefinition[] = [
  {
    capability: "g_tube",
    i18nKey: "g_tube",
    offers: [
      { key: "feed_task", engine: "task", templateKey: "feed_task" },
      { key: "site_instruction", engine: "instruction", templateKey: "g_tube_site" },
    ],
  },
  {
    capability: "nj_tube",
    i18nKey: "nj_tube",
    offers: [
      { key: "feed_task", engine: "task", templateKey: "feed_task" },
      { key: "site_instruction", engine: "instruction", templateKey: "nj_tube_site" },
    ],
  },
  {
    capability: "tpn",
    i18nKey: "tpn",
    offers: [{ key: "line_instruction", engine: "instruction", templateKey: "tpn_line" }],
  },
  {
    capability: "oral_feeding_support",
    i18nKey: "oral_feeding_support",
    offers: [{ key: "mealtime_instruction", engine: "instruction", templateKey: "mealtime" }],
  },
  {
    capability: "special_diet",
    i18nKey: "special_diet",
    offers: [{ key: "diet_instruction", engine: "instruction", templateKey: "special_diet" }],
  },
  // ----- Respiratory (Slice 2) -----
  {
    capability: "tracheostomy",
    i18nKey: "tracheostomy",
    offers: [
      { key: "trach_instruction", engine: "instruction", templateKey: "trach_care" },
    ],
  },
  {
    capability: "ventilator",
    i18nKey: "ventilator",
    offers: [
      { key: "vent_instruction", engine: "instruction", templateKey: "vent_care" },
    ],
  },
  {
    capability: "cpap_bipap",
    i18nKey: "cpap_bipap",
    offers: [
      { key: "mask_instruction", engine: "instruction", templateKey: "mask_care" },
    ],
  },
  {
    capability: "suctioning",
    i18nKey: "suctioning",
    offers: [
      { key: "suction_instruction", engine: "instruction", templateKey: "suction_care" },
    ],
  },
  {
    capability: "inhalations",
    i18nKey: "inhalations",
    offers: [
      { key: "neb_task", engine: "task", templateKey: "neb_task" },
    ],
  },
  {
    capability: "cough_assist",
    i18nKey: "cough_assist",
    offers: [
      { key: "cough_instruction", engine: "instruction", templateKey: "cough_assist_care" },
    ],
  },
  // ----- Metabolic (Phase 4, Slice 1) -----
  {
    capability: "diabetes",
    i18nKey: "diabetes",
    offers: [
      { key: "glucose_task", engine: "task", templateKey: "glucose_task" },
      { key: "diabetes_instruction", engine: "instruction", templateKey: "diabetes_mgmt" },
    ],
  },
  {
    capability: "adrenal_insufficiency",
    i18nKey: "adrenal_insufficiency",
    offers: [
      { key: "adrenal_instruction", engine: "instruction", templateKey: "adrenal_sickday" },
    ],
  },
  {
    capability: "thyroid",
    i18nKey: "thyroid",
    offers: [
      { key: "thyroid_instruction", engine: "instruction", templateKey: "thyroid_meds" },
    ],
  },
  {
    capability: "metabolic_disorder",
    i18nKey: "metabolic_disorder",
    offers: [
      { key: "metabolic_instruction", engine: "instruction", templateKey: "metabolic_mgmt" },
    ],
  },
];

export function scaffoldFor(capability: string): ScaffoldDefinition | undefined {
  return SCAFFOLD_DEFINITIONS.find((d) => d.capability === capability);
}

/**
 * Task pre-fill payload passed to `useCreateAppointment`. Times/volumes are
 * intentionally empty — the family fills them in.
 */
export interface TaskTemplate {
  kind: "meal" | "task" | "medication";
  /** Localised default title, e.g. "Sondmatning". */
  titleFallback: string;
  /** Whether the family typically enters a volume for this offer. */
  hasAmountMl: boolean;
}

export function taskTemplateFor(templateKey: string): TaskTemplate {
  switch (templateKey) {
    case "feed_task":
      return { kind: "meal", titleFallback: "", hasAmountMl: true };
    case "neb_task":
      return { kind: "medication", titleFallback: "", hasAmountMl: false };
    case "glucose_task":
      return { kind: "task", titleFallback: "", hasAmountMl: false };
    default:
      return { kind: "task", titleFallback: "", hasAmountMl: false };
  }
}

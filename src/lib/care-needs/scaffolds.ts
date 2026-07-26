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

/** Slice 1 — Feeding. Respiratory arrives in Slice 2. */
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
    default:
      return { kind: "task", titleFallback: "", hasAmountMl: false };
  }
}

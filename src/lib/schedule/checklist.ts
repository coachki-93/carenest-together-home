/**
 * Task checklists. A checklist lives on the series master
 * (appointments.checklist); a completion stores a snapshot
 * (appointment_completions.checklist_result). NULL snapshot = no data,
 * never "unticked".
 */
export const CHECKLIST_MAX_STEPS = 20;
export const CHECKLIST_MAX_LABEL = 120;

export type ChecklistStep = { id: string; label: string };
export type ChecklistResultStep = ChecklistStep & { done: boolean };

/** Parse an unknown jsonb value into a clean checklist. */
export function parseChecklist(raw: unknown): ChecklistStep[] {
  if (!Array.isArray(raw)) return [];
  const out: ChecklistStep[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const { id, label } = r as { id?: unknown; label?: unknown };
    if (typeof id !== "string" || typeof label !== "string") continue;
    if (!label.trim()) continue;
    out.push({ id, label });
  }
  return out.slice(0, CHECKLIST_MAX_STEPS);
}

/** Parse a stored snapshot. Returns null when there is no snapshot. */
export function parseChecklistResult(raw: unknown): ChecklistResultStep[] | null {
  if (raw == null || !Array.isArray(raw)) return null;
  const out: ChecklistResultStep[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const { id, label, done } = r as { id?: unknown; label?: unknown; done?: unknown };
    if (typeof id !== "string" || typeof label !== "string") continue;
    out.push({ id, label, done: done === true });
  }
  return out;
}

/** Trim, drop blanks, cap length and count — what gets saved from the editor. */
export function cleanChecklist(steps: ChecklistStep[]): ChecklistStep[] {
  return steps
    .map((s) => ({ id: s.id, label: s.label.trim().slice(0, CHECKLIST_MAX_LABEL) }))
    .filter((s) => s.label.length > 0)
    .slice(0, CHECKLIST_MAX_STEPS);
}

export function buildChecklistResult(
  steps: ChecklistStep[],
  ticked: ReadonlySet<string>,
): ChecklistResultStep[] {
  return steps.map((s) => ({ id: s.id, label: s.label, done: ticked.has(s.id) }));
}

/** Labels of unticked steps in a snapshot. NULL snapshot → [] (no data). */
export function untickedLabels(raw: unknown): string[] {
  const res = parseChecklistResult(raw);
  if (!res) return [];
  return res.filter((s) => !s.done).map((s) => s.label);
}

export function sameChecklist(a: ChecklistStep[], b: ChecklistStep[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((s, i) => s.id === b[i].id && s.label === b[i].label);
}

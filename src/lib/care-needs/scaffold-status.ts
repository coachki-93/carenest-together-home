/**
 * Scaffold state lives in `children.care_needs.settings.scaffolds` — one
 * status per capability. Never re-nag: once dismissed or done, stays that
 * way even if the capability is toggled off and back on.
 */
import { parseCareNeeds, type CareNeeds } from "./parse";

export type ScaffoldStatus = "done" | "dismissed" | "snoozed";

export interface ScaffoldStateEntry {
  status: ScaffoldStatus;
  /** ISO timestamp — only meaningful when status === "snoozed". */
  until?: string;
}

/** Snooze window: 7 days. */
export const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

export type ScaffoldsMap = Record<string, ScaffoldStateEntry>;

export function readScaffoldsMap(careNeedsRaw: unknown): ScaffoldsMap {
  const parsed = parseCareNeeds(careNeedsRaw);
  const s = parsed.settings;
  if (!s || typeof s !== "object") return {};
  const raw = (s as Record<string, unknown>).scaffolds;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: ScaffoldsMap = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== "object") continue;
    const v = val as Record<string, unknown>;
    if (v.status === "done" || v.status === "dismissed" || v.status === "snoozed") {
      out[key] = {
        status: v.status,
        until: typeof v.until === "string" ? v.until : undefined,
      };
    }
  }
  return out;
}

/**
 * Should we show the card for this capability right now?
 * - No entry → yes.
 * - done / dismissed → no.
 * - snoozed → only if `until` is in the past (or missing).
 */
export function shouldShowScaffold(
  map: ScaffoldsMap,
  capability: string,
  now: Date = new Date(),
): boolean {
  const entry = map[capability];
  if (!entry) return true;
  if (entry.status === "done" || entry.status === "dismissed") return false;
  if (entry.status === "snoozed") {
    if (!entry.until) return true;
    const t = Date.parse(entry.until);
    return Number.isFinite(t) && t <= now.getTime();
  }
  return true;
}

/**
 * Merge a status update into the care_needs envelope, preserving unknown
 * top-level keys and unrelated settings.
 */
export function mergeScaffoldStatus(
  careNeedsRaw: unknown,
  capability: string,
  status: ScaffoldStatus,
  now: Date = new Date(),
): Record<string, unknown> {
  const base =
    careNeedsRaw && typeof careNeedsRaw === "object" && !Array.isArray(careNeedsRaw)
      ? (careNeedsRaw as Record<string, unknown>)
      : {};
  const settings =
    base.settings && typeof base.settings === "object" && !Array.isArray(base.settings)
      ? { ...(base.settings as Record<string, unknown>) }
      : {};
  const existing = readScaffoldsMap(careNeedsRaw);
  const nextEntry: ScaffoldStateEntry =
    status === "snoozed"
      ? { status, until: new Date(now.getTime() + SNOOZE_MS).toISOString() }
      : { status };
  const nextScaffolds: ScaffoldsMap = { ...existing, [capability]: nextEntry };
  settings.scaffolds = nextScaffolds;
  return { ...base, settings };
}

/** Reset all scaffold states — used by "Show setup suggestions again". */
export function clearAllScaffolds(careNeedsRaw: unknown): Record<string, unknown> {
  const base =
    careNeedsRaw && typeof careNeedsRaw === "object" && !Array.isArray(careNeedsRaw)
      ? (careNeedsRaw as Record<string, unknown>)
      : {};
  const settings =
    base.settings && typeof base.settings === "object" && !Array.isArray(base.settings)
      ? { ...(base.settings as Record<string, unknown>) }
      : {};
  delete settings.scaffolds;
  return { ...base, settings };
}

export type { CareNeeds };

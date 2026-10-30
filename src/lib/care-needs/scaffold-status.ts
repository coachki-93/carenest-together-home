/**
 * Scaffold state lives in `children.care_needs.settings.scaffolds` — one
 * status per capability. Never re-nag: once dismissed or done, stays that
 * way even if the capability is toggled off and back on.
 */
import { parseCareNeeds, type CareNeeds } from "./parse";

export type ScaffoldStatus = "done" | "dismissed" | "snoozed";

export type RoutinesStatus = "done" | "dismissed";

/**
 * Guided routine setup state, separate from `status` (which governs the
 * dashboard's instruction offers). `created` maps template key →
 * appointment id and survives "show suggestions again" so routines are
 * never created twice.
 */
export interface RoutinesState {
  status?: RoutinesStatus;
  created: Record<string, string>;
}

export interface ScaffoldStateEntry {
  /** Missing when only routines state exists for this capability. */
  status?: ScaffoldStatus;
  /** ISO timestamp — only meaningful when status === "snoozed". */
  until?: string;
  routines?: RoutinesState;
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
    const entry: ScaffoldStateEntry = {};
    if (v.status === "done" || v.status === "dismissed" || v.status === "snoozed") {
      entry.status = v.status;
      if (typeof v.until === "string") entry.until = v.until;
    }
    const routines = parseRoutines(v.routines);
    if (routines) entry.routines = routines;
    if (entry.status || entry.routines) out[key] = entry;
  }
  return out;
}

function parseRoutines(raw: unknown): RoutinesState | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  const created: Record<string, string> = {};
  if (r.created && typeof r.created === "object" && !Array.isArray(r.created)) {
    for (const [k, v] of Object.entries(r.created as Record<string, unknown>)) {
      if (typeof v === "string") created[k] = v;
    }
  }
  const status = r.status === "done" || r.status === "dismissed" ? r.status : undefined;
  return { status, created };
}

/** Routines state for a capability (empty if none). */
export function readRoutines(map: ScaffoldsMap, capability: string): RoutinesState {
  return map[capability]?.routines ?? { created: {} };
}

/** Template keys already created for this child, across all capabilities. */
export function allCreatedTemplateKeys(map: ScaffoldsMap): Set<string> {
  const out = new Set<string>();
  for (const e of Object.values(map)) for (const k of Object.keys(e.routines?.created ?? {})) out.add(k);
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
  const prev = existing[capability];
  const nextEntry: ScaffoldStateEntry =
    status === "snoozed"
      ? { status, until: new Date(now.getTime() + SNOOZE_MS).toISOString() }
      : { status };
  if (prev?.routines) nextEntry.routines = prev.routines;
  const nextScaffolds: ScaffoldsMap = { ...existing, [capability]: nextEntry };
  settings.scaffolds = nextScaffolds;
  return { ...base, settings };
}

function envelope(careNeedsRaw: unknown) {
  const base =
    careNeedsRaw && typeof careNeedsRaw === "object" && !Array.isArray(careNeedsRaw)
      ? (careNeedsRaw as Record<string, unknown>)
      : {};
  const settings =
    base.settings && typeof base.settings === "object" && !Array.isArray(base.settings)
      ? { ...(base.settings as Record<string, unknown>) }
      : {};
  return { base, settings };
}

/**
 * Record guided-routine results for several capabilities at once.
 * `created` is merged (never removed); `status` is set per capability.
 * The instruction-offer `status` is left untouched.
 */
export function mergeRoutinesState(
  careNeedsRaw: unknown,
  updates: Record<string, { status: RoutinesStatus; created?: Record<string, string> }>,
): Record<string, unknown> {
  const { base, settings } = envelope(careNeedsRaw);
  const map: ScaffoldsMap = { ...readScaffoldsMap(careNeedsRaw) };
  for (const [cap, u] of Object.entries(updates)) {
    const prev = map[cap] ?? {};
    const prevCreated = prev.routines?.created ?? {};
    map[cap] = {
      ...prev,
      routines: { status: u.status, created: { ...prevCreated, ...(u.created ?? {}) } },
    };
  }
  settings.scaffolds = map;
  return { ...base, settings };
}

/**
 * Reset all scaffold states — used by "Show setup suggestions again".
 * Keeps `routines.created` so routines are never duplicated.
 */
export function clearAllScaffolds(careNeedsRaw: unknown): Record<string, unknown> {
  const { base, settings } = envelope(careNeedsRaw);
  const kept: ScaffoldsMap = {};
  for (const [cap, e] of Object.entries(readScaffoldsMap(careNeedsRaw))) {
    const created = e.routines?.created ?? {};
    if (Object.keys(created).length > 0) kept[cap] = { routines: { created } };
  }
  if (Object.keys(kept).length > 0) settings.scaffolds = kept;
  else delete settings.scaffolds;
  return { ...base, settings };
}

export type { CareNeeds };

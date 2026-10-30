/**
 * Guided routine templates — suggested planner tasks per care need.
 * Content is a starter, never a prescription; families follow their care
 * team's plan. Titles/steps resolve from i18n under `routines.templates`.
 */
import type { AppointmentKind } from "@/lib/data/appointments";
import { wallClockIn, zonedWallClockToDate } from "@/lib/time/family-tz";
import type { ChecklistStep } from "@/lib/schedule/checklist";

export type RoutineFreq = "hourly" | "daily" | "weekly" | "monthly";

export interface RoutineTemplate {
  key: string;
  /** Needs this template belongs to. Shown once, under the first match. */
  capabilities: string[];
  target: "task" | "medication_link";
  kind: AppointmentKind;
  /** i18n key: routines.templates.<key>.title */
  titleKey: string;
  /** i18n keys: routines.templates.<key>.steps.<n> */
  stepKeys: string[];
  freq: RoutineFreq;
  interval: number;
  timesOfDay: string[];
  defaultSelected: boolean;
  requiresTimes: boolean;
  /** Replaces an old dashboard task offer → unticked if similar task exists. */
  replacesOffer?: boolean;
}

/** More than this many times per day → no START push, 60 min missed window. */
export const QUIET_TIMES_THRESHOLD = 3;

function tpl(
  key: string,
  capabilities: string[],
  freq: RoutineFreq,
  interval: number,
  timesOfDay: string[],
  defaultSelected: boolean,
  steps: number,
  extra: Partial<RoutineTemplate> = {},
): RoutineTemplate {
  return {
    key,
    capabilities,
    target: "task",
    kind: "task",
    titleKey: `routines.templates.${key}.title`,
    stepKeys: Array.from({ length: steps }, (_, i) => `routines.templates.${key}.steps.s${i + 1}`),
    freq,
    interval,
    timesOfDay,
    defaultSelected,
    requiresTimes: true,
    ...extra,
  };
}

function med(key: string, capabilities: string[]): RoutineTemplate {
  return {
    key,
    capabilities,
    target: "medication_link",
    kind: "task",
    titleKey: `routines.templates.${key}.title`,
    stepKeys: [],
    freq: "daily",
    interval: 1,
    timesOfDay: [],
    defaultSelected: false,
    requiresTimes: false,
  };
}

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  tpl("trach_care", ["tracheostomy"], "daily", 1, ["08:00"], true, 4),
  tpl("trach_emergency_check", ["tracheostomy"], "daily", 1, ["08:00"], true, 5),
  tpl("trach_tube_change", ["tracheostomy"], "weekly", 1, [], false, 0),
  tpl("suction_clean", ["suctioning"], "daily", 1, ["20:00"], true, 3),
  tpl("suction_tubing", ["suctioning"], "weekly", 1, [], false, 0),
  tpl("vent_daily", ["ventilator"], "daily", 1, ["08:00"], true, 4),
  tpl("vent_weekly", ["ventilator"], "weekly", 1, [], false, 4),
  tpl("vent_inlet_filter", ["ventilator"], "monthly", 6, [], false, 0),
  tpl("cpap_daily", ["cpap_bipap"], "daily", 1, ["08:00"], true, 2),
  tpl("cpap_weekly", ["cpap_bipap"], "weekly", 1, ["10:00"], true, 3),
  tpl("cpap_filter", ["cpap_bipap"], "monthly", 1, [], false, 0),
  med("inhalation_meds", ["inhalations"]),
  tpl("cough_assist", ["cough_assist"], "daily", 1, [], false, 0),
  tpl("feed_task", ["g_tube"], "daily", 1, [], false, 2, { kind: "meal", replacesOffer: true }),
  tpl("gtube_site", ["g_tube"], "daily", 1, ["08:00"], true, 3),
  tpl("gtube_balloon", ["g_tube"], "weekly", 1, [], false, 2),
  tpl("gtube_extension", ["g_tube"], "daily", 14, [], false, 0),
  tpl("gtube_button_change", ["g_tube"], "monthly", 1, [], false, 0),
  tpl("feed_task_nj", ["nj_tube"], "daily", 1, [], false, 2, { kind: "meal", replacesOffer: true }),
  tpl("tpn_dressing", ["tpn"], "weekly", 1, [], false, 0),
  tpl("rescue_med_check", ["seizures"], "weekly", 1, ["18:00"], true, 4),
  med("antiepileptics", ["seizures"]),
  med("pain_meds", ["pain_management"]),
  tpl("glucose_task", ["diabetes"], "daily", 1, [], false, 0, { replacesOffer: true }),
  tpl("infusion_set", ["diabetes"], "daily", 3, [], false, 2),
  tpl("cgm_sensor", ["diabetes"], "daily", 10, [], false, 0),
  med("hydrocortisone", ["adrenal_insufficiency"]),
  tpl("adrenal_kit", ["adrenal_insufficiency"], "monthly", 1, ["18:00"], true, 6),
  med("thyroid_meds", ["thyroid"]),
  tpl("orthotic_skin", ["orthotics"], "daily", 1, ["19:00"], true, 2),
  tpl("orthotic_wear", ["orthotics"], "daily", 1, [], false, 0),
  tpl("standing", ["standing_frame"], "daily", 1, [], false, 0),
  tpl("physio", ["physio_program"], "daily", 1, [], false, 0),
  tpl("wheelchair_check", ["wheelchair"], "weekly", 1, [], false, 4),
  tpl("catheterisation", ["catheter"], "daily", 1, [], false, 2),
  tpl("stoma_bag_change", ["stoma"], "daily", 3, ["08:00"], true, 2),
  tpl("toilet_routine", ["bowel_program"], "daily", 1, ["18:30"], false, 0),
  tpl("toothbrushing", ["oral_care"], "daily", 1, ["08:00", "19:30"], true, 0),
  tpl("skin_check", ["skin_care"], "daily", 1, ["08:00", "20:00"], true, 2),
  tpl(
    "repositioning",
    ["skin_care", "sleep_positioning"],
    "daily",
    1,
    ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "00:00", "04:00"],
    false,
    0,
  ),
];

/** Capabilities that have at least one template. */
export function capabilitiesWithTemplates(): Set<string> {
  return new Set(ROUTINE_TEMPLATES.flatMap((t) => t.capabilities));
}

/**
 * Group templates by need, in the order of `needs`. A template that
 * belongs to several needs appears once, under the first matching need.
 */
export function groupTemplatesByNeed(
  needs: string[],
): { capability: string; templates: RoutineTemplate[] }[] {
  const seen = new Set<string>();
  const out: { capability: string; templates: RoutineTemplate[] }[] = [];
  for (const cap of needs) {
    const list = ROUTINE_TEMPLATES.filter(
      (t) => t.capabilities.includes(cap) && !seen.has(t.key),
    );
    list.forEach((t) => seen.add(t.key));
    if (list.length > 0) out.push({ capability: cap, templates: list });
  }
  return out;
}

/**
 * Pre-tick state. Only templates that replace old offers (feed, glucose)
 * are unticked when the child already has a planner task of the same kind.
 */
export function initialSelected(t: RoutineTemplate, existingKinds: Set<string>): boolean {
  if (t.target !== "task") return false;
  if (t.replacesOffer && existingKinds.has(t.kind)) return false;
  return t.defaultSelected;
}

export interface RoutineEdits {
  title: string;
  freq: RoutineFreq;
  interval: number;
  timesOfDay: string[];
  checklist: ChecklistStep[];
}

export function normalizeTimes(times: string[]): string[] {
  return Array.from(
    new Set(
      times
        .map((s) => s.trim())
        .filter((s) => /^\d{1,2}:\d{2}$/.test(s))
        .map((s) => s.padStart(5, "0")),
    ),
  ).sort();
}

export function isRoutineValid(edits: RoutineEdits): boolean {
  return edits.title.trim().length > 0 && normalizeTimes(edits.timesOfDay).length > 0;
}

function addDaysStr(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/**
 * Pick the anchor (series start) so no occurrence is back-dated:
 * - daily/weekly/hourly: today at the first time still ahead (earlier times
 *   today are skipped), else tomorrow at the first time.
 * - monthly: the 1st of the month at the first time (this month only if
 *   today is the 1st and a time is still ahead).
 * All wall-clock math in the family timezone.
 */
export function anchorFor(
  freq: RoutineFreq,
  times: string[],
  now: Date,
  tz: string,
): Date {
  const today = wallClockIn(now, tz).todayStr;
  const first = times[0];
  const ahead = times.find((t) => zonedWallClockToDate(today, t, tz).getTime() > now.getTime());
  if (freq === "monthly") {
    const [y, m, d] = today.split("-").map(Number);
    if (d === 1 && ahead) return zonedWallClockToDate(today, first, tz);
    const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
    return zonedWallClockToDate(next, first, tz);
  }
  if (ahead) return zonedWallClockToDate(today, ahead, tz);
  return zonedWallClockToDate(addDaysStr(today, 1), first, tz);
}

/**
 * Template + user edits → appointment insert payload. Returns null for
 * medication links or invalid rows (no time / empty title).
 */
export function templateToAppointment(
  t: RoutineTemplate,
  edits: RoutineEdits,
  ctx: { familyId: string; childId: string; userId: string; tz: string; now: Date },
) {
  if (t.target !== "task") return null;
  const times = normalizeTimes(edits.timesOfDay);
  const title = edits.title.trim();
  if (times.length === 0 || !title) return null;
  const quiet = times.length > QUIET_TIMES_THRESHOLD;
  return {
    family_id: ctx.familyId,
    child_id: ctx.childId,
    created_by: ctx.userId,
    title,
    notes: null,
    location: null,
    kind: t.kind,
    starts_at: anchorFor(edits.freq, times, ctx.now, ctx.tz).toISOString(),
    ends_at: null,
    all_day: false,
    recurrence_freq: edits.freq,
    recurrence_interval: Math.max(1, Math.floor(edits.interval) || 1),
    // Weekly with no weekday chosen = Sunday.
    recurrence_byweekday: edits.freq === "weekly" ? [0] : null,
    recurrence_times_of_day: times,
    reminder_minutes: null,
    amount_ml: null,
    late_after_minutes: 0,
    missed_after_minutes: quiet ? 60 : 15,
    allow_ongoing: false,
    timer_minutes: null,
    notify_start: !quiet,
    checklist: edits.checklist
      .map((s) => ({ id: s.id, label: s.label.trim() }))
      .filter((s) => s.label.length > 0),
  };
}

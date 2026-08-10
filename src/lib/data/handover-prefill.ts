import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { VITAL_RANGES, type VitalType } from "@/lib/data/vitals";
import { buildTodaysDoses, type Medication } from "@/lib/data/medications";
import { TANKS, formatFlow, type TankType } from "@/lib/oxygen/tanks";
import { hasModule } from "@/lib/care-needs/modules";
import { _formatCareEventLine, type CareEvent, type CareEventType } from "@/lib/data/care-events";
import { formatTimeIn } from "@/lib/time/family-tz";

type MedLog = Database["public"]["Tables"]["med_logs"]["Row"];
type Vital = Database["public"]["Tables"]["vitals"]["Row"];
type ApptCompletion =
  Database["public"]["Tables"]["appointment_completions"]["Row"];
type ApptRow = Database["public"]["Tables"]["appointments"]["Row"];

export interface HandoverPrefillInput {
  familyId: string;
  shiftStart: Date;
  shiftEnd: Date;
  /** Raw `children.care_needs` for the active child. Parsed internally. */
  careNeeds?: unknown;
}

export interface HandoverPrefill {
  meds: string;
  notes: string;
  hasContent: boolean;
}

interface Labels {
  medSkipped: string;
  medRefused: string;
  medPostponed: string;
  medMissed: string;
  medAllGiven: string; // "... ({{given}}/{{total}})"
  apptMissed: string;
  apptCancelled: string;
  vitalAbnormal: string;
  empty: string;
  oxygenStarted: string;
  oxygenReplaced: string;
  oxygenFlowChanged: string;
  oxygenFlowChangedMany: string;
  hospital: string;
  carePlaceIssue: string;
  taskNote: string;
  tidySkipped: string;
  maintenanceDone: string;
  maintenanceOverdue: string;
  vitalTypeLabels?: Partial<Record<string, string>>;
  /** Care-event formatting labels. */
  careEventTypeLabels?: Partial<Record<CareEventType, string>>;
  careEventSeverityLabels?: Partial<Record<number, string>>;
  careEventActionPrefix?: string;
  careEventDuration?: (seconds: number) => string;
  /** "{{type}} ×{{count}} {{during}}" — collapsed routine repeats. */
  careEventCount?: string;
  /** "during the shift" / "under passet". */
  duringShift?: string;

}


/** Abnormal vitals logged within this window belong to ONE clinical moment. */
export const VITAL_CLUSTER_WINDOW_MS = 3 * 60 * 1000;

/** Stable in-line ordering for clustered vitals. Unknown types sort last. */
const VITAL_LINE_ORDER = [
  "spo2",
  "heart_rate",
  "breathing",
  "temperature",
  "fluids",
  "seizure",
  "weight",
  "other",
];
function vitalOrder(type: string): number {
  const i = VITAL_LINE_ORDER.indexOf(type);
  return i === -1 ? VITAL_LINE_ORDER.length : i;
}

export interface AbnormalReading {
  at: Date;
  vitalType: string;
  /** Preformatted "SpO₂ 94%" — label + value + unit resolved by the caller. */
  text: string;
}

/**
 * Group abnormal readings into clinical moments. Readings are sorted by time
 * and joined into a cluster while they fall within `windowMs` of the FIRST
 * reading of that cluster, so separate episodes hours apart never merge.
 * Each cluster is returned in the fixed vital order.
 */
export function clusterAbnormalVitals(
  readings: AbnormalReading[],
  windowMs: number = VITAL_CLUSTER_WINDOW_MS,
): AbnormalReading[][] {
  const sorted = [...readings].sort((a, b) => a.at.getTime() - b.at.getTime());
  const clusters: AbnormalReading[][] = [];
  for (const r of sorted) {
    const cur = clusters[clusters.length - 1];
    if (cur && r.at.getTime() - cur[0].at.getTime() <= windowMs) {
      cur.push(r);
    } else {
      clusters.push([r]);
    }
  }
  return clusters.map((c) =>
    [...c].sort((a, b) => vitalOrder(a.vitalType) - vitalOrder(b.vitalType)),
  );
}

/** A care event is noteworthy (never collapsed into a count) when it carries
 *  a description, an action taken, or a severity of moderate (2) or higher. */
export function isNoteworthyEvent(
  ev: Pick<CareEvent, "description" | "action_taken" | "severity">,
): boolean {
  return (
    !!ev.description?.trim() ||
    !!ev.action_taken?.trim() ||
    (ev.severity ?? 0) >= 2
  );
}

export interface CareEventSummaryLabels {
  /** Renders one full event line, including its family-tz timestamp. */
  formatEvent: (ev: CareEvent) => string;
  typeLabel: (t: CareEventType) => string;
  /** "{{type}} ×{{count}} {{during}}" */
  countTemplate: string;
  duringShift: string;
}

/**
 * Noteworthy events surface individually in chronological order; routine
 * repeats of the same type collapse into one count line per type. A lone
 * routine event renders as a normal line — never "×1".
 * `events` is expected time-ascending (the query orders it).
 */
export function summarizeCareEvents(
  events: CareEvent[],
  labels: CareEventSummaryLabels,
): string[] {
  const lines: string[] = [];
  const routineByType = new Map<CareEventType, CareEvent[]>();
  for (const ev of events) {
    if (isNoteworthyEvent(ev)) {
      lines.push(labels.formatEvent(ev));
    } else {
      const list = routineByType.get(ev.type);
      if (list) list.push(ev);
      else routineByType.set(ev.type, [ev]);
    }
  }
  // Map preserves first-occurrence order.
  for (const [type, list] of routineByType) {
    if (list.length === 1) {
      lines.push(labels.formatEvent(list[0]));
    } else {
      lines.push(
        `• ${labels.countTemplate
          .replace("{{type}}", labels.typeLabel(type))
          .replace("{{count}}", String(list.length))
          .replace("{{during}}", labels.duringShift)
          .trim()}`,
      );
    }
  }
  return lines;
}

/** A row of `oxygen_tanks` as far as the handover summary is concerned. */
export interface OxygenRow {
  started_at: string;
  replaced_at: string | null;
  tank_type: string;
  flow_lpm: number;
  /** 'start' | 'flow_change' | 'tank_swap' — null on rows written before the marker existed. */
  change_reason?: string | null;
}

export interface OxygenSummaryLabels {
  fmtTime: (d: Date) => string;
  tankLabel: (tankType: string) => string;
  flowLabel: (flow: number) => string;
  oxygenStarted: string;
  oxygenReplaced: string;
  /** "Oxygen flow changed to" — prefixes the flow value. */
  oxygenFlowChanged: string;
  /** "Oxygen flow: now {{flow}} (changed {{count}}× during the shift, last at {{time}})" */
  oxygenFlowChangedMany: string;
}

/** A legacy close (`replaced_at`) is considered already described by a stamped
 *  successor row that starts at practically the same moment. */
const OXY_SUCCESSOR_TOLERANCE_MS = 60 * 1000;

/**
 * Turn oxygen tank rows into handover lines, keyed off the marker written at
 * the mutation source:
 *  - 'start'       → individual "oxygen started" line
 *  - 'tank_swap'   → individual "tank replaced" line (real physical swaps only)
 *  - 'flow_change' → collapsed: one summary line when it happened 2+ times
 *  - null (legacy) → best-effort previous behaviour, never a crash
 */
export function summarizeOxygenEvents(
  tanks: OxygenRow[],
  shiftStart: Date,
  shiftEnd: Date,
  labels: OxygenSummaryLabels,
): string[] {
  const inWindow = (d: Date) =>
    !Number.isNaN(d.getTime()) && d >= shiftStart && d < shiftEnd;
  const entries: Array<{ at: Date; text: string }> = [];
  const flowChanges: Array<{ at: Date; flow: number }> = [];

  for (const tank of tanks) {
    const startedAt = new Date(tank.started_at);
    const tankLabel = labels.tankLabel(tank.tank_type);
    const flowStr = labels.flowLabel(Number(tank.flow_lpm));
    const reason = tank.change_reason ?? null;

    if (inWindow(startedAt)) {
      if (reason === "flow_change") {
        flowChanges.push({ at: startedAt, flow: Number(tank.flow_lpm) });
      } else if (reason === "tank_swap") {
        entries.push({
          at: startedAt,
          text: `• ${labels.fmtTime(startedAt)} ${labels.oxygenReplaced} — ${tankLabel}`,
        });
      } else {
        // 'start' and legacy null rows.
        entries.push({
          at: startedAt,
          text: `• ${labels.fmtTime(startedAt)} ${labels.oxygenStarted} — ${tankLabel} @ ${flowStr}`,
        });
      }
    }

    // Legacy rows only: a closed row used to be the sole signal of a swap.
    // Stamped rows describe themselves, so we don't double-report them.
    if (reason === null && tank.replaced_at) {
      const replacedAt = new Date(tank.replaced_at);
      if (!inWindow(replacedAt)) continue;
      const describedBySuccessor = tanks.some(
        (t) =>
          (t.change_reason ?? null) !== null &&
          Math.abs(new Date(t.started_at).getTime() - replacedAt.getTime()) <=
            OXY_SUCCESSOR_TOLERANCE_MS,
      );
      if (describedBySuccessor) continue;
      entries.push({
        at: replacedAt,
        text: `• ${labels.fmtTime(replacedAt)} ${labels.oxygenReplaced} — ${tankLabel}`,
      });
    }
  }

  if (flowChanges.length === 1) {
    const only = flowChanges[0];
    entries.push({
      at: only.at,
      text: `• ${labels.fmtTime(only.at)} ${labels.oxygenFlowChanged} ${labels.flowLabel(only.flow)}`,
    });
  } else if (flowChanges.length > 1) {
    const sorted = [...flowChanges].sort(
      (a, b) => a.at.getTime() - b.at.getTime(),
    );
    const last = sorted[sorted.length - 1];
    entries.push({
      at: last.at,
      text: `• ${labels.oxygenFlowChangedMany
        .replace("{{flow}}", labels.flowLabel(last.flow))
        .replace("{{count}}", String(sorted.length))
        .replace("{{time}}", labels.fmtTime(last.at))}`,
    });
  }

  return entries
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .map((e) => e.text);
}


function fmtTime(d: Date) {
  return d.toTimeString().slice(0, 5);
}


function statusLine(
  status: string,
  labels: Labels,
  medName: string,
  time: string,
  reason: string | null,
  postponedTo: string | null,
): string | null {
  let label: string | null = null;
  if (status === "skipped") label = labels.medSkipped;
  else if (status === "refused") label = labels.medRefused;
  else if (status === "postponed") {
    label = labels.medPostponed;
    if (postponedTo) {
      try {
        label += ` → ${fmtTime(new Date(postponedTo))}`;
      } catch {
        /* ignore */
      }
    }
  }
  if (!label) return null;
  const suffix = reason ? ` (${reason})` : "";
  return `• ${time} ${medName} — ${label}${suffix}`;
}

export function useHandoverPrefill(
  input: HandoverPrefillInput | null,
  labels: Labels,
) {
  const enabled = !!input;
  return useQuery({
    queryKey: [
      "handover-prefill",
      input?.familyId,
      input?.shiftStart.toISOString(),
      input?.shiftEnd.toISOString(),
      // Include care_needs in the key so toggling capabilities invalidates.
      hasModule(input?.careNeeds, "oxygen"),
    ],
    enabled,
    queryFn: async (): Promise<HandoverPrefill> => {
      if (!input) return { meds: "", notes: "", hasContent: false };
      const { familyId, shiftStart, shiftEnd } = input;
      const oxygenAllowed = hasModule(input.careNeeds, "oxygen");
      const startIso = shiftStart.toISOString();
      const endIso = shiftEnd.toISOString();

      const [medsRes, logsRes, apptsRes, complRes, vitalsRes, oxyRes, familyRes, cpAnswersRes, cpChecksRes, tidyRes, maintLogsRes, maintItemsRes, careEventsRes] =
        await Promise.all([
          supabase
            .from("medications")
            .select("*")
            .eq("family_id", familyId)
            .eq("active", true),
          supabase
            .from("med_logs")
            .select("*")
            .eq("family_id", familyId)
            .gte("scheduled_for", startIso)
            .lt("scheduled_for", endIso),
          supabase
            .from("appointments")
            .select("*")
            .eq("family_id", familyId)
            .gte("starts_at", startIso)
            .lt("starts_at", endIso),
          supabase
            .from("appointment_completions")
            .select("*")
            .eq("family_id", familyId)
            .gte("occurrence_at", startIso)
            .lt("occurrence_at", endIso),
          supabase
            .from("vitals")
            .select("*")
            .eq("family_id", familyId)
            .gte("logged_at", startIso)
            .lt("logged_at", endIso),
          supabase
            .from("oxygen_tanks")
            .select("*")
            .eq("family_id", familyId)
            .or(
              `and(started_at.gte.${startIso},started_at.lt.${endIso}),and(replaced_at.gte.${startIso},replaced_at.lt.${endIso})`,
            ),
          supabase
            .from("families")
            .select("at_hospital_since, timezone")
            .eq("id", familyId)
            .maybeSingle(),
          supabase
            .from("care_place_check_answers")
            .select("*, check:care_place_checks!inner(checked_at, family_id)")
            .eq("family_id", familyId)
            .gte("created_at", startIso)
            .lt("created_at", endIso),
          supabase
            .from("care_place_checks")
            .select("id, checked_at")
            .eq("family_id", familyId)
            .gte("checked_at", startIso)
            .lt("checked_at", endIso),
          supabase
            .from("tidy_submission_answers")
            .select("item_label_snapshot, status, note, created_at")
            .eq("family_id", familyId)
            .eq("status", "skipped")
            .gte("created_at", startIso)
            .lt("created_at", endIso),
          supabase
            .from("maintenance_logs")
            .select("maintenance_item_id, performed_at, note, item:maintenance_items!inner(name, action_type, machine:machines(name))")
            .eq("family_id", familyId)
            .gte("performed_at", startIso)
            .lt("performed_at", endIso),
          supabase
            .from("maintenance_items")
            .select("id, name, action_type, interval_days, last_done_at, active, machine:machines(name)")
            .eq("family_id", familyId)
            .eq("active", true),
          supabase
            .from("care_events")
            .select("*")
            .eq("family_id", familyId)
            .eq("active", true)
            .gte("occurred_at", startIso)
            .lt("occurred_at", endIso)
            .order("occurred_at", { ascending: true }),
        ]);

      const meds = (medsRes.data ?? []) as Medication[];
      const logs = (logsRes.data ?? []) as MedLog[];
      const appts = (apptsRes.data ?? []) as ApptRow[];
      const completions = (complRes.data ?? []) as ApptCompletion[];
      const vitals = (vitalsRes.data ?? []) as Vital[];
      const oxyTanks = (oxyRes.data ?? []) as Array<{
        started_at: string;
        replaced_at: string | null;
        tank_type: string;
        flow_lpm: number;
      }>;
      const cpAnswers = (cpAnswersRes.data ?? []) as Array<{
        item_label_snapshot: string;
        item_type_snapshot: string;
        yesno_value: boolean | null;
        count_value: number | null;
        created_at: string;
      }>;
      void cpChecksRes;
      const atHospitalSince = familyRes.data?.at_hospital_since
        ? new Date(familyRes.data.at_hospital_since)
        : null;
      const tz = familyRes.data?.timezone ?? "Europe/Stockholm";

      // Walk every scheduled dose intersecting the shift window for each day.
      const medLines: string[] = [];
      const medById = new Map(meds.map((m) => [m.id, m]));
      let totalDoses = 0;
      let givenCount = 0;

      // Build per-day doses across the shift window
      const dayCursor = new Date(shiftStart);
      dayCursor.setHours(0, 0, 0, 0);
      const dayEnd = new Date(shiftEnd);
      dayEnd.setHours(0, 0, 0, 0);
      const seen = new Set<string>();
      while (dayCursor <= dayEnd) {
        const doses = buildTodaysDoses(meds, logs, tz, new Date(dayCursor));
        for (const d of doses) {
          if (
            d.scheduled_for < shiftStart ||
            d.scheduled_for >= shiftEnd
          )
            continue;
          if (seen.has(d.key)) continue;
          seen.add(d.key);
          totalDoses++;
          const time = fmtTime(d.scheduled_for);
          if (d.log) {
            if (d.log.status === "given") givenCount++;
            const line = statusLine(
              d.log.status,
              labels,
              d.medication.name,
              time,
              d.log.reason ?? d.log.notes ?? null,
              d.log.postponed_to ?? null,
            );
            if (line) medLines.push(line);
          } else if (d.scheduled_for < new Date()) {
            medLines.push(
              `• ${time} ${d.medication.name} — ${labels.medMissed}`,
            );
          }
        }
        dayCursor.setDate(dayCursor.getDate() + 1);
      }

      // Also pick up explicit logs whose status is non-given but scheduled
      // outside the times[] (defensive — usually covered above).
      for (const l of logs) {
        if (l.status === "given") continue;
        const sched = new Date(l.scheduled_for);
        const key = `${l.medication_id}|${sched.toISOString()}`;
        if (seen.has(key)) continue;
        const med = medById.get(l.medication_id);
        if (!med) continue;
        seen.add(key);
        const line = statusLine(
          l.status,
          labels,
          med.name,
          fmtTime(sched),
          l.reason ?? l.notes ?? null,
          l.postponed_to ?? null,
        );
        if (line) medLines.push(line);
      }

      medLines.sort();

      // Calm-shift positive summary: no exception lines but doses were
      // scheduled and (at least some) actually given → say so plainly.
      if (medLines.length === 0 && totalDoses > 0) {
        medLines.push(
          labels.medAllGiven
            .replace("{{given}}", String(givenCount))
            .replace("{{total}}", String(totalDoses)),
        );
      }


      // Notes: appointments missed/cancelled + abnormal vitals + extras
      const noteLines: string[] = [];
      const apptById = new Map(appts.map((a) => [a.id, a]));
      const completionByKey = new Map(
        completions.map((c) => [
          `${c.appointment_id}|${new Date(c.occurrence_at).toISOString()}`,
          c,
        ]),
      );
      for (const a of appts) {
        const start = new Date(a.starts_at);
        const key = `${a.id}|${start.toISOString()}`;
        const c = completionByKey.get(key);
        const time = fmtTime(start);
        if (c?.status === "skipped" || c?.status === "postponed") {
          const label = c.status === "skipped" ? labels.apptCancelled : labels.apptMissed;
          noteLines.push(
            `• ${time} ${a.title} — ${label}${c.reason ? ` (${c.reason})` : ""}`,
          );
        } else if (!c && start < new Date()) {
          noteLines.push(`• ${time} ${a.title} — ${labels.apptMissed}`);
        }
      }

      // Free-text notes captured while marking tasks done during this shift
      for (const c of completions) {
        const note = c.notes?.trim();
        if (!note) continue;
        const appt = apptById.get(c.appointment_id);
        const t = fmtTime(new Date(c.occurrence_at));
        const title = appt?.title ?? labels.taskNote;
        noteLines.push(`• ${t} ${title} — ${labels.taskNote}: ${note}`);
      }

      // Abnormal vitals — clustered by moment. A single clinical event
      // (e.g. a desaturation) drags several vitals at once; collapse
      // readings inside VITAL_CLUSTER_WINDOW_MS into ONE line.
      const abnormal: AbnormalReading[] = [];
      for (const v of vitals) {
        const range = VITAL_RANGES[v.vital_type as VitalType];
        if (!range) continue;
        const val = Number(v.value);
        if (!Number.isFinite(val)) continue;
        if (val < range.low || val > range.high) {
          const typeLabel =
            labels.vitalTypeLabels?.[v.vital_type] ?? v.vital_type;
          abnormal.push({
            at: new Date(v.logged_at),
            vitalType: v.vital_type,
            text: `${typeLabel} ${val}${v.unit ?? ""}`,
          });
        }
      }
      for (const cluster of clusterAbnormalVitals(abnormal)) {
        // Clusters are ordered by vital, so timestamp from the earliest reading.
        const t = fmtTime(
          new Date(Math.min(...cluster.map((r) => r.at.getTime()))),
        );
        noteLines.push(
          `• ${t} ${labels.vitalAbnormal}: ${cluster.map((r) => r.text).join(", ")}`,
        );
      }




      // Oxygen tank events during the shift.
      // Care-needs gate: only emit if the child has the oxygen module.
      // Safety override: if a real event exists in the window we always
      // emit it, because it actually happened (data mismatch, existing
      // family, etc. must not silently swallow live oxygen activity).
      if (oxygenAllowed || oxyTanks.length > 0) {
        for (const tank of oxyTanks) {
        const tankLabel =
          TANKS[tank.tank_type as TankType]?.label ?? tank.tank_type;
        const flowStr = formatFlow(Number(tank.flow_lpm));
        const startedAt = new Date(tank.started_at);
        if (startedAt >= shiftStart && startedAt < shiftEnd) {
          noteLines.push(
            `• ${fmtTime(startedAt)} ${labels.oxygenStarted} — ${tankLabel} @ ${flowStr}`,
          );
        }
        if (tank.replaced_at) {
          const replacedAt = new Date(tank.replaced_at);
          if (replacedAt >= shiftStart && replacedAt < shiftEnd) {
            noteLines.push(
              `• ${fmtTime(replacedAt)} ${labels.oxygenReplaced} — ${tankLabel}`,
            );
          }
        }
        }
      }

      // Hospital flag — currently at hospital and that started before shiftEnd
      if (atHospitalSince && atHospitalSince < shiftEnd) {
        noteLines.unshift(`• ${labels.hospital}`);
      }

      // Care-place check fails (yes/no answered No)
      for (const a of cpAnswers) {
        if (a.item_type_snapshot === "yesno" && a.yesno_value === false) {
          const t = fmtTime(new Date(a.created_at));
          noteLines.push(
            `• ${t} ${labels.carePlaceIssue}: ${a.item_label_snapshot}`,
          );
        }
      }

      // End-of-shift tidy items skipped
      const tidySkipped = (tidyRes.data ?? []) as Array<{
        item_label_snapshot: string;
        note: string | null;
        created_at: string;
      }>;
      for (const s of tidySkipped) {
        const t = fmtTime(new Date(s.created_at));
        const suffix = s.note ? ` (${s.note})` : "";
        noteLines.push(
          `• ${t} ${labels.tidySkipped}: ${s.item_label_snapshot}${suffix}`,
        );
      }

      // Maintenance performed during the shift
      type MaintLogRow = {
        maintenance_item_id: string;
        performed_at: string;
        note: string | null;
        item: {
          name: string;
          action_type: string | null;
          machine: { name: string } | null;
        } | null;
      };
      const maintLogs = (maintLogsRes.data ?? []) as unknown as MaintLogRow[];
      const performedItemIds = new Set<string>();
      for (const ml of maintLogs) {
        performedItemIds.add(ml.maintenance_item_id);
        const time = fmtTime(new Date(ml.performed_at));
        const itemName = ml.item?.name ?? "";
        const machineName = ml.item?.machine?.name;
        const suffix = machineName ? ` — ${machineName}` : "";
        const noteSuffix = ml.note ? ` (${ml.note})` : "";
        noteLines.push(
          `• ${time} ${labels.maintenanceDone}: ${itemName}${suffix}${noteSuffix}`,
        );
      }

      // Overdue maintenance at end-of-shift (excluding items already performed
      // inside the window — those already appear above as "done").
      type MaintItemRow = {
        id: string;
        name: string;
        action_type: string | null;
        interval_days: number | null;
        last_done_at: string | null;
        active: boolean;
        machine: { name: string } | null;
      };
      const maintItems = (maintItemsRes.data ?? []) as unknown as MaintItemRow[];
      for (const it of maintItems) {
        if (performedItemIds.has(it.id)) continue;
        if (it.interval_days == null) continue;
        // "Overdue at shiftEnd": next due ≤ shiftEnd.
        const dueAt = it.last_done_at
          ? new Date(new Date(it.last_done_at).getTime() + it.interval_days * 86_400_000)
          : new Date(0);
        if (dueAt.getTime() > shiftEnd.getTime()) continue;
        const machineName = it.machine?.name;
        const suffix = machineName ? ` — ${machineName}` : "";
        noteLines.push(
          `• ${labels.maintenanceOverdue}: ${it.name}${suffix}`,
        );
      }

      // Care events during the shift. Noteworthy events (note, action taken,
      // or severity ≥ 2) always surface on their own line; routine repeats of
      // the same type collapse into a single "×N during the shift" count so
      // four uneventful vomits don't become four lines.
      const careEvents = (careEventsRes.data ?? []) as CareEvent[];
      const eventLineLabels = {
        typeLabel: (t: CareEventType) => labels.careEventTypeLabels?.[t] ?? t,
        severityLabel: (n: number) =>
          labels.careEventSeverityLabels?.[n] ?? String(n),
        actionPrefix: labels.careEventActionPrefix ?? "Action",
        duration: labels.careEventDuration ?? ((s: number) => `${s}s`),
      };
      noteLines.push(
        ...summarizeCareEvents(careEvents, {
          formatEvent: (ev) =>
            _formatCareEventLine(
              ev,
              eventLineLabels,
              formatTimeIn(ev.occurred_at, tz),
            ),
          typeLabel: eventLineLabels.typeLabel,
          countTemplate:
            labels.careEventCount ?? "{{type}} ×{{count}} {{during}}",
          duringShift: labels.duringShift ?? "during the shift",
        }),
      );



      const medsStr = medLines.length ? medLines.join("\n") : "";
      const notesStr = noteLines.length ? noteLines.join("\n") : "";
      const hasContent = medLines.length > 0 || noteLines.length > 0;

      return {
        meds: medsStr || (hasContent ? "" : labels.empty),
        notes: notesStr,
        hasContent,
      };
    },
  });
}


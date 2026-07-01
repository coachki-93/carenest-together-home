import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { VITAL_RANGES, type VitalType } from "@/lib/data/vitals";
import { buildTodaysDoses, type Medication } from "@/lib/data/medications";

type MedLog = Database["public"]["Tables"]["med_logs"]["Row"];
type Vital = Database["public"]["Tables"]["vitals"]["Row"];
type ApptCompletion =
  Database["public"]["Tables"]["appointment_completions"]["Row"];
type ApptRow = Database["public"]["Tables"]["appointments"]["Row"];

export interface HandoverPrefillInput {
  familyId: string;
  shiftStart: Date;
  shiftEnd: Date;
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
  apptMissed: string;
  apptCancelled: string;
  vitalAbnormal: string;
  empty: string;
  oxygenStarted: string;
  oxygenReplaced: string;
  hospital: string;
  carePlaceIssue: string;
  taskNote: string;
  tidySkipped: string;
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
    ],
    enabled,
    queryFn: async (): Promise<HandoverPrefill> => {
      if (!input) return { meds: "", notes: "", hasContent: false };
      const { familyId, shiftStart, shiftEnd } = input;
      const startIso = shiftStart.toISOString();
      const endIso = shiftEnd.toISOString();

      const [medsRes, logsRes, apptsRes, complRes, vitalsRes, oxyRes, familyRes, cpAnswersRes, cpChecksRes] =
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
            .select("at_hospital_since")
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

      // Walk every scheduled dose intersecting the shift window for each day.
      const medLines: string[] = [];
      const medById = new Map(meds.map((m) => [m.id, m]));

      // Build per-day doses across the shift window
      const dayCursor = new Date(shiftStart);
      dayCursor.setHours(0, 0, 0, 0);
      const dayEnd = new Date(shiftEnd);
      dayEnd.setHours(0, 0, 0, 0);
      const seen = new Set<string>();
      while (dayCursor <= dayEnd) {
        const doses = buildTodaysDoses(meds, logs, new Date(dayCursor));
        for (const d of doses) {
          if (
            d.scheduled_for < shiftStart ||
            d.scheduled_for >= shiftEnd
          )
            continue;
          if (seen.has(d.key)) continue;
          seen.add(d.key);
          const time = fmtTime(d.scheduled_for);
          if (d.log) {
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

      // Abnormal vitals
      for (const v of vitals) {
        const range = VITAL_RANGES[v.vital_type as VitalType];
        if (!range) continue;
        const val = Number(v.value);
        if (!Number.isFinite(val)) continue;
        if (val < range.low || val > range.high) {
          const t = fmtTime(new Date(v.logged_at));
          noteLines.push(
            `• ${t} ${labels.vitalAbnormal}: ${v.vital_type} ${val}${v.unit ?? ""}`,
          );
        }
      }

      // Oxygen tank events during the shift
      for (const tank of oxyTanks) {
        const startedAt = new Date(tank.started_at);
        if (startedAt >= shiftStart && startedAt < shiftEnd) {
          noteLines.push(
            `• ${fmtTime(startedAt)} ${labels.oxygenStarted} — ${tank.tank_type} @ ${tank.flow_lpm} L/min`,
          );
        }
        if (tank.replaced_at) {
          const replacedAt = new Date(tank.replaced_at);
          if (replacedAt >= shiftStart && replacedAt < shiftEnd) {
            noteLines.push(
              `• ${fmtTime(replacedAt)} ${labels.oxygenReplaced} — ${tank.tank_type}`,
            );
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


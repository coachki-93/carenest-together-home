import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type InsightsRange = "7d" | "30d" | "90d";

export interface DailyOxygenPoint {
  date: string; // yyyy-mm-dd
  hours: number; // hours on oxygen that day (excluding paused)
  flowLpm: number; // avg flow weighted by hours
  tanksReplaced: number;
}

export interface VitalDailyPoint {
  date: string;
  min: number;
  avg: number;
  max: number;
  count: number;
}

export interface VitalSeries {
  type: "spo2" | "heart_rate" | "temperature" | "breathing";
  unit: string;
  points: VitalDailyPoint[];
}

export interface CarePlaceDailyPoint {
  date: string;
  done: number;
  late: number;
  missed: number;
}

export interface MedAdherencePoint {
  date: string;
  expected: number;
  onTime: number;
  percent: number; // 0..100
}

export interface HeatmapCell {
  dow: number; // 0-6 (Sun-Sat)
  hour: number; // 0-23
  count: number;
}

export interface InsightsData {
  oxygen: DailyOxygenPoint[];
  vitals: VitalSeries[];
  carePlace: CarePlaceDailyPoint[];
  meds: MedAdherencePoint[];
  heatmap: HeatmapCell[];
  totals: {
    oxygenHours: number;
    tanksReplaced: number;
    avgFlow: number;
    medsOnTimePct: number | null;
    missedChecks: number;
  };
}

const RANGE_DAYS: Record<InsightsRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function buildDayList(days: number): string[] {
  const out: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(ymd(d));
  }
  return out;
}

function clampToRange(start: Date, end: Date, rangeStart: Date, rangeEnd: Date) {
  const s = start < rangeStart ? rangeStart : start;
  const e = end > rangeEnd ? rangeEnd : end;
  return { s, e };
}

export function useInsights(
  familyId: string | null | undefined,
  range: InsightsRange,
) {
  return useQuery<InsightsData>({
    queryKey: ["insights", familyId, range],
    enabled: !!familyId,
    staleTime: 60_000,
    queryFn: async () => {
      const days = RANGE_DAYS[range];
      const dayList = buildDayList(days);
      const rangeStart = new Date();
      rangeStart.setHours(0, 0, 0, 0);
      rangeStart.setDate(rangeStart.getDate() - (days - 1));
      const rangeEnd = new Date();
      const rangeStartIso = rangeStart.toISOString();
      const rangeEndDateIso = ymd(rangeEnd);
      const rangeStartDateIso = dayList[0];

      // Run all reads in parallel
      const [
        oxygenRes,
        vitalsRes,
        timesRes,
        checksRes,
        missedRes,
        medsRes,
        medLogsRes,
      ] = await Promise.all([
        supabase
          .from("oxygen_tanks")
          .select("*")
          .eq("family_id", familyId!)
          .or(`replaced_at.gte.${rangeStartIso},replaced_at.is.null`)
          .order("started_at", { ascending: true }),
        supabase
          .from("vitals")
          .select("vital_type,value,unit,logged_at")
          .eq("family_id", familyId!)
          .gte("logged_at", rangeStartIso)
          .in("vital_type", ["spo2", "heart_rate", "temperature", "breathing"]),
        supabase
          .from("care_place_check_times")
          .select("id,time_of_day,active,grace_minutes")
          .eq("family_id", familyId!)
          .eq("active", true),
        supabase
          .from("care_place_checks")
          .select("scheduled_date,scheduled_time,performed_at")
          .eq("family_id", familyId!)
          .gte("scheduled_date", rangeStartDateIso)
          .lte("scheduled_date", rangeEndDateIso),
        supabase
          .from("care_place_missed_checks")
          .select("scheduled_date,scheduled_time")
          .eq("family_id", familyId!)
          .gte("scheduled_date", rangeStartDateIso)
          .lte("scheduled_date", rangeEndDateIso),
        supabase
          .from("medications")
          .select("id,active")
          .eq("family_id", familyId!),
        supabase
          .from("med_logs")
          .select("scheduled_for,given_at,status,medication_id")
          .eq("family_id", familyId!)
          .gte("scheduled_for", rangeStartIso),
      ]);

      const oxygenRows =
        (oxygenRes.data as Database["public"]["Tables"]["oxygen_tanks"]["Row"][]) ||
        [];
      const vitalRows = vitalsRes.data || [];
      const timeRows = timesRes.data || [];
      const checkRows = checksRes.data || [];
      const missedRows = missedRes.data || [];
      const medRows = medsRes.data || [];
      const medLogs = medLogsRes.data || [];

      // ---------- OXYGEN ----------
      // Distribute tank active minutes across days, subtract paused time pro-rata.
      const oxygenByDay = new Map<string, { hours: number; flowSum: number; tanks: number }>();
      dayList.forEach((d) => oxygenByDay.set(d, { hours: 0, flowSum: 0, tanks: 0 }));

      for (const tank of oxygenRows) {
        const start = new Date(tank.started_at);
        const end = tank.replaced_at ? new Date(tank.replaced_at) : new Date();
        if (end < rangeStart) continue;
        const { s, e } = clampToRange(start, end, rangeStart, rangeEnd);
        if (e <= s) continue;
        const totalMs = end.getTime() - start.getTime();
        const pausedMs = (tank.paused_seconds ?? 0) * 1000;
        const effRatio = totalMs > 0 ? Math.max(0, 1 - pausedMs / totalMs) : 1;
        const flow = Number(tank.flow_lpm) || 0;

        // Walk each day in the clipped span
        const cursor = new Date(s);
        cursor.setHours(0, 0, 0, 0);
        while (cursor <= e) {
          const dayStart = new Date(cursor);
          const dayEnd = new Date(cursor);
          dayEnd.setDate(dayEnd.getDate() + 1);
          const segStart = dayStart < s ? s : dayStart;
          const segEnd = dayEnd > e ? e : dayEnd;
          const ms = Math.max(0, segEnd.getTime() - segStart.getTime());
          const hours = (ms * effRatio) / (1000 * 60 * 60);
          const key = ymd(dayStart);
          const bucket = oxygenByDay.get(key);
          if (bucket) {
            bucket.hours += hours;
            bucket.flowSum += hours * flow;
          }
          cursor.setDate(cursor.getDate() + 1);
        }

        if (tank.replaced_at) {
          const repKey = ymd(new Date(tank.replaced_at));
          const repBucket = oxygenByDay.get(repKey);
          if (repBucket) repBucket.tanks += 1;
        }
      }

      const oxygen: DailyOxygenPoint[] = dayList.map((d) => {
        const b = oxygenByDay.get(d)!;
        return {
          date: d,
          hours: Math.round(b.hours * 10) / 10,
          flowLpm: b.hours > 0 ? Math.round((b.flowSum / b.hours) * 10) / 10 : 0,
          tanksReplaced: b.tanks,
        };
      });

      const totalOxygenHours =
        Math.round(oxygen.reduce((a, p) => a + p.hours, 0) * 10) / 10;
      const totalTanks = oxygen.reduce((a, p) => a + p.tanksReplaced, 0);
      const flowWeighted = oxygen.reduce((a, p) => a + p.flowLpm * p.hours, 0);
      const avgFlow =
        totalOxygenHours > 0
          ? Math.round((flowWeighted / totalOxygenHours) * 10) / 10
          : 0;

      // ---------- VITALS ----------
      const vitalTypes: Array<VitalSeries["type"]> = [
        "spo2",
        "heart_rate",
        "temperature",
        "breathing",
      ];
      const unitFor: Record<VitalSeries["type"], string> = {
        spo2: "%",
        heart_rate: "bpm",
        temperature: "°C",
        breathing: "br/min",
      };
      const vitalsByType = new Map<
        VitalSeries["type"],
        Map<string, number[]>
      >();
      vitalTypes.forEach((t) => vitalsByType.set(t, new Map()));
      for (const v of vitalRows) {
        const type = v.vital_type as VitalSeries["type"];
        if (!vitalsByType.has(type)) continue;
        const d = ymd(new Date(v.logged_at));
        if (!dayList.includes(d)) continue;
        const arr = vitalsByType.get(type)!.get(d) ?? [];
        const val = Number(v.value);
        if (!Number.isFinite(val)) continue;
        arr.push(val);
        vitalsByType.get(type)!.set(d, arr);
      }
      const vitals: VitalSeries[] = vitalTypes.map((type) => {
        const byDay = vitalsByType.get(type)!;
        const points: VitalDailyPoint[] = dayList.map((d) => {
          const arr = byDay.get(d) ?? [];
          if (arr.length === 0) {
            return { date: d, min: 0, avg: 0, max: 0, count: 0 };
          }
          const min = Math.min(...arr);
          const max = Math.max(...arr);
          const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
          return {
            date: d,
            min: Math.round(min * 10) / 10,
            avg: Math.round(avg * 10) / 10,
            max: Math.round(max * 10) / 10,
            count: arr.length,
          };
        });
        return { type, unit: unitFor[type], points };
      });

      // ---------- CARE PLACE CHECKS ----------
      const cpByDay = new Map<
        string,
        { done: number; late: number; missed: number }
      >();
      dayList.forEach((d) =>
        cpByDay.set(d, { done: 0, late: 0, missed: 0 }),
      );
      const timeGrace = new Map<string, number>();
      for (const t of timeRows) {
        timeGrace.set(t.time_of_day, t.grace_minutes ?? 30);
      }
      for (const c of checkRows) {
        const b = cpByDay.get(c.scheduled_date);
        if (!b) continue;
        if (!c.performed_at) {
          b.missed += 1;
          continue;
        }
        const grace = timeGrace.get(c.scheduled_time) ?? 30;
        const scheduledMs = new Date(
          `${c.scheduled_date}T${c.scheduled_time}`,
        ).getTime();
        const performedMs = new Date(c.performed_at).getTime();
        if (performedMs - scheduledMs > grace * 60_000) b.late += 1;
        else b.done += 1;
      }
      for (const m of missedRows) {
        const b = cpByDay.get(m.scheduled_date);
        if (b) b.missed += 1;
      }
      const carePlace: CarePlaceDailyPoint[] = dayList.map((d) => ({
        date: d,
        ...cpByDay.get(d)!,
      }));

      // ---------- MED ADHERENCE ----------
      const activeMedIds = new Set(
        medRows.filter((m) => m.active).map((m) => m.id),
      );
      const medByDay = new Map<
        string,
        { expected: number; onTime: number }
      >();
      dayList.forEach((d) => medByDay.set(d, { expected: 0, onTime: 0 }));
      for (const log of medLogs) {
        if (!activeMedIds.has(log.medication_id)) continue;
        const d = ymd(new Date(log.scheduled_for));
        const bucket = medByDay.get(d);
        if (!bucket) continue;
        bucket.expected += 1;
        if (log.status === "given") bucket.onTime += 1;
      }
      const meds: MedAdherencePoint[] = dayList.map((d) => {
        const b = medByDay.get(d)!;
        return {
          date: d,
          expected: b.expected,
          onTime: b.onTime,
          percent: b.expected > 0 ? Math.round((b.onTime / b.expected) * 100) : 0,
        };
      });
      const totalExpected = meds.reduce((a, p) => a + p.expected, 0);
      const totalOnTime = meds.reduce((a, p) => a + p.onTime, 0);
      const medsOnTimePct =
        totalExpected > 0 ? Math.round((totalOnTime / totalExpected) * 100) : null;

      // ---------- HEATMAP ----------
      const grid = new Map<string, number>();
      const allMissed = [
        ...missedRows.map((m) => ({
          date: m.scheduled_date as string,
          time: m.scheduled_time as string,
        })),
        ...checkRows
          .filter((c) => !c.performed_at)
          .map((c) => ({
            date: c.scheduled_date as string,
            time: c.scheduled_time as string,
          })),
      ];
      for (const m of allMissed) {
        const dt = new Date(`${m.date}T${m.time}`);
        const key = `${dt.getDay()}_${dt.getHours()}`;
        grid.set(key, (grid.get(key) ?? 0) + 1);
      }
      const heatmap: HeatmapCell[] = [];
      for (let dow = 0; dow < 7; dow++) {
        for (let hour = 0; hour < 24; hour++) {
          heatmap.push({
            dow,
            hour,
            count: grid.get(`${dow}_${hour}`) ?? 0,
          });
        }
      }

      const totalMissed = carePlace.reduce((a, p) => a + p.missed, 0);

      return {
        oxygen,
        vitals,
        carePlace,
        meds,
        heatmap,
        totals: {
          oxygenHours: totalOxygenHours,
          tanksReplaced: totalTanks,
          avgFlow,
          medsOnTimePct,
          missedChecks: totalMissed,
        },
      };
    },
  });
}

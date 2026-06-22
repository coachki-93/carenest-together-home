// Duration tables for oxygen tanks. Values come directly from the
// manufacturer's spec sheet and are not user data.

export type TankType = "liv_mini_2l";

export interface FlowDuration {
  flow: number; // l/min
  minutes: number;
}

// LIV Mini 2 L med lågflödesväljare
const LIV_MINI_2L: FlowDuration[] = [
  { flow: 0.01, minutes: 27 * 1440 },           // 27 d
  { flow: 0.02, minutes: 13 * 1440 + 12 * 60 }, // 13 d 12 h
  { flow: 0.03, minutes: 9 * 1440 },            // 9 d
  { flow: 0.04, minutes: 6 * 1440 + 21 * 60 },  // 6 d 21 h
  { flow: 0.05, minutes: 5 * 1440 + 12 * 60 },  // 5 d 12 h
  { flow: 0.06, minutes: 4 * 1440 + 14 * 60 },  // 4 d 14 h
  { flow: 0.07, minutes: 3 * 1440 + 21 * 60 },  // 3 d 21 h
  { flow: 0.08, minutes: 3 * 1440 + 9 * 60 },   // 3 d 9 h
  { flow: 0.09, minutes: 3 * 1440 },            // 3 d
  { flow: 0.10, minutes: 2 * 1440 + 16 * 60 }, // 2 d 16 h
  { flow: 0.12, minutes: 2 * 1440 + 7 * 60 },  // 2 d 7 h
  { flow: 0.20, minutes: 33 * 60 },             // 33 h
];

export const TANKS: Record<TankType, { label: string; flows: FlowDuration[] }> = {
  liv_mini_2l: {
    label: "LIV Mini 2 L (lågflödesväljare)",
    flows: LIV_MINI_2L,
  },
};

export function flowOptions(type: TankType): number[] {
  return TANKS[type].flows.map((f) => f.flow);
}

export function durationMinutes(type: TankType, flow: number): number | null {
  const row = TANKS[type].flows.find((f) => Math.abs(f.flow - flow) < 1e-9);
  return row ? row.minutes : null;
}

export function formatFlow(flow: number): string {
  return flow.toFixed(2).replace(".", ",") + " l/min";
}

/** Format minutes as "Xd Yh" / "Yh Zm" / "Zm". */
export function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0 m";
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const mins = Math.floor(totalMinutes % 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export interface OxygenTankRow {
  id: string;
  family_id: string;
  tank_type: string;
  flow_lpm: number;
  started_at: string;
  replaced_at: string | null;
  notes: string | null;
  paused_at?: string | null;
  paused_seconds?: number | null;
}

export interface RemainingInfo {
  totalMinutes: number;
  elapsedMinutes: number;
  remainingMinutes: number;
  emptyAt: Date;
  percentRemaining: number;
  status: "ok" | "low" | "critical" | "empty" | "paused";
  paused: boolean;
}

export function computeRemaining(tank: OxygenTankRow, now: Date = new Date()): RemainingInfo | null {
  const total = durationMinutes(tank.tank_type as TankType, Number(tank.flow_lpm));
  if (total == null) return null;
  const startedMs = new Date(tank.started_at).getTime();
  const pausedSec = Number(tank.paused_seconds ?? 0);
  const isPaused = !!tank.paused_at;
  const liveExtraSec = isPaused
    ? Math.max(0, (now.getTime() - new Date(tank.paused_at!).getTime()) / 1000)
    : 0;
  const totalPausedMin = (pausedSec + liveExtraSec) / 60;
  const elapsed = Math.max(0, (now.getTime() - startedMs) / 60000 - totalPausedMin);
  const remaining = Math.max(0, total - elapsed);
  // Empty time accounts for paused time so far; if currently paused it shifts
  // forward in real time as the clock ticks.
  const emptyAt = new Date(startedMs + (total + totalPausedMin) * 60000);
  const pct = total > 0 ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0;
  let status: RemainingInfo["status"] = "ok";
  if (isPaused) status = "paused";
  else if (remaining <= 0) status = "empty";
  else if (remaining < 120) status = "critical";
  else if (remaining < 720) status = "low";
  return {
    totalMinutes: total,
    elapsedMinutes: elapsed,
    remainingMinutes: remaining,
    emptyAt,
    percentRemaining: pct,
    status,
    paused: isPaused,
  };
}


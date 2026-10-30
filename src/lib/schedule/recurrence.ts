// Single, timezone-aware expander for recurring task masters. Used by BOTH the
// app (useAppointments) and the push sweep (dispatch-task-notifications) so an
// occurrence has the exact same `occurrence_at` everywhere. Wall-clock dates,
// weekdays and times are computed in the family timezone `tz`, never in the
// browser's or the server's (UTC) zone. Hourly series stay absolute steps.
import { wallClockIn, zonedWallClockToDate } from "@/lib/time/family-tz";

export const DEFAULT_FAMILY_TZ = "Europe/Stockholm";

export type RecurrenceMaster = {
  starts_at: string;
  recurrence_freq: string | null;
  recurrence_interval: number | null;
  recurrence_byweekday: number[] | null;
  recurrence_times_of_day: string[] | null;
};

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;
const CAP = 2000;

function parseHHMM(s: string): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!(hh >= 0 && hh <= 23) || !(mm >= 0 && mm <= 59)) return null;
  return `${String(hh).padStart(2, "0")}:${m[2]}`;
}

/** Day number (days since epoch) of a YYYY-MM-DD string, calendar-only. */
function dayNum(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / MS_DAY);
}
function dayStr(n: number): string {
  return new Date(n * MS_DAY).toISOString().slice(0, 10);
}

/** YYYY-MM-DD shifted by `n` calendar days. */
export function shiftDateStr(dateStr: string, n: number): string {
  return dayStr(dayNum(dateStr) + n);
}

/** Midnight (00:00) of `dateStr` in `tz` as an absolute instant. */
export function startOfDayIn(dateStr: string, tz: string): Date {
  return zonedWallClockToDate(dateStr, "00:00", tz);
}

export function expandRecurrence(
  master: RecurrenceMaster,
  rangeStart: Date,
  rangeEnd: Date,
  tz: string,
): Date[] {
  const out: Date[] = [];
  const freq = master.recurrence_freq;
  if (!freq) return out;
  const interval = Math.max(1, master.recurrence_interval ?? 1);
  const start = new Date(master.starts_at);
  if (Number.isNaN(start.getTime()) || start >= rangeEnd) return out;

  if (freq === "hourly") {
    const stepMs = interval * MS_HOUR;
    let t = start.getTime();
    if (t < rangeStart.getTime()) {
      t += Math.ceil((rangeStart.getTime() - t) / stepMs) * stepMs;
    }
    for (let n = 0; t < rangeEnd.getTime() && n < CAP; n++, t += stepMs) {
      out.push(new Date(t));
    }
    return out;
  }

  const startWall = wallClockIn(start, tz);
  const startDay = dayNum(startWall.todayStr);
  const listed = (master.recurrence_times_of_day ?? [])
    .map(parseHHMM)
    .filter((x): x is string => !!x);
  const times =
    listed.length > 0
      ? listed
      : [`${String(startWall.hh).padStart(2, "0")}:${String(startWall.mm).padStart(2, "0")}`];

  const seen = new Set<number>();
  const emit = (ds: string) => {
    for (const tm of times) {
      const occ = zonedWallClockToDate(ds, tm, tz);
      const ms = occ.getTime();
      if (Number.isNaN(ms) || seen.has(ms)) continue;
      if (occ >= start && occ >= rangeStart && occ < rangeEnd) {
        seen.add(ms);
        out.push(occ);
      }
    }
  };

  // Walk wall-clock days in tz with one day of slack on each side.
  const first = Math.max(startDay, dayNum(wallClockIn(rangeStart, tz).todayStr) - 1);
  const last = dayNum(wallClockIn(rangeEnd, tz).todayStr) + 1;

  if (freq === "daily") {
    for (let d = first, n = 0; d <= last && n < CAP; d++, n++) {
      if ((d - startDay) % interval === 0) emit(dayStr(d));
    }
  } else if (freq === "weekly") {
    const weekdays = (master.recurrence_byweekday ?? []).filter((w) => w >= 0 && w <= 6);
    if (weekdays.length === 0) return out;
    for (let d = first, n = 0; d <= last && n < CAP; d++, n++) {
      // Epoch day 0 (1970-01-01) was a Thursday (4).
      if (weekdays.includes((((d + 4) % 7) + 7) % 7)) emit(dayStr(d));
    }
  } else if (freq === "monthly") {
    const [sy, sm, sd] = startWall.todayStr.split("-").map(Number);
    for (let d = first, n = 0; d <= last && n < CAP; d++, n++) {
      const [y, m, dd] = dayStr(d).split("-").map(Number);
      if (dd !== sd) continue;
      const months = (y - sy) * 12 + (m - sm);
      if (months >= 0 && months % interval === 0) emit(dayStr(d));
    }
  }
  out.sort((a, b) => a.getTime() - b.getTime());
  return out;
}

/**
 * Late push rule: only when the task has a positive late threshold AND start
 * pushes are on (routine templates with notify_start=false never get one).
 */
export function shouldSendLatePush(
  c: { occurrence_ms: number; late_after_minutes: number; notify_start: boolean },
  nowMs: number,
): boolean {
  if (!(c.late_after_minutes > 0)) return false;
  if (!c.notify_start) return false;
  return nowMs >= c.occurrence_ms + c.late_after_minutes * 60_000;
}

/**
 * "This occurrence only" edits may change the time but not the date:
 * the new start must fall on the same calendar day (family timezone)
 * as the original occurrence slot.
 */
export function isSameFamilyDay(aIso: string, bIso: string, tz: string): boolean {
  return wallClockIn(new Date(aIso), tz).dateStr === wallClockIn(new Date(bIso), tz).dateStr;
}

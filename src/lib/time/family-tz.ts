// Server-safe helpers for computing wall-clock time in a family's timezone.
// Uses Intl.DateTimeFormat with the timezone in options (locale stays 'en-GB'
// so we get stable 24h HH:mm and YYYY-MM-DD parts regardless of family
// language). Falls back to 'Europe/Stockholm' if the stored zone is invalid.

const FALLBACK_TZ = "Europe/Stockholm";

function safeFormatter(tz: string): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: FALLBACK_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
}

function partsOf(date: Date, tz: string): Record<string, string> {
  const parts = safeFormatter(tz).formatToParts(date);
  const out: Record<string, string> = {};
  for (const p of parts) if (p.type !== "literal") out[p.type] = p.value;
  return out;
}

export function wallClockIn(
  date: Date,
  tz: string,
): { todayStr: string; nowMin: number; hh: number; mm: number } {
  const p = partsOf(date, tz);
  const hh = Number(p.hour);
  // Intl can return "24" for midnight in some zones; normalize to 0.
  const hour = hh === 24 ? 0 : hh;
  const mm = Number(p.minute);
  return {
    todayStr: `${p.year}-${p.month}-${p.day}`,
    nowMin: hour * 60 + mm,
    hh: hour,
    mm,
  };
}

export function formatTimeIn(iso: string, tz: string): string {
  const p = partsOf(new Date(iso), tz);
  const hh = p.hour === "24" ? "00" : p.hour;
  return `${hh}:${p.minute}`;
}

// Returns YYYY-MM-DD for the day before `date` in `tz`. Used to widen
// "today" queries around midnight so a family whose local date has just
// rolled over still sees yesterday's not-yet-processed slots.
export function yesterdayStrIn(date: Date, tz: string): string {
  const oneDayMs = 24 * 60 * 60 * 1000;
  return wallClockIn(new Date(date.getTime() - oneDayMs), tz).todayStr;
}

// ---------------------------------------------------------------------------
// Read helpers for form inputs: render an absolute Date as the wall-clock
// value the family's timezone would display, formatted for HTML inputs.
// ---------------------------------------------------------------------------

/** YYYY-MM-DD in `tz` — feed to <input type="date">. */
export function dateInputIn(date: Date, tz: string): string {
  return wallClockIn(date, tz).todayStr;
}

/** YYYY-MM-DDTHH:MM in `tz` — feed to <input type="datetime-local">. */
export function dateTimeInputIn(date: Date, tz: string): string {
  const p = partsOf(date, tz);
  const hh = p.hour === "24" ? "00" : p.hour;
  return `${p.year}-${p.month}-${p.day}T${hh}:${p.minute}`;
}

// ---------------------------------------------------------------------------
// Write helper: interpret a wall-clock date+time in `tz` and return the
// absolute UTC instant it represents. Inverse of `wallClockIn`.
// ---------------------------------------------------------------------------

/**
 * Convert a wall-clock (YYYY-MM-DD, HH:MM) in `tz` to a UTC Date.
 *
 * Method: pretend the wall clock is UTC to get a first guess, then format
 * that guess in `tz` and subtract the resulting offset. IANA offsets are
 * integer minutes, so one iteration is exact except at the spring-forward
 * gap — for a nonexistent local time (e.g. 02:30 in a zone that jumps
 * 02:00→03:00) the result is an approximate instant near the transition,
 * which is acceptable for this domain (appointments/shifts/schedule).
 * Falls back to Europe/Stockholm if `tz` is invalid, matching wallClockIn.
 */
export function zonedWallClockToDate(
  dateStr: string,
  timeStr: string,
  tz: string,
): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  if (
    !Number.isFinite(y) ||
    !Number.isFinite(m) ||
    !Number.isFinite(d) ||
    !Number.isFinite(hh) ||
    !Number.isFinite(mm)
  ) {
    return new Date(NaN);
  }
  const targetUtcMinutes =
    Date.UTC(y, m - 1, d, hh, mm) / 60000;
  const guess = new Date(targetUtcMinutes * 60000);
  const p = partsOf(guess, tz);
  const seenY = Number(p.year);
  const seenMo = Number(p.month);
  const seenD = Number(p.day);
  const seenH = p.hour === "24" ? 0 : Number(p.hour);
  const seenMi = Number(p.minute);
  const seenUtcMinutes =
    Date.UTC(seenY, seenMo - 1, seenD, seenH, seenMi) / 60000;
  const offsetMin = seenUtcMinutes - targetUtcMinutes;
  return new Date((targetUtcMinutes - offsetMin) * 60000);
}

// ---------------------------------------------------------------------------
// Medication course helpers (dose-count model).
//
// A course = N doses laid out on the med's fixed daily clock-times, counted
// from an anchor `firstDoseAt`. Partial first day drops already-passed times;
// last day stops after the Nth scheduled time. All walking is done in the
// family timezone `tz`, then converted back to absolute UTC via
// zonedWallClockToDate. Pure function — prime Vitest candidate.
// ---------------------------------------------------------------------------

function normalizedTimes(times: string[] | null | undefined): string[] {
  return [...(times ?? [])]
    .filter((t) => /^\d{2}:\d{2}$/.test(t))
    .sort();
}

/** YYYY-MM-DD ± n whole days (calendar, ignoring tz — safe for wall-clock date strings). */
function shiftDayStr(dayStr: string, days: number): string {
  const [y, m, d] = dayStr.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() + days);
  const yy = t.getUTCFullYear();
  const mm = String(t.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(t.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Compute the absolute UTC instant of the Nth (last) dose in a course.
 * Walks the sorted daily clock-times in `tz` from the anchor forward,
 * skipping day-1 times before the anchor, until N doses are counted.
 */
export function courseLastDoseAt(
  firstDoseAt: Date,
  totalDoses: number,
  times: string[],
  tz: string,
): Date {
  const sorted = normalizedTimes(times);
  if (sorted.length === 0 || totalDoses < 1) return firstDoseAt;
  const anchor = wallClockIn(firstDoseAt, tz);
  const anchorMin = anchor.hh * 60 + anchor.mm;
  let dayStr = anchor.todayStr;
  let isFirstDay = true;
  let dosesLeft = totalDoses;
  let lastDay = dayStr;
  let lastTime = sorted[0];
  // Bound the walk: N doses / min 1 per day gives a hard ceiling.
  const maxIter = totalDoses + 2;
  for (let i = 0; i < maxIter && dosesLeft > 0; i++) {
    for (const tm of sorted) {
      const [hh, mm] = tm.split(":").map(Number);
      const minOfDay = hh * 60 + mm;
      if (isFirstDay && minOfDay < anchorMin) continue;
      lastDay = dayStr;
      lastTime = tm;
      dosesLeft -= 1;
      if (dosesLeft === 0) break;
    }
    if (dosesLeft === 0) break;
    isFirstDay = false;
    dayStr = shiftDayStr(dayStr, 1);
  }
  return zonedWallClockToDate(lastDay, lastTime, tz);
}

/**
 * Count how many scheduled course doses fall within [firstDoseAt, now],
 * capped at totalDoses. Used for the "Dose n of total" chip.
 */
export function courseProgressAt(
  firstDoseAt: Date,
  totalDoses: number,
  times: string[],
  tz: string,
  now: Date,
): number {
  if (now.getTime() < firstDoseAt.getTime()) return 0;
  const sorted = normalizedTimes(times);
  if (sorted.length === 0 || totalDoses < 1) return 0;
  const anchor = wallClockIn(firstDoseAt, tz);
  const anchorMin = anchor.hh * 60 + anchor.mm;
  const nowWc = wallClockIn(now, tz);
  const nowMin = nowWc.hh * 60 + nowWc.mm;
  let dayStr = anchor.todayStr;
  let isFirstDay = true;
  let count = 0;
  const maxIter = totalDoses + 2;
  for (let i = 0; i < maxIter && count < totalDoses; i++) {
    if (dayStr > nowWc.todayStr) break;
    for (const tm of sorted) {
      const [hh, mm] = tm.split(":").map(Number);
      const minOfDay = hh * 60 + mm;
      if (isFirstDay && minOfDay < anchorMin) continue;
      if (dayStr === nowWc.todayStr && minOfDay > nowMin) continue;
      count += 1;
      if (count >= totalDoses) break;
    }
    if (dayStr === nowWc.todayStr) break;
    isFirstDay = false;
    dayStr = shiftDayStr(dayStr, 1);
  }
  return count;
}

/**
 * Default anchor for a new course: the next upcoming scheduled clock-time in
 * `tz`, or tomorrow's first time if all of today's have passed.
 */
export function nextUpcomingDoseAt(
  times: string[],
  tz: string,
  now: Date = new Date(),
): Date | null {
  const sorted = normalizedTimes(times);
  if (sorted.length === 0) return null;
  const wc = wallClockIn(now, tz);
  const nowMin = wc.hh * 60 + wc.mm;
  for (const tm of sorted) {
    const [hh, mm] = tm.split(":").map(Number);
    if (hh * 60 + mm >= nowMin) return zonedWallClockToDate(wc.todayStr, tm, tz);
  }
  return zonedWallClockToDate(shiftDayStr(wc.todayStr, 1), sorted[0], tz);
}


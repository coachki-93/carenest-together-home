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

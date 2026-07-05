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

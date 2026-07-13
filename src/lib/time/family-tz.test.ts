import { describe, it, expect } from "vitest";
import {
  zonedWallClockToDate,
  courseLastDoseAt,
  courseProgressAt,
  nextUpcomingDoseAt,
  wallClockIn,
} from "./family-tz";

const TZ = "Europe/Stockholm";

/** Format a Date as "YYYY-MM-DD HH:MM" in `tz` for readable assertions. */
function wc(d: Date, tz: string = TZ): string {
  const { todayStr, hh, mm } = wallClockIn(d, tz);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${todayStr} ${pad(hh)}:${pad(mm)}`;
}

describe("zonedWallClockToDate", () => {
  it("interprets summer wall-clock as CEST (+2)", () => {
    expect(zonedWallClockToDate("2026-07-13", "09:00", TZ).toISOString()).toBe(
      "2026-07-13T07:00:00.000Z",
    );
  });
  it("interprets winter wall-clock as CET (+1)", () => {
    expect(zonedWallClockToDate("2026-01-13", "09:00", TZ).toISOString()).toBe(
      "2026-01-13T08:00:00.000Z",
    );
  });
  it("returns Invalid Date for malformed input", () => {
    expect(
      Number.isNaN(zonedWallClockToDate("nope", "??:??", TZ).getTime()),
    ).toBe(true);
  });
});

describe("courseLastDoseAt", () => {
  it("antibiotics worked example: 20 doses on 10:00/22:00, anchor Mon 13 Jul 22:00", () => {
    const anchor = zonedWallClockToDate("2026-07-13", "22:00", TZ);
    const last = courseLastDoseAt(anchor, 20, ["10:00", "22:00"], TZ);
    expect(wc(last)).toBe("2026-07-23 10:00");
  });
  it("accepts unsorted times", () => {
    const anchor = zonedWallClockToDate("2026-07-13", "22:00", TZ);
    const last = courseLastDoseAt(anchor, 20, ["22:00", "10:00"], TZ);
    expect(wc(last)).toBe("2026-07-23 10:00");
  });
  it("uneven times, 3 doses with partial first day", () => {
    const anchor = zonedWallClockToDate("2026-07-13", "20:00", TZ);
    const last = courseLastDoseAt(anchor, 3, ["08:00", "20:00"], TZ);
    expect(wc(last)).toBe("2026-07-14 20:00");
  });
  it("1 dose = last is the anchor moment", () => {
    const anchor = zonedWallClockToDate("2026-07-13", "10:00", TZ);
    const last = courseLastDoseAt(anchor, 1, ["10:00", "22:00"], TZ);
    expect(wc(last)).toBe("2026-07-13 10:00");
  });
  it("once-daily, 10 doses", () => {
    const anchor = zonedWallClockToDate("2026-07-13", "09:00", TZ);
    const last = courseLastDoseAt(anchor, 10, ["09:00"], TZ);
    expect(wc(last)).toBe("2026-07-22 09:00");
  });
  it("crosses spring-forward DST cleanly", () => {
    const anchor = zonedWallClockToDate("2026-03-28", "09:00", TZ);
    const last = courseLastDoseAt(anchor, 4, ["09:00"], TZ);
    expect(wc(last)).toBe("2026-03-31 09:00");
  });
  it("empty times returns the anchor unchanged", () => {
    const anchor = zonedWallClockToDate("2026-07-13", "09:00", TZ);
    const last = courseLastDoseAt(anchor, 5, [], TZ);
    expect(last.getTime()).toBe(anchor.getTime());
  });
});

describe("nextUpcomingDoseAt", () => {
  it("returns today's later dose", () => {
    const now = zonedWallClockToDate("2026-07-13", "11:00", TZ);
    const next = nextUpcomingDoseAt(["10:00", "22:00"], TZ, now);
    expect(next && wc(next)).toBe("2026-07-13 22:00");
  });
  it("rolls to tomorrow when all today's times passed", () => {
    const now = zonedWallClockToDate("2026-07-13", "23:00", TZ);
    const next = nextUpcomingDoseAt(["10:00", "22:00"], TZ, now);
    expect(next && wc(next)).toBe("2026-07-14 10:00");
  });
  it("empty times returns null", () => {
    expect(nextUpcomingDoseAt([], TZ, new Date())).toBeNull();
  });
});

describe("courseProgressAt", () => {
  const anchor = zonedWallClockToDate("2026-07-13", "22:00", TZ);
  const times = ["10:00", "22:00"];

  it("counts day-1 22:00 + day-2 10:00 by 2026-07-14 12:00 → 2", () => {
    const now = zonedWallClockToDate("2026-07-14", "12:00", TZ);
    expect(courseProgressAt(anchor, 20, times, TZ, now)).toBe(2);
  });
  it("returns 0 before the anchor", () => {
    const now = zonedWallClockToDate("2026-07-13", "08:00", TZ);
    expect(courseProgressAt(anchor, 20, times, TZ, now)).toBe(0);
  });
  it("caps at totalDoses well past the course end", () => {
    const now = zonedWallClockToDate("2027-01-01", "12:00", TZ);
    expect(courseProgressAt(anchor, 20, times, TZ, now)).toBe(20);
  });
});

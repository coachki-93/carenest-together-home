import { describe, expect, it } from "vitest";
import {
  expandRecurrence,
  shouldSendLatePush,
  startOfDayIn,
  shiftDateStr,
  type RecurrenceMaster,
} from "./recurrence";
import { expandMastersToInstances, type Appointment } from "@/lib/data/appointments";
import { wallClockIn } from "@/lib/time/family-tz";

const STO = "Europe/Stockholm";
const iso = (ds: Date[]) => ds.map((d) => d.toISOString());

function master(p: Partial<RecurrenceMaster>): RecurrenceMaster {
  return {
    starts_at: "2026-01-01T00:00:00Z",
    recurrence_freq: "daily",
    recurrence_interval: 1,
    recurrence_byweekday: null,
    recurrence_times_of_day: null,
    ...p,
  };
}
const dayRange = (ds: string, tz = STO): [Date, Date] => [
  startOfDayIn(ds, tz),
  startOfDayIn(shiftDateStr(ds, 1), tz),
];

describe("expandRecurrence", () => {
  const daily8 = master({ recurrence_times_of_day: ["08:00"] });

  it("Stockholm 08:00 in winter is 07:00Z", () => {
    expect(iso(expandRecurrence(daily8, ...dayRange("2026-01-15"), STO))).toEqual([
      "2026-01-15T07:00:00.000Z",
    ]);
  });
  it("Stockholm 08:00 in summer is 06:00Z", () => {
    expect(iso(expandRecurrence(daily8, ...dayRange("2026-07-15"), STO))).toEqual([
      "2026-07-15T06:00:00.000Z",
    ]);
  });

  it("daily 08:00 stays 08:00 local across the March DST change", () => {
    const occ = expandRecurrence(daily8, startOfDayIn("2027-03-27", STO), startOfDayIn("2027-03-30", STO), STO);
    expect(iso(occ)).toEqual([
      "2027-03-27T07:00:00.000Z",
      "2027-03-28T06:00:00.000Z",
      "2027-03-29T06:00:00.000Z",
    ]);
  });
  it("daily 08:00 stays 08:00 local across the October DST change", () => {
    const occ = expandRecurrence(daily8, startOfDayIn("2026-10-24", STO), startOfDayIn("2026-10-27", STO), STO);
    expect(iso(occ)).toEqual([
      "2026-10-24T06:00:00.000Z",
      "2026-10-25T07:00:00.000Z",
      "2026-10-26T07:00:00.000Z",
    ]);
  });
  it("02:30 on both DST days yields exactly one occurrence", () => {
    const m = master({ recurrence_times_of_day: ["02:30"] });
    expect(expandRecurrence(m, ...dayRange("2027-03-28"), STO)).toHaveLength(1);
    const oct = expandRecurrence(m, ...dayRange("2026-10-25"), STO);
    expect(oct).toHaveLength(1);
    expect(wallClockIn(oct[0], STO)).toMatchObject({ todayStr: "2026-10-25", hh: 2, mm: 30 });
  });

  it("no times-of-day: uses master start wall-clock in tz across DST", () => {
    // Started in summer at 09:00 Stockholm (07:00Z); after DST still 09:00 local.
    const m = master({ starts_at: "2026-07-01T07:00:00Z" });
    expect(iso(expandRecurrence(m, ...dayRange("2026-11-02"), STO))).toEqual([
      "2026-11-02T08:00:00.000Z",
    ]);
  });

  it("weekly Sunday 00:30 Stockholm", () => {
    const m = master({ recurrence_freq: "weekly", recurrence_byweekday: [0], recurrence_times_of_day: ["00:30"] });
    const occ = expandRecurrence(m, startOfDayIn("2026-01-05", STO), startOfDayIn("2026-01-19", STO), STO);
    expect(iso(occ)).toEqual(["2026-01-10T23:30:00.000Z", "2026-01-17T23:30:00.000Z"]);
    const summer = expandRecurrence(m, ...dayRange("2026-07-12"), STO);
    expect(iso(summer)).toEqual(["2026-07-11T22:30:00.000Z"]);
  });

  it("monthly on the 1st", () => {
    const m = master({
      recurrence_freq: "monthly",
      starts_at: "2026-01-01T08:00:00Z", // 09:00 Stockholm
    });
    const occ = expandRecurrence(m, new Date("2026-02-15T00:00:00Z"), new Date("2026-05-15T00:00:00Z"), STO);
    expect(iso(occ)).toEqual([
      "2026-03-01T08:00:00.000Z",
      "2026-04-01T07:00:00.000Z",
      "2026-05-01T07:00:00.000Z",
    ]);
  });

  it("non-Stockholm timezone (New York)", () => {
    const NY = "America/New_York";
    expect(iso(expandRecurrence(daily8, ...dayRange("2026-01-15", NY), NY))).toEqual([
      "2026-01-15T13:00:00.000Z",
    ]);
    expect(iso(expandRecurrence(daily8, ...dayRange("2026-07-15", NY), NY))).toEqual([
      "2026-07-15T12:00:00.000Z",
    ]);
  });

  it("00:30 and 23:30 daily tasks land on the right family day", () => {
    const m = master({ recurrence_times_of_day: ["00:30", "23:30"] });
    for (const ds of ["2026-01-15", "2026-07-15"]) {
      const occ = expandRecurrence(m, ...dayRange(ds), STO);
      expect(occ).toHaveLength(2);
      for (const o of occ) expect(wallClockIn(o, STO).todayStr).toBe(ds);
    }
  });

  it("hourly stays absolute steps", () => {
    const m = master({ recurrence_freq: "hourly", recurrence_interval: 2, starts_at: "2026-10-24T22:00:00Z" });
    const occ = expandRecurrence(m, new Date("2026-10-25T00:00:00Z"), new Date("2026-10-25T05:00:00Z"), STO);
    expect(iso(occ)).toEqual([
      "2026-10-25T00:00:00.000Z",
      "2026-10-25T02:00:00.000Z",
      "2026-10-25T04:00:00.000Z",
    ]);
  });
});

describe("client/server parity", () => {
  it("app instances and sweep expansion give identical occurrence_at", () => {
    const m = {
      id: "m1",
      family_id: "f1",
      starts_at: "2026-03-20T07:00:00Z",
      ends_at: null,
      recurrence_freq: "daily",
      recurrence_interval: 1,
      recurrence_byweekday: null,
      recurrence_times_of_day: ["08:00", "20:00"],
      recurrence_parent_id: null,
      recurrence_override_at: null,
      recurrence_cancelled: false,
      title: "Task",
    } as unknown as Appointment;
    const start = startOfDayIn("2027-03-26", STO);
    const end = startOfDayIn("2027-03-31", STO);
    const client = expandMastersToInstances([m], new Map(), start, end, STO).map((i) => i.occurrence_start);
    const server = iso(expandRecurrence(m, start, end, STO));
    expect(client).toEqual(server);
    expect(server).toHaveLength(10);
  });
});

describe("shouldSendLatePush", () => {
  const t0 = Date.parse("2026-11-01T08:00:00Z");
  it("0 minutes never pushes", () => {
    expect(shouldSendLatePush({ occurrence_ms: t0, late_after_minutes: 0, notify_start: true }, t0 + 3600_000)).toBe(false);
  });
  it("notify_start=false never pushes", () => {
    expect(shouldSendLatePush({ occurrence_ms: t0, late_after_minutes: 10, notify_start: false }, t0 + 3600_000)).toBe(false);
  });
  it("pushes once late_after_minutes has passed", () => {
    const c = { occurrence_ms: t0, late_after_minutes: 10, notify_start: true };
    expect(shouldSendLatePush(c, t0 + 9 * 60_000)).toBe(false);
    expect(shouldSendLatePush(c, t0 + 10 * 60_000)).toBe(true);
  });
});

import { isSameFamilyDay } from "./recurrence";
describe("isSameFamilyDay (single-occurrence date lock)", () => {
  const tz = "Europe/Stockholm";
  it("allows a time change on the same Stockholm day", () => {
    expect(isSameFamilyDay("2026-11-02T20:30:00Z", "2026-11-02T07:00:00Z", tz)).toBe(true);
  });
  it("rejects a move to the next day", () => {
    expect(isSameFamilyDay("2026-11-03T08:00:00Z", "2026-11-02T08:00:00Z", tz)).toBe(false);
  });
  it("uses family tz, not UTC: 23:30 UTC is the next Stockholm day", () => {
    expect(isSameFamilyDay("2026-11-02T23:30:00Z", "2026-11-02T08:00:00Z", tz)).toBe(false);
  });
});

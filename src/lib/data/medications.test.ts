import { describe, it, expect } from "vitest";
import { buildTodaysDoses, type Medication } from "./medications";

const TZ = "Europe/Stockholm";

// Noon UTC on a given calendar date — safely lands on the same date in Stockholm.
const day = (yyyy: number, mm: number, dd: number) =>
  new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0));

const baseMed: Medication = {
  id: "m1",
  family_id: "f1",
  child_id: "c1",
  name: "Med",
  dose: null,
  route: null,
  notes: null,
  active: true,
  times: ["10:00", "22:00"],
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
  course_first_dose_at: null,
  course_total_doses: null,
} as unknown as Medication;

// Course: first dose 2026-07-13 22:00 Europe/Stockholm (20:00Z), N=20,
// times ["10:00","22:00"] → last dose = 2026-07-23 10:00 Stockholm (08:00Z).
const courseMed: Medication = {
  ...baseMed,
  id: "m2",
  course_first_dose_at: "2026-07-13T20:00:00.000Z",
  course_total_doses: 20,
} as Medication;

function times(rows: { time: string }[]) {
  return rows.map((r) => r.time).sort();
}

describe("buildTodaysDoses (tz-consistent)", () => {
  it("ongoing med emits both scheduled times", () => {
    const doses = buildTodaysDoses([baseMed], [], TZ, day(2026, 7, 15));
    expect(times(doses)).toEqual(["10:00", "22:00"]);
  });

  it("course day 1 drops 10:00 (before anchor), keeps 22:00", () => {
    const doses = buildTodaysDoses([courseMed], [], TZ, day(2026, 7, 13));
    expect(times(doses)).toEqual(["22:00"]);
  });

  it("course mid-course keeps both times", () => {
    const doses = buildTodaysDoses([courseMed], [], TZ, day(2026, 7, 20));
    expect(times(doses)).toEqual(["10:00", "22:00"]);
  });

  it("course final day keeps 10:00 (the Nth dose), drops 22:00", () => {
    const doses = buildTodaysDoses([courseMed], [], TZ, day(2026, 7, 23));
    expect(times(doses)).toEqual(["10:00"]);
  });

  it("course past the last dose emits nothing", () => {
    const doses = buildTodaysDoses([courseMed], [], TZ, day(2026, 7, 24));
    expect(doses).toEqual([]);
  });

  it("course before the anchor emits nothing", () => {
    const doses = buildTodaysDoses([courseMed], [], TZ, day(2026, 7, 12));
    expect(doses).toEqual([]);
  });

  it("emits absolute UTC instants that match the family wall clock", () => {
    const doses = buildTodaysDoses([baseMed], [], TZ, day(2026, 7, 15));
    const iso = doses.map((d) => d.scheduled_for.toISOString()).sort();
    // Stockholm is CEST (+2) in July → 10:00 = 08:00Z, 22:00 = 20:00Z.
    expect(iso).toEqual([
      "2026-07-15T08:00:00.000Z",
      "2026-07-15T20:00:00.000Z",
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { HOSPITAL_CATEGORIES, isPaused, pausedSelection } from "./paused";

const HOSPITAL_ON = "2026-07-25T10:00:00Z";

describe("isPaused", () => {
  it("returns false for every category when hospital mode is off", () => {
    for (const cat of HOSPITAL_CATEGORIES) {
      expect(
        isPaused({ at_hospital_since: null, hospital_paused: null }, cat),
      ).toBe(false);
      // Even a stored selection is ignored while hospital is off.
      expect(
        isPaused(
          {
            at_hospital_since: null,
            hospital_paused: { oxygen: true, care_place: true, tasks: true, handover: true },
          },
          cat,
        ),
      ).toBe(false);
    }
  });

  it("falls back to legacy default (oxygen + care_place) when selection is null or empty", () => {
    for (const paused of [null, undefined, {}] as const) {
      const fam = { at_hospital_since: HOSPITAL_ON, hospital_paused: paused };
      expect(isPaused(fam, "oxygen")).toBe(true);
      expect(isPaused(fam, "care_place")).toBe(true);
      expect(isPaused(fam, "tasks")).toBe(false);
      expect(isPaused(fam, "handover")).toBe(false);
    }
  });

  it("honors explicit per-key selection when hospital is on", () => {
    const fam = {
      at_hospital_since: HOSPITAL_ON,
      hospital_paused: { oxygen: false, care_place: true, tasks: true, handover: false },
    };
    expect(isPaused(fam, "oxygen")).toBe(false);
    expect(isPaused(fam, "care_place")).toBe(true);
    expect(isPaused(fam, "tasks")).toBe(true);
    expect(isPaused(fam, "handover")).toBe(false);
  });
});

describe("pausedSelection", () => {
  it("returns legacy default when no selection stored", () => {
    expect(pausedSelection({ at_hospital_since: null, hospital_paused: null })).toEqual({
      oxygen: true,
      care_place: true,
      tasks: false,
      handover: false,
    });
  });

  it("returns the stored selection when present", () => {
    expect(
      pausedSelection({
        at_hospital_since: HOSPITAL_ON,
        hospital_paused: { oxygen: false, care_place: true, tasks: true, handover: true },
      }),
    ).toEqual({ oxygen: false, care_place: true, tasks: true, handover: true });
  });
});

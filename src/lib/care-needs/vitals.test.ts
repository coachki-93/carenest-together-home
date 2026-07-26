import { describe, it, expect } from "vitest";
import {
  DEFAULT_VITALS,
  deriveVitalsFromCapabilities,
  visibleVitalsFor,
} from "./vitals";
import { VITAL_TYPES } from "@/lib/data/vitals";

describe("visibleVitalsFor", () => {
  it("falls back to DEFAULT_VITALS when careNeeds is empty", () => {
    expect(visibleVitalsFor({ capabilities: [] })).toEqual(DEFAULT_VITALS);
  });

  it("derives from a single capability when no explicit override", () => {
    expect(visibleVitalsFor({ capabilities: ["oxygen"] })).toEqual(["spo2"]);
  });

  it("unions implied vitals across multiple capabilities, deduped and canonical order", () => {
    const out = visibleVitalsFor({
      capabilities: ["ventilator", "g_tube", "seizures"],
    });
    // ventilator=[spo2,breathing] ∪ g_tube=[weight,fluids] ∪ seizures=[seizure]
    // canonical VITAL_TYPES order: heart_rate, spo2, temperature, weight, seizure, fluids, breathing, other
    expect(out).toEqual(["spo2", "weight", "seizure", "fluids", "breathing"]);
  });

  it("falls back to defaults when capabilities have no implied vitals", () => {
    // mobility/adl capabilities carry no impliedVitals
    expect(visibleVitalsFor({ capabilities: ["wheelchair", "bathing_assist"] })).toEqual(
      DEFAULT_VITALS,
    );
  });

  it("explicit override wins over derived", () => {
    const out = visibleVitalsFor({
      capabilities: ["oxygen"], // would derive [spo2]
      vitals: ["weight"],
    });
    expect(out).toEqual(["weight"]);
  });

  it("explicit override filters unknown vital keys", () => {
    const out = visibleVitalsFor({
      capabilities: [],
      vitals: ["weight", "not_a_real_vital", "spo2"],
    });
    expect(out).toEqual(["spo2", "weight"]);
  });

  it("explicit-but-all-invalid falls back to derived, then defaults", () => {
    // all-invalid override → treat as unset, fall through to derived → empty → defaults
    expect(visibleVitalsFor({ capabilities: [], vitals: ["garbage"] })).toEqual(
      DEFAULT_VITALS,
    );
  });

  it("deriveVitalsFromCapabilities ignores unknown capability keys", () => {
    expect(deriveVitalsFromCapabilities(["not_in_catalog", "oxygen"])).toEqual([
      "spo2",
    ]);
  });

  it("retention invariant: useLatestVitals fetch input is unchanged (VITAL_TYPES stays the full set)", () => {
    // Presence is a presentation filter — the data layer must still fetch every type
    // so toggling a vital back on immediately shows its stored latest value.
    expect(VITAL_TYPES).toContain("heart_rate");
    expect(VITAL_TYPES).toContain("spo2");
    expect(VITAL_TYPES).toContain("temperature");
    expect(VITAL_TYPES).toContain("weight");
    expect(VITAL_TYPES).toContain("seizure");
    expect(VITAL_TYPES).toContain("fluids");
    expect(VITAL_TYPES).toContain("breathing");
    expect(VITAL_TYPES).toContain("other");
    expect(VITAL_TYPES.length).toBe(8);
  });
});

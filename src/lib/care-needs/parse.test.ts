import { describe, it, expect } from "vitest";
import { parseCareNeeds } from "./parse";

describe("parseCareNeeds", () => {
  it("returns empty capabilities for undefined", () => {
    expect(parseCareNeeds(undefined)).toEqual({ capabilities: [] });
  });

  it("returns empty capabilities for null", () => {
    expect(parseCareNeeds(null)).toEqual({ capabilities: [] });
  });

  it("returns empty capabilities for non-object primitives and arrays", () => {
    expect(parseCareNeeds("foo")).toEqual({ capabilities: [] });
    expect(parseCareNeeds(42)).toEqual({ capabilities: [] });
    expect(parseCareNeeds([])).toEqual({ capabilities: [] });
  });

  it("filters non-strings out of capabilities and keeps unknown-key strings", () => {
    const result = parseCareNeeds({
      capabilities: ["oxygen", 3, null, "g_tube", "not_in_catalog"],
    });
    expect(result.capabilities).toEqual(["oxygen", "g_tube", "not_in_catalog"]);
  });

  it("roundtrips full shape with vitals, settings, and capabilitiesOther", () => {
    const raw = {
      capabilities: ["oxygen"],
      capabilitiesOther: "custom note",
      vitals: ["heart_rate", "spo2"],
      settings: { oxygen: { flow: 2 } },
    };
    const parsed = parseCareNeeds(raw);
    expect(parsed.capabilities).toEqual(["oxygen"]);
    expect(parsed.capabilitiesOther).toBe("custom note");
    expect(parsed.vitals).toEqual(["heart_rate", "spo2"]);
    expect(parsed.settings).toEqual({ oxygen: { flow: 2 } });
  });

  it("degrades gracefully when capabilities is malformed but other keys are valid", () => {
    const parsed = parseCareNeeds({
      capabilities: "oxygen",
      vitals: ["spo2"],
      settings: { foo: 1 },
    });
    expect(parsed.capabilities).toEqual([]);
    expect(parsed.vitals).toEqual(["spo2"]);
    expect(parsed.settings).toEqual({ foo: 1 });
  });
});

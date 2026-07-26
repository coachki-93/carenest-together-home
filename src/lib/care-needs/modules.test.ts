import { describe, it, expect } from "vitest";
import { hasModule, visibleModulesFor } from "./modules";

describe("hasModule('oxygen')", () => {
  it("false for empty care_needs", () => {
    expect(hasModule({ capabilities: [] }, "oxygen")).toBe(false);
    expect(hasModule(null, "oxygen")).toBe(false);
    expect(hasModule(undefined, "oxygen")).toBe(false);
  });

  it("true for oxygen capability", () => {
    expect(hasModule({ capabilities: ["oxygen"] }, "oxygen")).toBe(true);
  });

  it("true for tracheostomy, ventilator, cpap_bipap", () => {
    expect(hasModule({ capabilities: ["tracheostomy"] }, "oxygen")).toBe(true);
    expect(hasModule({ capabilities: ["ventilator"] }, "oxygen")).toBe(true);
    expect(hasModule({ capabilities: ["cpap_bipap"] }, "oxygen")).toBe(true);
  });

  it("false for airways caps that don't run a tank", () => {
    expect(hasModule({ capabilities: ["inhalations"] }, "oxygen")).toBe(false);
    expect(hasModule({ capabilities: ["cough_assist"] }, "oxygen")).toBe(false);
    expect(hasModule({ capabilities: ["suctioning"] }, "oxygen")).toBe(false);
  });

  it("false for unrelated caps", () => {
    expect(hasModule({ capabilities: ["seizures", "g_tube"] }, "oxygen")).toBe(false);
  });

  it("false for unknown capability keys (forward-compat)", () => {
    expect(hasModule({ capabilities: ["not_a_real_key"] }, "oxygen")).toBe(false);
  });
});

describe("visibleModulesFor", () => {
  it("returns ['oxygen'] for a trach child", () => {
    expect(visibleModulesFor({ capabilities: ["tracheostomy"] })).toEqual(["oxygen"]);
  });

  it("returns [] for a seizures-only child", () => {
    expect(visibleModulesFor({ capabilities: ["seizures"] })).toEqual([]);
  });

  it("dedupes when multiple caps imply the same module", () => {
    expect(
      visibleModulesFor({ capabilities: ["oxygen", "ventilator", "cpap_bipap"] }),
    ).toEqual(["oxygen"]);
  });
});

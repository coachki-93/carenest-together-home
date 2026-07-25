import { describe, it, expect } from "vitest";
import { normalizeDoseUnit, computePerDose } from "./medication-inventory";

describe("normalizeDoseUnit", () => {
  it("maps English + Swedish synonyms to canonical tokens", () => {
    expect(normalizeDoseUnit("ml")).toBe("ml");
    expect(normalizeDoseUnit("Milliliter")).toBe("ml");
    expect(normalizeDoseUnit("tablett")).toBe("pcs");
    expect(normalizeDoseUnit("TABLETS")).toBe("pcs");
    expect(normalizeDoseUnit("st")).toBe("pcs");
    expect(normalizeDoseUnit("kapslar")).toBe("pcs");
    expect(normalizeDoseUnit("mg")).toBe("mg");
    expect(normalizeDoseUnit("kilogram")).toBe("kg");
  });

  it("returns null for unknown / empty input", () => {
    expect(normalizeDoseUnit(null)).toBeNull();
    expect(normalizeDoseUnit("")).toBeNull();
    expect(normalizeDoseUnit("  ")).toBeNull();
    expect(normalizeDoseUnit("droppar")).toBeNull(); // deliberately unmapped
    expect(normalizeDoseUnit("iu")).toBeNull();
  });
});

describe("computePerDose", () => {
  it("same unit → trivial", () => {
    const r = computePerDose(7, "ml", "ml");
    expect(r).toEqual({ kind: "ok", perDose: 7, itemUnit: "ml", normalizedDoseUnit: "ml" });
  });

  it("within volume family — ml dose vs l stock", () => {
    const r = computePerDose(7, "ml", "l");
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") expect(r.perDose).toBeCloseTo(0.007, 12);
  });

  it("within mass family — mg dose vs g stock", () => {
    const r = computePerDose(500, "mg", "g");
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") expect(r.perDose).toBeCloseTo(0.5, 12);
  });

  it("within count family — tablett dose vs pcs stock", () => {
    const r = computePerDose(2, "tablett", "pcs");
    expect(r).toEqual({ kind: "ok", perDose: 2, itemUnit: "pcs", normalizedDoseUnit: "pcs" });
  });

  it("cross-family (mg vs ml) is refused", () => {
    const r = computePerDose(100, "mg", "ml");
    expect(r.kind).toBe("crossFamily");
    if (r.kind === "crossFamily") {
      expect(r.doseFamily).toBe("mass");
      expect(r.itemFamily).toBe("volume");
    }
  });

  it("cross-family (pcs vs ml) is refused", () => {
    const r = computePerDose(1, "tablett", "ml");
    expect(r.kind).toBe("crossFamily");
  });

  it("packaging item (box) is refused regardless of dose", () => {
    expect(computePerDose(1, "pcs", "box").kind).toBe("packaging");
    expect(computePerDose(7, "ml", "pack").kind).toBe("packaging");
  });

  it("unrecognized dose_unit downgrades to no-op (perDose NULL path)", () => {
    const r = computePerDose(5, "droppar", "ml");
    expect(r.kind).toBe("unrecognized");
  });

  it("invalid dose amount → invalidAmount (link allowed, perDose NULL)", () => {
    expect(computePerDose(0, "ml", "ml").kind).toBe("invalidAmount");
    expect(computePerDose(null, "ml", "ml").kind).toBe("invalidAmount");
    expect(computePerDose(Number.NaN, "ml", "ml").kind).toBe("invalidAmount");
  });
});

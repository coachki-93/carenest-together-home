import { describe, expect, it } from "vitest";
import {
  CHECKLIST_MAX_LABEL,
  CHECKLIST_MAX_STEPS,
  buildChecklistResult,
  cleanChecklist,
  untickedLabels,
} from "./checklist";

describe("checklist", () => {
  it("caps at 20 steps and 120 characters, drops blanks", () => {
    const many = Array.from({ length: 25 }, (_, i) => ({ id: `s${i}`, label: "x".repeat(200) }));
    const out = cleanChecklist([{ id: "b", label: "   " }, ...many]);
    expect(CHECKLIST_MAX_STEPS).toBe(20);
    expect(out).toHaveLength(20);
    expect(out[0].label).toHaveLength(CHECKLIST_MAX_LABEL);
    expect(CHECKLIST_MAX_LABEL).toBe(120);
  });
  it("snapshot marks ticked steps done", () => {
    const r = buildChecklistResult(
      [{ id: "a", label: "A" }, { id: "b", label: "B" }],
      new Set(["a"]),
    );
    expect(r).toEqual([
      { id: "a", label: "A", done: true },
      { id: "b", label: "B", done: false },
    ]);
  });
  it("NULL snapshot means no data, not unticked", () => {
    expect(untickedLabels(null)).toEqual([]);
    expect(untickedLabels(undefined)).toEqual([]);
  });
});

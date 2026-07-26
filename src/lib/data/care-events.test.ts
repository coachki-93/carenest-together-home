import { describe, it, expect } from "vitest";
import {
  canEditCareEvent,
  orderedEventTypesFor,
  suggestedTypesForCapability,
  _formatCareEventLine,
  CARE_EVENT_TYPES,
  type CareEventType,
} from "./care-events";

describe("canEditCareEvent", () => {
  const base = { created_by: "u1", created_at: new Date().toISOString() };

  it("blocks non-author", () => {
    expect(canEditCareEvent(base, "other")).toBe(false);
  });

  it("blocks when viewer is null", () => {
    expect(canEditCareEvent(base, null)).toBe(false);
  });

  it("allows author within window", () => {
    const now = new Date();
    const created = new Date(now.getTime() - 30 * 60_000); // 30 min ago
    expect(
      canEditCareEvent({ created_by: "u1", created_at: created.toISOString() }, "u1", now),
    ).toBe(true);
  });

  it("blocks author after 2h", () => {
    const now = new Date();
    const created = new Date(now.getTime() - 121 * 60_000);
    expect(
      canEditCareEvent({ created_by: "u1", created_at: created.toISOString() }, "u1", now),
    ).toBe(false);
  });
});

describe("suggestedTypesForCapability", () => {
  it("maps seizures → seizure", () => {
    expect(suggestedTypesForCapability("seizures")).toEqual(["seizure"]);
  });
  it("maps vns → seizure", () => {
    expect(suggestedTypesForCapability("vns")).toEqual(["seizure"]);
  });
  it("maps airways caps → desaturation + breathing_difficulty", () => {
    expect(suggestedTypesForCapability("oxygen")).toEqual([
      "desaturation",
      "breathing_difficulty",
    ]);
    expect(suggestedTypesForCapability("tracheostomy")).toEqual([
      "desaturation",
      "breathing_difficulty",
    ]);
  });
  it("maps feeding caps → vomiting + feed_issue", () => {
    expect(suggestedTypesForCapability("g_tube")).toEqual(["vomiting", "feed_issue"]);
  });
  it("maps metabolic → other", () => {
    expect(suggestedTypesForCapability("diabetes")).toEqual(["other"]);
  });
  it("returns [] for unknown or non-mapped", () => {
    expect(suggestedTypesForCapability("wheelchair")).toEqual([]);
    expect(suggestedTypesForCapability("does_not_exist")).toEqual([]);
  });
});

describe("orderedEventTypesFor", () => {
  it("puts relevant first, keeps canonical order, returns all", () => {
    const out = orderedEventTypesFor({ capabilities: ["seizures", "oxygen"] });
    expect(out.length).toBe(CARE_EVENT_TYPES.length);
    // First three should be seizure, desaturation, breathing_difficulty
    // (in canonical CARE_EVENT_TYPES order, all relevant floated first)
    expect(out.slice(0, 3)).toEqual<CareEventType[]>([
      "seizure",
      "desaturation",
      "breathing_difficulty",
    ]);
    // Every canonical type still present
    for (const t of CARE_EVENT_TYPES) expect(out).toContain(t);
  });

  it("returns canonical order when no capabilities", () => {
    expect(orderedEventTypesFor(null)).toEqual(CARE_EVENT_TYPES);
    expect(orderedEventTypesFor({})).toEqual(CARE_EVENT_TYPES);
  });

  it("ignores unknown capability keys gracefully", () => {
    expect(orderedEventTypesFor({ capabilities: ["nope"] })).toEqual(CARE_EVENT_TYPES);
  });
});

describe("_formatCareEventLine", () => {
  const labels = {
    typeLabel: (t: CareEventType) => t,
    severityLabel: (n: number) => `sev${n}`,
    actionPrefix: "Åtgärd",
    duration: (s: number) => `${s}s`,
  };

  it("formats a full event", () => {
    const line = _formatCareEventLine(
      {
        type: "seizure",
        description: "Tonic-clonic, left side",
        action_taken: "Buccolam given",
        severity: 2,
        duration_seconds: 90,
      },
      labels,
      "14:32",
    );
    expect(line).toBe(
      "• 14:32 seizure (sev2) · 90s — Tonic-clonic, left side · Åtgärd: Buccolam given",
    );
  });

  it("omits severity parens when null", () => {
    const line = _formatCareEventLine(
      {
        type: "vomiting",
        description: "Feed came back up",
        action_taken: null,
        severity: null,
        duration_seconds: null,
      },
      labels,
      "07:05",
    );
    expect(line).toBe("• 07:05 vomiting — Feed came back up");
    expect(line).not.toContain("()");
  });

  it("omits duration when 0 or null", () => {
    const line = _formatCareEventLine(
      {
        type: "other",
        description: "note",
        action_taken: null,
        severity: null,
        duration_seconds: 0,
      },
      labels,
      "10:00",
    );
    expect(line).not.toContain(" · 0s");
  });

  it("omits action when empty/whitespace", () => {
    const line = _formatCareEventLine(
      {
        type: "injury",
        description: "small scrape",
        action_taken: "   ",
        severity: 1,
        duration_seconds: null,
      },
      labels,
      "12:00",
    );
    expect(line).not.toContain("Åtgärd");
  });
});

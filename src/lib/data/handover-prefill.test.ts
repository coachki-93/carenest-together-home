import { describe, expect, it } from "vitest";
import {
  VITAL_CLUSTER_WINDOW_MS,
  clusterAbnormalVitals,
  isNoteworthyEvent,
  summarizeCareEvents,
  type AbnormalReading,
} from "./handover-prefill";
import type { CareEvent } from "./care-events";

function reading(
  iso: string,
  vitalType: string,
  text: string,
): AbnormalReading {
  return { at: new Date(iso), vitalType, text };
}

function event(partial: Partial<CareEvent> & { occurred_at: string }): CareEvent {
  return {
    id: partial.occurred_at,
    family_id: "fam",
    child_id: null,
    type: "vomiting",
    description: "",

    action_taken: null,
    severity: null,
    duration_seconds: null,
    active: true,
    created_at: partial.occurred_at,
    created_by: "user",
    ...partial,
  } as CareEvent;
}

/** Deterministic stand-in for the hook's tz-aware line renderer. */
const labels = {
  formatEvent: (ev: CareEvent) =>
    `• ${ev.occurred_at.slice(11, 16)} ${ev.type}${
      ev.severity != null ? ` (sev${ev.severity})` : ""
    } — ${ev.description ?? ""}`.trimEnd(),
  typeLabel: (t: string) => t,
  countTemplate: "{{type}} ×{{count}} {{during}}",
  duringShift: "during the shift",
};

describe("clusterAbnormalVitals", () => {
  it("groups readings inside the window into ONE cluster", () => {
    const clusters = clusterAbnormalVitals([
      reading("2026-08-09T02:46:10Z", "spo2", "SpO2 94%"),
      reading("2026-08-09T02:47:20Z", "heart_rate", "pulse 128"),
      reading("2026-08-09T02:48:00Z", "breathing", "breathing 64"),
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].map((r) => r.text)).toEqual([
      "SpO2 94%",
      "pulse 128",
      "breathing 64",
    ]);
  });

  it("orders vitals inside a cluster consistently, regardless of input order", () => {
    const clusters = clusterAbnormalVitals([
      reading("2026-08-09T02:48:00Z", "breathing", "breathing 64"),
      reading("2026-08-09T02:46:10Z", "heart_rate", "pulse 128"),
      reading("2026-08-09T02:47:00Z", "spo2", "SpO2 94%"),
    ]);
    expect(clusters[0].map((r) => r.vitalType)).toEqual([
      "spo2",
      "heart_rate",
      "breathing",
    ]);
  });

  it("starts a new cluster for a reading beyond the window", () => {
    const clusters = clusterAbnormalVitals([
      reading("2026-08-09T02:46:00Z", "spo2", "SpO2 94%"),
      reading("2026-08-09T02:50:00Z", "heart_rate", "pulse 128"),
    ]);
    expect(clusters).toHaveLength(2);
  });

  it("keeps a lone reading as its own single-vital cluster", () => {
    const clusters = clusterAbnormalVitals([
      reading("2026-08-09T02:46:00Z", "spo2", "SpO2 94%"),
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toHaveLength(1);
  });

  it("does NOT merge two episodes of the same vital hours apart", () => {
    const clusters = clusterAbnormalVitals([
      reading("2026-08-09T02:46:00Z", "spo2", "SpO2 94%"),
      reading("2026-08-09T06:10:00Z", "spo2", "SpO2 90%"),
    ]);
    expect(clusters).toHaveLength(2);
    expect(clusters[0][0].text).toBe("SpO2 94%");
    expect(clusters[1][0].text).toBe("SpO2 90%");
  });

  it("measures the window from the cluster's first reading", () => {
    // Chained readings 2 min apart: the 3rd is 4 min after the FIRST, so it
    // opens a new cluster instead of chaining indefinitely.
    const clusters = clusterAbnormalVitals(
      [
        reading("2026-08-09T02:00:00Z", "spo2", "a"),
        reading("2026-08-09T02:02:00Z", "heart_rate", "b"),
        reading("2026-08-09T02:04:00Z", "breathing", "c"),
        reading("2026-08-09T02:06:00Z", "temperature", "d"),
      ],
      VITAL_CLUSTER_WINDOW_MS,
    );
    expect(clusters).toHaveLength(2);
    expect(clusters[0]).toHaveLength(2);
    expect(clusters[1]).toHaveLength(2);
  });

});

describe("isNoteworthyEvent (safety carve-out)", () => {
  it("is noteworthy with a non-empty description", () => {
    expect(
      isNoteworthyEvent({
        description: "blod i kräkningen",
        action_taken: null,
        severity: null,
      }),
    ).toBe(true);
  });

  it("is noteworthy with an action taken", () => {
    expect(
      isNoteworthyEvent({
        description: "",
        action_taken: "gav syrgas",
        severity: null,
      }),
    ).toBe(true);
  });

  it("is noteworthy at severity 2 and 3", () => {
    expect(
      isNoteworthyEvent({ description: "", action_taken: null, severity: 2 }),
    ).toBe(true);
    expect(
      isNoteworthyEvent({ description: "", action_taken: null, severity: 3 }),
    ).toBe(true);
  });

  it("is routine at severity 1 or null with no note or action", () => {
    expect(
      isNoteworthyEvent({ description: "", action_taken: null, severity: 1 }),
    ).toBe(false);
    expect(
      isNoteworthyEvent({ description: "", action_taken: null, severity: null }),
    ).toBe(false);
  });

  it("treats whitespace-only note/action as routine", () => {
    expect(
      isNoteworthyEvent({ description: "   ", action_taken: "  ", severity: 1 }),
    ).toBe(false);
  });
});

describe("summarizeCareEvents", () => {
  it("collapses 4 routine same-type events into one count of 4", () => {
    const lines = summarizeCareEvents(
      ["01:00", "02:00", "03:00", "04:00"].map((hm) =>
        event({ occurred_at: `2026-08-09T${hm}:00Z` }),
      ),
      labels,
    );
    expect(lines).toEqual(["• vomiting ×4 during the shift"]);
  });

  it("prints a single event as a normal line, never ×1", () => {
    const lines = summarizeCareEvents(
      [event({ occurred_at: "2026-08-09T01:00:00Z" })],
      labels,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toContain("×");
    expect(lines[0]).toContain("01:00");
  });

  it("keeps different types in separate counts", () => {
    const lines = summarizeCareEvents(
      [
        event({ occurred_at: "2026-08-09T01:00:00Z", type: "vomiting" }),
        event({ occurred_at: "2026-08-09T01:30:00Z", type: "vomiting" }),
        event({ occurred_at: "2026-08-09T02:00:00Z", type: "seizure" }),
        event({ occurred_at: "2026-08-09T02:30:00Z", type: "seizure" }),
      ],
      labels,
    );
    expect(lines).toEqual([
      "• vomiting ×2 during the shift",
      "• seizure ×2 during the shift",
    ]);
  });

  it("surfaces a noteworthy event individually and collapses only the rest", () => {
    const lines = summarizeCareEvents(
      [
        event({ occurred_at: "2026-08-09T01:00:00Z" }),
        event({
          occurred_at: "2026-08-09T02:00:00Z",
          description: "blod i kräkningen",
          severity: 3,
        }),
        event({ occurred_at: "2026-08-09T03:00:00Z" }),
        event({ occurred_at: "2026-08-09T04:00:00Z" }),
      ],
      labels,
    );

    const countLines = lines.filter((l) => l.includes("×"));
    const noteworthy = lines.find((l) => l.includes("blod i kräkningen"));

    // The critical event surfaces on its own line…
    expect(noteworthy).toBeDefined();
    expect(noteworthy).toContain("02:00");
    // …and is NEVER hidden inside a count line.
    for (const l of countLines) {
      expect(l).not.toContain("blod i kräkningen");
    }
    // Only the 3 routine events collapse — never all 4.
    expect(countLines).toEqual(["• vomiting ×3 during the shift"]);
    expect(countLines[0]).not.toContain("×4");
  });

  it("never collapses noteworthy events even when they repeat", () => {
    const lines = summarizeCareEvents(
      [
        event({ occurred_at: "2026-08-09T01:00:00Z", severity: 2 }),
        event({ occurred_at: "2026-08-09T02:00:00Z", severity: 2 }),
        event({ occurred_at: "2026-08-09T03:00:00Z", severity: 3 }),
      ],
      labels,
    );
    expect(lines).toHaveLength(3);
    expect(lines.some((l) => l.includes("×"))).toBe(false);
  });
});

describe("summarizeOxygenEvents", () => {
  const start = new Date("2026-08-10T06:00:00Z");
  const end = new Date("2026-08-10T14:00:00Z");
  const labels = {
    fmtTime: (d: Date) => d.toISOString().slice(11, 16),
    tankLabel: (t: string) => t,
    flowLabel: (f: number) => `${f} l/min`,
    oxygenStarted: "Ny syrgastub påbörjad",
    oxygenReplaced: "Syrgastub utbytt",
    oxygenFlowChanged: "Syrgasflöde ändrat till",
    oxygenFlowChangedMany:
      "Syrgasflöde: nu {{flow}} (ändrat {{count}}× under passet, senast {{time}})",
  };
  const row = (
    iso: string,
    reason: string | null,
    flow = 0.05,
    replaced: string | null = null,
  ) => ({
    started_at: iso,
    replaced_at: replaced,
    tank_type: "liv_mini_2l",
    flow_lpm: flow,
    change_reason: reason,
  });

  it("collapses 4 flow changes into one summary line", () => {
    const lines = summarizeOxygenEvents(
      [
        row("2026-08-10T07:00:00Z", "flow_change", 0.05),
        row("2026-08-10T08:00:00Z", "flow_change", 0.1),
        row("2026-08-10T09:00:00Z", "flow_change", 0.25),
        row("2026-08-10T10:00:00Z", "flow_change", 0.5),
      ],
      start,
      end,
      labels,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(
      "• Syrgasflöde: nu 0.5 l/min (ändrat 4× under passet, senast 10:00)",
    );
    expect(lines[0]).not.toContain("utbytt");
  });

  it("renders a single flow change plainly, never ×1", () => {
    const lines = summarizeOxygenEvents(
      [row("2026-08-10T07:30:00Z", "flow_change", 0.1)],
      start,
      end,
      labels,
    );
    expect(lines).toEqual(["• 07:30 Syrgasflöde ändrat till 0.1 l/min"]);
    expect(lines[0]).not.toContain("×");
  });

  it("shows a real tank swap on its own line", () => {
    const lines = summarizeOxygenEvents(
      [row("2026-08-10T09:15:00Z", "tank_swap")],
      start,
      end,
      labels,
    );
    expect(lines).toEqual(["• 09:15 Syrgastub utbytt — liv_mini_2l"]);
  });

  it("keeps start lines and orders events chronologically", () => {
    const lines = summarizeOxygenEvents(
      [
        row("2026-08-10T11:00:00Z", "tank_swap"),
        row("2026-08-10T06:30:00Z", "start"),
      ],
      start,
      end,
      labels,
    );
    expect(lines[0]).toContain("06:30 Ny syrgastub påbörjad");
    expect(lines[1]).toContain("11:00 Syrgastub utbytt");
  });

  it("falls back to legacy behaviour for unstamped rows", () => {
    const lines = summarizeOxygenEvents(
      [row("2026-08-10T07:00:00Z", null, 0.05, "2026-08-10T09:00:00Z")],
      start,
      end,
      labels,
    );
    expect(lines).toEqual([
      "• 07:00 Ny syrgastub påbörjad — liv_mini_2l @ 0.05 l/min",
      "• 09:00 Syrgastub utbytt — liv_mini_2l",
    ]);
  });

  it("does not double-report a legacy close described by a stamped successor", () => {
    const lines = summarizeOxygenEvents(
      [
        row("2026-08-10T07:00:00Z", null, 0.05, "2026-08-10T09:00:00Z"),
        row("2026-08-10T09:00:00Z", "flow_change", 0.1),
      ],
      start,
      end,
      labels,
    );
    expect(lines).toEqual([
      "• 07:00 Ny syrgastub påbörjad — liv_mini_2l @ 0.05 l/min",
      "• 09:00 Syrgasflöde ändrat till 0.1 l/min",
    ]);
  });

  it("ignores events outside the shift window", () => {
    const lines = summarizeOxygenEvents(
      [row("2026-08-10T05:00:00Z", "flow_change"), row("2026-08-10T15:00:00Z", "tank_swap")],
      start,
      end,
      labels,
    );
    expect(lines).toEqual([]);
  });
});

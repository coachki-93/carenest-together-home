import { describe, expect, it } from "vitest";
import {
  clearAllScaffolds,
  mergeScaffoldStatus,
  readScaffoldsMap,
  shouldShowScaffold,
  SNOOZE_MS,
} from "./scaffold-status";

describe("readScaffoldsMap", () => {
  it("returns {} for missing / malformed input", () => {
    expect(readScaffoldsMap(null)).toEqual({});
    expect(readScaffoldsMap({})).toEqual({});
    expect(readScaffoldsMap({ settings: null })).toEqual({});
    expect(readScaffoldsMap({ settings: { scaffolds: [] } })).toEqual({});
  });

  it("keeps only recognised statuses", () => {
    const raw = {
      settings: {
        scaffolds: {
          g_tube: { status: "done" },
          nj_tube: { status: "bogus" },
          tpn: { status: "snoozed", until: "2026-01-01T00:00:00Z" },
        },
      },
    };
    expect(readScaffoldsMap(raw)).toEqual({
      g_tube: { status: "done", until: undefined },
      tpn: { status: "snoozed", until: "2026-01-01T00:00:00Z" },
    });
  });
});

describe("shouldShowScaffold", () => {
  const now = new Date("2026-07-26T12:00:00Z");
  it("shows when no entry", () => {
    expect(shouldShowScaffold({}, "g_tube", now)).toBe(true);
  });
  it("hides for done/dismissed", () => {
    expect(shouldShowScaffold({ g_tube: { status: "done" } }, "g_tube", now)).toBe(false);
    expect(shouldShowScaffold({ g_tube: { status: "dismissed" } }, "g_tube", now)).toBe(false);
  });
  it("snooze hides until expiry, then reappears", () => {
    const future = new Date(now.getTime() + 1000).toISOString();
    const past = new Date(now.getTime() - 1000).toISOString();
    expect(shouldShowScaffold({ g_tube: { status: "snoozed", until: future } }, "g_tube", now)).toBe(false);
    expect(shouldShowScaffold({ g_tube: { status: "snoozed", until: past } }, "g_tube", now)).toBe(true);
  });
});

describe("mergeScaffoldStatus", () => {
  it("adds a done flag while preserving unrelated settings and top-level keys", () => {
    const before = {
      capabilities: ["g_tube"],
      settings: { onboardingHint: "seen", scaffolds: { tpn: { status: "dismissed" } } },
    };
    const after = mergeScaffoldStatus(before, "g_tube", "done");
    const settings = after.settings as Record<string, unknown>;
    expect(after.capabilities).toEqual(["g_tube"]);
    expect(settings.onboardingHint).toBe("seen");
    expect(settings.scaffolds).toEqual({
      tpn: { status: "dismissed" },
      g_tube: { status: "done" },
    });
  });

  it("snooze computes a future until (~ SNOOZE_MS ahead)", () => {
    const now = new Date("2026-07-26T12:00:00Z");
    const after = mergeScaffoldStatus({}, "g_tube", "snoozed", now);
    const entry = (after.settings as { scaffolds: Record<string, { until?: string }> })
      .scaffolds.g_tube;
    const untilMs = Date.parse(entry.until!);
    expect(untilMs - now.getTime()).toBe(SNOOZE_MS);
  });

  it("later status overwrites earlier one for the same capability", () => {
    const step1 = mergeScaffoldStatus({}, "g_tube", "snoozed");
    const step2 = mergeScaffoldStatus(step1, "g_tube", "done");
    expect(readScaffoldsMap(step2).g_tube.status).toBe("done");
  });

  it("handles null/undefined care_needs cleanly", () => {
    const out = mergeScaffoldStatus(null, "g_tube", "dismissed");
    expect(readScaffoldsMap(out).g_tube).toEqual({ status: "dismissed", until: undefined });
  });
});

describe("clearAllScaffolds", () => {
  it("removes the scaffolds sub-object but keeps other settings + capabilities", () => {
    const before = {
      capabilities: ["g_tube"],
      settings: { onboardingHint: "seen", scaffolds: { g_tube: { status: "done" } } },
    };
    const after = clearAllScaffolds(before);
    const settings = after.settings as Record<string, unknown>;
    expect(after.capabilities).toEqual(["g_tube"]);
    expect(settings.onboardingHint).toBe("seen");
    expect(settings.scaffolds).toBeUndefined();
  });
});

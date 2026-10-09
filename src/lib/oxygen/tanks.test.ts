import { describe, expect, it } from "vitest";
import { computeRemaining, durationMinutes, type OxygenTankRow } from "./tanks";

const OLD: [number, number][] = [
  [0.01, 38880], [0.02, 19440], [0.03, 12960], [0.04, 9900], [0.05, 7920],
  [0.06, 6600], [0.07, 5580], [0.08, 4860], [0.09, 4320], [0.1, 3840],
  [0.12, 3300], [0.2, 1980], [0.3, 1320],
];
const NOW = new Date("2026-10-09T12:00:00.000Z");
const tank = (flow: number, elapsedMin: number): OxygenTankRow => ({
  id: "t", family_id: "f", tank_type: "liv_mini_2l", flow_lpm: flow,
  started_at: new Date(NOW.getTime() - elapsedMin * 60_000).toISOString(),
  replaced_at: null, notes: null, paused_at: null, paused_seconds: 0,
});
// Pre-change status rule (hardcoded 720/120).
const legacy = (rem: number) =>
  rem <= 0 ? "empty" : rem < 120 ? "critical" : rem < 720 ? "low" : "ok";

describe("durationMinutes", () => {
  it("new standard-regulator flows", () => {
    expect(durationMinutes("liv_mini_2l", 0.5)).toBe(800);
    expect(durationMinutes("liv_mini_2l", 0.75)).toBe(525);
    expect(durationMinutes("liv_mini_2l", 1.0)).toBe(400);
    expect(durationMinutes("liv_mini_2l", 3.0)).toBe(130);
  });
  it("old 13 rows unchanged", () => {
    for (const [f, m] of OLD) expect(durationMinutes("liv_mini_2l", f)).toBe(m);
  });
});

describe("computeRemaining status", () => {
  it("parity with legacy thresholds for all old flows", () => {
    for (const [f, total] of OLD) {
      const remainings = [total, 721, 720, 719.5, 121, 120, 119.5, 1, 0];
      for (const rem of remainings) {
        if (rem > total) continue;
        const info = computeRemaining(tank(f, total - rem), NOW)!;
        expect(info.status).toBe(legacy(info.remainingMinutes));
      }
    }
  });
  it("3.0 l/min: ok fresh, low <65, critical <32.5", () => {
    const s = (rem: number) => computeRemaining(tank(3.0, 130 - rem), NOW)!.status;
    expect(s(130)).toBe("ok");
    expect(s(65.5)).toBe("ok");
    expect(s(64.5)).toBe("low");
    expect(s(33)).toBe("low");
    expect(s(32)).toBe("critical");
    expect(s(0)).toBe("empty");
  });
});

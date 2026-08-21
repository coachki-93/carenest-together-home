import { describe, expect, it } from "vitest";
import {
  DEFAULT_OXYGEN_CHECK_INTERVAL_MINUTES,
  lastInteractionAt,
  resolveCheckIntervalMinutes,
  shouldSendCheckReminder,
} from "./check-reminder";

const NOW = new Date("2026-08-20T18:00:00.000Z");
const minsAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();

const base = {
  startedAt: minsAgo(500),
  lastCheckedAt: null,
  checkReminderSentAt: null,
  intervalMinutes: 180,
  now: NOW,
};

describe("lastInteractionAt", () => {
  it("takes the most recent of started/checked", () => {
    expect(
      lastInteractionAt({
        startedAt: minsAgo(500),
        lastCheckedAt: minsAgo(20),
      })?.toISOString(),
    ).toBe(minsAgo(20));
  });

  it("is null when nothing is parsable", () => {
    expect(lastInteractionAt({ startedAt: "nope", lastCheckedAt: null })).toBeNull();
  });
});

describe("resolveCheckIntervalMinutes", () => {
  it("defaults when missing or below the minimum", () => {
    expect(resolveCheckIntervalMinutes(null)).toBe(DEFAULT_OXYGEN_CHECK_INTERVAL_MINUTES);
    expect(resolveCheckIntervalMinutes(undefined)).toBe(180);
    expect(resolveCheckIntervalMinutes(Number.NaN)).toBe(180);
    expect(resolveCheckIntervalMinutes(5)).toBe(180);
    expect(resolveCheckIntervalMinutes(60)).toBe(60);
  });
});

describe("shouldSendCheckReminder", () => {
  it("fires once for a tank untouched past the interval", () => {
    expect(shouldSendCheckReminder(base)).toBe(true);
  });

  it("does not re-fire on the next 15-minute sweep", () => {
    const later = new Date(NOW.getTime() + 15 * 60_000);
    expect(
      shouldSendCheckReminder({
        ...base,
        checkReminderSentAt: NOW.toISOString(),
        now: later,
      }),
    ).toBe(false);
  });

  it("stays quiet while the tank is younger than the interval", () => {
    expect(shouldSendCheckReminder({ ...base, startedAt: minsAgo(60) })).toBe(false);
  });

  it("resets after an interaction and re-fires only after a new interval", () => {
    // Confirmed 10 min ago, reminder sent 60 min ago -> quiet.
    expect(
      shouldSendCheckReminder({
        ...base,
        lastCheckedAt: minsAgo(10),
        checkReminderSentAt: minsAgo(60),
      }),
    ).toBe(false);
    // Confirmed 200 min ago (> interval), older reminder -> fires again.
    expect(
      shouldSendCheckReminder({
        ...base,
        lastCheckedAt: minsAgo(200),
        checkReminderSentAt: minsAgo(400),
      }),
    ).toBe(true);
  });

  it("re-nags when a full interval passed since the last reminder", () => {
    expect(
      shouldSendCheckReminder({ ...base, checkReminderSentAt: minsAgo(181) }),
    ).toBe(true);
    expect(
      shouldSendCheckReminder({ ...base, checkReminderSentAt: minsAgo(179) }),
    ).toBe(false);
  });

  it("fires when no timestamps are usable (fail-safe)", () => {
    expect(
      shouldSendCheckReminder({
        ...base,
        startedAt: null,
        lastCheckedAt: null,
      }),
    ).toBe(true);
  });

  // REGRESSION: the sweep's own stamp bumps oxygen_tanks.updated_at via the
  // set_updated_at trigger. If updated_at counted as an interaction, the
  // reminder silenced itself forever after the first send.
  it("re-fires for a reminded-but-unconfirmed tank (self-silencing regression)", () => {
    expect(
      shouldSendCheckReminder({
        ...base,
        startedAt: minsAgo(600),
        lastCheckedAt: null, // never confirmed by a human
        checkReminderSentAt: minsAgo(181), // system write bumped updated_at too
      }),
    ).toBe(true);
    expect(
      shouldSendCheckReminder({
        ...base,
        startedAt: minsAgo(600),
        lastCheckedAt: null,
        checkReminderSentAt: minsAgo(179),
      }),
    ).toBe(false);
  });

  it("keeps nagging across three consecutive intervals", () => {
    const startedAt = minsAgo(600);
    for (const sent of [181, 362, 543]) {
      expect(
        shouldSendCheckReminder({
          ...base,
          startedAt,
          lastCheckedAt: null,
          checkReminderSentAt: minsAgo(sent),
        }),
      ).toBe(true);
    }
  });

  it("fires when the dedup stamp is unparsable (fail-safe)", () => {
    expect(
      shouldSendCheckReminder({ ...base, checkReminderSentAt: "garbage" }),
    ).toBe(true);
  });

  it("uses the 180 min default when the family setting is missing", () => {
    expect(
      shouldSendCheckReminder({ ...base, startedAt: minsAgo(190), intervalMinutes: null }),
    ).toBe(true);
    expect(
      shouldSendCheckReminder({ ...base, startedAt: minsAgo(170), intervalMinutes: null }),
    ).toBe(false);
  });
});

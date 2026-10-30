import { describe, expect, it } from "vitest";
import {
  expandMasterForSweep,
  isLateDue,
  isMissedDue,
  isReminderDue,
  isStartDue,
  type OverrideLike,
} from "./sweep-occurrences";

const STO = "Europe/Stockholm";
// Daily 20:00 Stockholm (winter → 19:00Z), late after 10, missed after 15.
const m = {
  id: "m1",
  family_id: "f1",
  title: "Evening feed",
  kind: "meal",
  starts_at: "2026-01-01T19:00:00Z",
  recurrence_freq: "daily",
  recurrence_interval: 1,
  recurrence_byweekday: null,
  recurrence_times_of_day: ["20:00"],
  late_after_minutes: 10,
  missed_after_minutes: 15,
  notify_start: true,
  reminder_minutes: 30,
};
const ORIG = "2026-01-15T19:00:00.000Z"; // 20:00 Stockholm
const MOVED = "2026-01-15T20:30:00.000Z"; // 21:30 Stockholm
const t = (iso: string, addMin = 0) => new Date(iso).getTime() + addMin * 60_000;
const day = (nowMs: number) =>
  expandMasterForSweep(m, overrides, nowMs - 7 * 864e5, nowMs, STO).find(
    (c) => c.occurrence_at === ORIG,
  );
let overrides: OverrideLike[] = [];

describe("moved occurrence (20:00 → 21:30)", () => {
  overrides = [
    { recurrence_parent_id: "m1", recurrence_override_at: ORIG, recurrence_cancelled: false, starts_at: MOVED },
  ];

  it("keeps the original slot as key but uses the moved time", () => {
    const c = day(t(MOVED, 1))!;
    expect(c.occurrence_at).toBe(ORIG);
    expect(c.occurrence_ms).toBe(t(MOVED));
  });
  it("is not a candidate yet at the old time", () => {
    expect(day(t(ORIG, 1))).toBeUndefined();
    expect(day(t(ORIG, 16))).toBeUndefined(); // no 'missed' at 20:15
  });
  it("start fires at the new time", () => {
    expect(isStartDue(day(t(MOVED, 1))!, t(MOVED, 1), 15)).toBe(true);
  });
  it("late fires 10 min after the new time, not before", () => {
    const c = day(t(MOVED, 10))!;
    expect(isLateDue(c, t(MOVED, 9), false)).toBe(false);
    expect(isLateDue(c, t(MOVED, 10), false)).toBe(true);
  });
  it("missed fires 15 min after the new time, not before", () => {
    const c = day(t(MOVED, 15))!;
    expect(isMissedDue(c, t(MOVED, 14), false)).toBe(false);
    expect(isMissedDue(c, t(MOVED, 15), false)).toBe(true);
  });
  it("a completion on the moved occurrence stops missed and late", () => {
    const c = day(t(MOVED, 20))!;
    expect(isMissedDue(c, t(MOVED, 20), true)).toBe(false);
    expect(isLateDue(c, t(MOVED, 20), true)).toBe(false);
  });
  it("reminder is relative to the moved time", () => {
    const c = expandMasterForSweep(m, overrides, t(MOVED, -30), t(MOVED, -30) + 2 * 864e5, STO).find(
      (x) => x.occurrence_at === ORIG,
    )!;
    expect(isReminderDue(c, t(MOVED, -31), false)).toBe(false);
    expect(isReminderDue(c, t(MOVED, -30), false)).toBe(true);
    expect(isReminderDue(c, t(ORIG, -30), false)).toBe(false);
  });
  it("an occurrence moved EARLIER (20:00 → 19:00) is found at 19:00", () => {
    const earlier = "2026-01-15T18:00:00.000Z";
    const ovs: OverrideLike[] = [
      { recurrence_parent_id: "m1", recurrence_override_at: ORIG, recurrence_cancelled: false, starts_at: earlier },
    ];
    const c = expandMasterForSweep(m, ovs, t(earlier, 1) - 7 * 864e5, t(earlier, 1), STO).find(
      (x) => x.occurrence_at === ORIG,
    )!;
    expect(isStartDue(c, t(earlier, 1), 15)).toBe(true);
  });
});

describe("cancelled occurrence", () => {
  const cancelled: OverrideLike[] = [
    { recurrence_parent_id: "m1", recurrence_override_at: ORIG, recurrence_cancelled: true, starts_at: ORIG },
  ];
  it("produces no candidate for start, late, missed or reminder", () => {
    const past = expandMasterForSweep(m, cancelled, t(ORIG, 30) - 7 * 864e5, t(ORIG, 30), STO);
    expect(past.find((c) => c.occurrence_at === ORIG)).toBeUndefined();
    const ahead = expandMasterForSweep(m, cancelled, t(ORIG, -30), t(ORIG, -30) + 2 * 864e5, STO);
    expect(ahead.find((c) => c.occurrence_at === ORIG)).toBeUndefined();
  });
});

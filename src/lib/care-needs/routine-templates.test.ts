import { describe, expect, it } from "vitest";
import {
  ROUTINE_TEMPLATES,
  anchorFor,
  groupTemplatesByNeed,
  initialSelected,
  templateToAppointment,
  type RoutineTemplate,
} from "./routine-templates";

const byKey = (k: string) => ROUTINE_TEMPLATES.find((t) => t.key === k)!;
const ctx = (now: string, tz = "Europe/Stockholm") => ({
  familyId: "f",
  childId: "c",
  userId: "u",
  tz,
  now: new Date(now),
});
const edits = (t: RoutineTemplate, over: Partial<Parameters<typeof templateToAppointment>[1]> = {}) => ({
  title: "X",
  freq: t.freq,
  interval: t.interval,
  timesOfDay: t.timesOfDay,
  checklist: [{ id: "a", label: " Rengör stoma " }],
  ...over,
});

describe("templateToAppointment", () => {
  it("Trakomläggning: daily 08:00 Stockholm (winter = UTC+1), anchored tomorrow when 08:00 has passed", () => {
    const a = templateToAppointment(byKey("trach_care"), edits(byKey("trach_care")), ctx("2026-01-15T10:00:00Z"))!;
    expect(a.starts_at).toBe("2026-01-16T07:00:00.000Z");
    expect(a.recurrence_freq).toBe("daily");
    expect(a.recurrence_times_of_day).toEqual(["08:00"]);
    expect(a.reminder_minutes).toBeNull();
    expect(a.notify_start).toBe(true);
    expect(a.missed_after_minutes).toBe(15);
    expect(a.checklist).toEqual([{ id: "a", label: "Rengör stoma" }]);
  });
  it("summer time: 08:00 Stockholm = 06:00 UTC, today when still ahead", () => {
    const a = templateToAppointment(byKey("trach_care"), edits(byKey("trach_care")), ctx("2026-07-01T04:00:00Z"))!;
    expect(a.starts_at).toBe("2026-07-01T06:00:00.000Z");
  });
  it("other timezone: 08:00 New York (EST) = 13:00 UTC", () => {
    const a = templateToAppointment(byKey("trach_care"), edits(byKey("trach_care")), ctx("2026-01-15T05:00:00Z", "America/New_York"))!;
    expect(a.starts_at).toBe("2026-01-15T13:00:00.000Z");
  });
  it("Lägesändring: 9 times → no START push and a 60-min missed window, first time still ahead", () => {
    const t = byKey("repositioning");
    const a = templateToAppointment(t, edits(t), ctx("2026-01-15T10:30:00Z"))!; // 11:30 local
    expect(t.freq).toBe("daily");
    expect(a.recurrence_times_of_day).toHaveLength(9);
    expect(a.notify_start).toBe(false);
    expect(a.missed_after_minutes).toBe(60);
    expect(a.starts_at).toBe("2026-01-15T11:00:00.000Z"); // 12:00 local
  });
  it("3 times a day still pushes START", () => {
    const t = byKey("toothbrushing");
    const a = templateToAppointment(t, edits(t, { timesOfDay: ["08:00", "12:00", "19:30"] }), ctx("2026-01-15T10:00:00Z"))!;
    expect(a.notify_start).toBe(true);
  });
  it("weekly without a weekday = Sunday; interval carried", () => {
    const t = byKey("vent_weekly");
    const a = templateToAppointment(t, edits(t, { timesOfDay: ["09:00"], interval: 2 }), ctx("2026-01-15T10:00:00Z"))!;
    expect(a.recurrence_byweekday).toEqual([0]);
    expect(a.recurrence_interval).toBe(2);
  });
  it("monthly = day 1 of next month", () => {
    const t = byKey("adrenal_kit");
    const a = templateToAppointment(t, edits(t), ctx("2026-01-15T10:00:00Z"))!;
    expect(a.starts_at).toBe("2026-02-01T17:00:00.000Z"); // 18:00 local
    expect(byKey("vent_inlet_filter").interval).toBe(6);
  });
  it("no time → not creatable", () => {
    const t = byKey("trach_tube_change");
    expect(templateToAppointment(t, edits(t), ctx("2026-01-15T10:00:00Z"))).toBeNull();
  });
  it("medication links create nothing", () => {
    const t = byKey("inhalation_meds");
    expect(t.target).toBe("medication_link");
    expect(templateToAppointment(t, edits(t, { timesOfDay: ["08:00"] }), ctx("2026-01-15T10:00:00Z"))).toBeNull();
  });
});

describe("anchorFor", () => {
  it("monthly on the 1st with a time ahead stays this month", () => {
    expect(anchorFor("monthly", ["18:00"], new Date("2026-03-01T08:00:00Z"), "Europe/Stockholm").toISOString())
      .toBe("2026-03-01T17:00:00.000Z");
  });
});

describe("grouping and pre-ticks", () => {
  it("a template under several needs shows once, under the first need", () => {
    const g = groupTemplatesByNeed(["sleep_positioning", "skin_care"]);
    expect(g[0].capability).toBe("sleep_positioning");
    expect(g[0].templates.map((t) => t.key)).toEqual(["repositioning"]);
    expect(g[1].templates.map((t) => t.key)).toEqual(["skin_check"]);
  });
  it("needs without templates are omitted (oxygen)", () => {
    expect(groupTemplatesByNeed(["oxygen"])).toEqual([]);
  });
  it("Trakomläggning stays ticked even if the child already has tasks", () => {
    expect(initialSelected(byKey("trach_care"), new Set(["task", "meal"]))).toBe(true);
  });
  it("feed/glucose replacements untick when a same-kind task exists", () => {
    expect(initialSelected(byKey("glucose_task"), new Set(["task"]))).toBe(false);
    const feed = { ...byKey("feed_task"), defaultSelected: true };
    expect(initialSelected(feed, new Set(["meal"]))).toBe(false);
    expect(initialSelected(feed, new Set())).toBe(true);
  });
});

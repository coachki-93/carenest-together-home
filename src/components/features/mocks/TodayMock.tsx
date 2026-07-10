import {
  Baby,
  Calendar,
  Check,
  ChevronRight,
  ClipboardCheck,
  Droplet,
  GlassWater,
  Move,
  Pill,
  Sparkles,
  Utensils,
  Wind,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Reveal } from "@/components/marketing/Reveal";

/**
 * TodayMock — genuine mirror of the authenticated /home dashboard, split into
 * two side-by-side cards for the bespoke TODAY band on /features.
 *
 * Left card: greeting/progress hero + Heads-up + Handover + Maintenance.
 * Right card: today's schedule list.
 *
 * Marketing simplification: every row's "Mark done" chip renders in the same
 * filled violet style regardless of the 3/8 progress count — the real
 * dashboard is unaffected. Row trailing icons: X (skip) + calendar.
 */

const HERO_NAME = "Adam";
const GREETING_NAME = "Gabriella";
const HANDOVER_AUTHOR = "Ryan";
const DONE = 3;
const TOTAL = 8;
const PCT = Math.round((DONE / TOTAL) * 100);

interface RowSpec {
  time: string;
  Icon: LucideIcon;
  tint: string;
  fg: string;
  done?: boolean;
  by?: string;
  atTime?: string;
}

const rows: RowSpec[] = [
  {
    time: "07:30",
    Icon: Baby,
    tint: "color-mix(in oklab, oklch(0.80 0.10 340) 26%, var(--color-marketing-bg))",
    fg: "oklch(0.46 0.14 340)",
    done: true,
    by: "Ryan",
    atTime: "07:34",
  },
  {
    time: "08:00",
    Icon: Pill,
    tint: "color-mix(in oklab, oklch(0.78 0.14 75) 26%, var(--color-marketing-bg))",
    fg: "oklch(0.44 0.14 75)",
    done: true,
    by: "Kim",
    atTime: "08:04",
  },
  {
    time: "09:30",
    Icon: Utensils,
    tint: "color-mix(in oklab, oklch(0.78 0.10 190) 26%, var(--color-marketing-bg))",
    fg: "oklch(0.42 0.10 200)",
    done: true,
    by: "Gabriella",
    atTime: "09:32",
  },
  {
    time: "11:00",
    Icon: Droplet,
    tint: "color-mix(in oklab, oklch(0.78 0.14 30) 22%, var(--color-marketing-bg))",
    fg: "oklch(0.46 0.16 30)",
  },
  {
    time: "11:30",
    Icon: ClipboardCheck,
    tint: "color-mix(in oklab, var(--color-marketing-sage) 22%, var(--color-marketing-bg))",
    fg: "var(--color-marketing-sage)",
  },
  {
    time: "12:00",
    Icon: Wind,
    tint: "color-mix(in oklab, oklch(0.55 0.16 285) 20%, var(--color-marketing-bg))",
    fg: "oklch(0.42 0.16 285)",
  },
  {
    time: "13:00",
    Icon: Move,
    tint: "color-mix(in oklab, oklch(0.75 0.12 145) 24%, var(--color-marketing-bg))",
    fg: "oklch(0.42 0.14 145)",
  },
  {
    time: "15:00",
    Icon: GlassWater,
    tint: "color-mix(in oklab, oklch(0.78 0.12 220) 26%, var(--color-marketing-bg))",
    fg: "oklch(0.42 0.14 220)",
  },
];

function useTaskDetails() {
  const { i18n } = useTranslation();
  const sv = i18n.language?.startsWith("sv");
  return sv
    ? [
        { title: "Blöjbyte", detail: null },
        { title: "Morgonmedicin", detail: "2 tabletter" },
        { title: "Mata", detail: "64 ml" },
        { title: "Kontrollera satration", detail: null },
        { title: "Byt plats på prob", detail: null },
        { title: "Inhalation 2 ml NaCl", detail: null },
        { title: "Förflyttning & positionering", detail: null },
        { title: "Vätska", detail: "64 ml" },
      ]
    : [
        { title: "Diaper change", detail: null },
        { title: "Morning meds", detail: "2 tablets" },
        { title: "Feed", detail: "64 ml" },
        { title: "Check saturation", detail: null },
        { title: "Change probe site", detail: null },
        { title: "Inhalation 2 ml NaCl", detail: null },
        { title: "Repositioning", detail: null },
        { title: "Fluids", detail: "64 ml" },
      ];
}

export function TodayMockLeft() {
  const { t, i18n } = useTranslation();
  const sv = i18n.language?.startsWith("sv");
  const taskDetails = useTaskDetails();
  const nextIdx = rows.findIndex((r) => !r.done);
  const nextRow = rows[nextIdx];
  const nextTitle = taskDetails[nextIdx].title;


  const maintTitle = sv
    ? "Rengör svart filter — Trilogy Evo"
    : "Clean black filter — Trilogy Evo";

  return (
    <div className="mk-glass mk-glass-border rounded-3xl p-5 md:p-6 shadow-2xl space-y-4 h-full">
      {/* Hero card */}
      <div className="rounded-2xl border border-marketing-line bg-marketing-bg p-4 md:p-5">
        <div
          className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold"
          style={{ color: "oklch(0.48 0.16 285)" }}
        >
          <Sparkles className="size-3.5" strokeWidth={2.2} />
          <span>
            {t("dashboard.morning")}, {GREETING_NAME}
          </span>
        </div>
        <p
          className="text-lg md:text-xl font-bold text-marketing-ink mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("dashboard.heroLine", { name: HERO_NAME })}
        </p>

        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-marketing-muted mb-1">
              {t("dashboard.progress")}
            </p>
            <div className="flex items-baseline gap-1.5 mb-1.5">
              <span
                className="text-2xl font-extrabold text-marketing-ink leading-none"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {DONE}
              </span>
              <span className="text-[11px] text-marketing-muted">
                / {TOTAL} {t("dashboard.tasks")}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-marketing-line overflow-hidden">
              <div
                className="mk-bar-fill h-full rounded-full"
                style={{
                  ["--fill" as never]: `${PCT}%`,
                  background: "oklch(0.55 0.16 285)",
                }}
              />
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-marketing-muted mb-1">
              {t("dashboard.upNext")}
            </p>
            <p className="text-[12px] font-semibold text-marketing-ink leading-tight">
              <span className="font-mono">{nextRow.time}</span> · {nextTitle}
            </p>
          </div>
        </div>
      </div>

      {/* Inventory alert */}
      <div
        className="flex items-center gap-3 rounded-2xl border px-4 py-3"
        style={{
          background:
            "color-mix(in oklab, oklch(0.86 0.13 85) 26%, var(--color-marketing-bg))",
          borderColor:
            "color-mix(in oklab, oklch(0.72 0.14 75) 45%, var(--color-marketing-bg))",
          color: "oklch(0.40 0.10 65)",
        }}
      >
        <span
          className="size-8 rounded-full grid place-items-center flex-none"
          style={{
            background:
              "color-mix(in oklab, oklch(0.78 0.14 75) 32%, transparent)",
          }}
        >
          <Wrench className="size-4" strokeWidth={2} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold leading-tight">
            {t("inventory.alertTitle")}
          </p>
          <p className="text-[11px] opacity-85">
            {t("inventory.lowCount", { count: 2 })}
          </p>
        </div>
        <ChevronRight className="size-4 opacity-70" />
      </div>

      {/* Handover unread */}
      <div
        className="flex items-center gap-3 rounded-2xl border px-4 py-3"
        style={{
          background:
            "color-mix(in oklab, oklch(0.55 0.16 285) 12%, var(--color-marketing-bg))",
          borderColor:
            "color-mix(in oklab, oklch(0.55 0.16 285) 28%, var(--color-marketing-bg))",
        }}
      >
        <span
          className="size-8 rounded-full grid place-items-center flex-none"
          style={{
            background:
              "color-mix(in oklab, oklch(0.55 0.16 285) 22%, transparent)",
            color: "oklch(0.42 0.16 285)",
          }}
        >
          <ClipboardCheck className="size-4" strokeWidth={2} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-marketing-ink leading-tight">
            {t("dashboard.handoverUnread.title", { name: HANDOVER_AUTHOR })}
          </p>
          <p className="text-[11px] text-marketing-muted">
            {t("dashboard.handoverUnread.body")}
          </p>
        </div>
        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold text-white"
          style={{ background: "oklch(0.52 0.16 285)" }}
        >
          {t("dashboard.handoverUnread.action")}
        </span>
      </div>

      {/* Maintenance */}
      <div className="rounded-2xl border border-marketing-line bg-marketing-bg p-4">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Wrench
              className="size-4"
              style={{ color: "oklch(0.48 0.14 30)" }}
              strokeWidth={2}
            />
            <p className="text-[13px] font-bold text-marketing-ink">
              {t("maintenance.dashboard.title")}
            </p>
          </div>
          <span
            className="text-[11px] font-semibold"
            style={{ color: "oklch(0.48 0.16 285)" }}
          >
            {t("maintenance.dashboard.viewAll")}
          </span>
        </div>
        <div
          className="flex items-center gap-3 rounded-xl px-3 py-2"
          style={{
            background:
              "color-mix(in oklab, oklch(0.86 0.13 85) 22%, var(--color-marketing-bg))",
          }}
        >
          <span className="flex-1 text-[12.5px] font-semibold text-marketing-ink truncate">
            {maintTitle}
          </span>
          <span
            className="text-[9px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded"
            style={{ background: "oklch(0.62 0.16 30)", color: "white" }}
          >
            {t("maintenance.dueToday")}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-marketing-muted whitespace-nowrap">
            <Check className="size-3" />
            {t("maintenance.markDone")}
          </span>
        </div>
      </div>
    </div>
  );
}

export function TodayMockRight() {
  const { t } = useTranslation();
  const taskDetails = useTaskDetails();

  return (
    <div className="mk-glass mk-glass-border rounded-3xl p-5 md:p-6 shadow-2xl h-full">
      <div className="rounded-2xl border border-marketing-line bg-marketing-bg p-4 h-full">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[13px] font-bold text-marketing-ink">
            {t("dashboard.todaysSchedule")}
          </p>
          <span
            className="text-[11px] font-semibold"
            style={{ color: "oklch(0.48 0.16 285)" }}
          >
            {t("dashboard.viewFull")}
          </span>
        </div>
        <ul className="space-y-1.5">
          {rows.map((r, i) => {
            const td = taskDetails[i];
            return (
              <Reveal key={i} delayMs={140 + i * 60}>
                <li
                  className="flex items-center gap-2.5 rounded-xl border border-marketing-line/70 bg-marketing-surface/50 px-2.5 py-2"
                >
                  <span className="font-mono text-[10.5px] text-marketing-muted w-9 shrink-0">
                    {r.time}
                  </span>
                  <span
                    className="size-7 rounded-full grid place-items-center flex-none"
                    style={{
                      background: r.tint,
                      color: r.fg,
                      opacity: r.done ? 0.55 : 1,
                    }}
                    aria-hidden
                  >
                    <r.Icon className="size-3.5" strokeWidth={2} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[12.5px] font-semibold truncate ${r.done ? "text-marketing-muted line-through" : "text-marketing-ink"}`}
                    >
                      {td.title}
                      {r.done && td.detail ? (
                        <span className="ml-1.5 font-normal">· {td.detail}</span>
                      ) : null}
                    </p>
                    {r.done && r.by && r.atTime ? (
                      <p className="text-[10.5px] text-marketing-muted truncate mt-0.5 no-underline">
                        {t("schedule.givenBy", { name: r.by })} · {r.atTime}
                      </p>
                    ) : null}
                  </div>
                  {r.done ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full border border-marketing-line px-2.5 py-1 text-[10.5px] font-semibold text-marketing-muted bg-marketing-bg"
                    >
                      {t("schedule.undo")}
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-bold text-white"
                      style={{ background: "oklch(0.52 0.16 285)" }}
                    >
                      {t("dashboard.markDone")}
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label="skip"
                    tabIndex={-1}
                    className="size-6 rounded-full border border-marketing-line grid place-items-center text-marketing-muted"
                  >
                    <X className="size-3" />
                  </button>
                  <button
                    type="button"
                    aria-label="calendar"
                    tabIndex={-1}
                    className="size-6 rounded-full border border-marketing-line grid place-items-center text-marketing-muted"
                  >
                    <Calendar className="size-3" />
                  </button>
                </li>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** Legacy single-column variant, retained for compatibility. */
export function TodayMock() {
  return (
    <div className="space-y-4">
      <TodayMockLeft />
      <TodayMockRight />
    </div>
  );
}

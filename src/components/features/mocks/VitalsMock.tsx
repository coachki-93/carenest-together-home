import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Heart, Info, TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts";

/**
 * VitalsMock — single Puls card with a period selector (24h / 7d / 30d).
 *
 * Uses recharts (same components as the real authenticated /vitals page):
 * <LineChart> + <Line type="monotone"> for the curve, <ReferenceArea> for
 * the in-range band.
 *
 * Initial reveal: IntersectionObserver gates when the <Line> mounts so
 * recharts' built-in draw animation plays once on scroll-into-view.
 * Period switch: recharts re-animates the line on data change; we wrap
 * the chart in a short opacity crossfade so the swap feels lighter than
 * the initial reveal.
 *
 * `prefers-reduced-motion: reduce` disables both — recharts respects
 * isAnimationActive={false} and the opacity transition is skipped.
 */

type PeriodKey = "24h" | "7d" | "30d";

interface Reading {
  v: number; // bpm
  time: string; // label under x-axis (may be "" for unlabeled points)
}

interface Dataset {
  readings: Reading[];
  avg: number;
  min: number;
  max: number;
  outOfRange: number;
  latest: number;
  rel: { en: string; sv: string };
  summary: { en: string; sv: string };
}

const DATA: Record<PeriodKey, Dataset> = {
  "24h": {
    readings: [
      { v: 88, time: "09:15" },
      { v: 92, time: "12:40" },
      { v: 90, time: "15:20" },
      { v: 95, time: "18:05" },
      { v: 119, time: "21:30" },
      { v: 122, time: "23:50" },
      { v: 121, time: "03:15" },
      { v: 94, time: "07:40" },
    ],
    avg: 103, min: 88, max: 122, outOfRange: 3, latest: 94,
    rel: { en: "1 h ago", sv: "1 h sedan" },
    summary: { en: "Last 24 hours · avg 103 bpm", sv: "Senaste 24 timmar · snitt 103 bpm" },
  },
  "7d": {
    readings: [
      { v: 88, time: "Mon" },
      { v: 92, time: "" },
      { v: 86, time: "" },
      { v: 84, time: "Tue" },
      { v: 90, time: "" },
      { v: 93, time: "" },
      { v: 89, time: "Wed" },
      { v: 95, time: "" },
      { v: 87, time: "" },
      { v: 91, time: "Thu" },
      { v: 85, time: "" },
      { v: 94, time: "" },
      { v: 88, time: "Fri" },
      { v: 92, time: "" },
      { v: 90, time: "" },
      { v: 86, time: "Sat" },
      { v: 118, time: "" },
      { v: 121, time: "" },
      { v: 119, time: "Sun" },
      { v: 89, time: "" },
      { v: 91, time: "" },
      { v: 92, time: "" },
    ],
    avg: 94, min: 84, max: 121, outOfRange: 3, latest: 92,
    rel: { en: "today", sv: "idag" },
    summary: { en: "Last 7 days · avg 94 bpm", sv: "Senaste 7 dagar · snitt 94 bpm" },
  },
  "30d": {
    readings: [
      { v: 89, time: "Wk 1" },
      { v: 93, time: "" },
      { v: 87, time: "" },
      { v: 91, time: "" },
      { v: 95, time: "" },
      { v: 88, time: "Wk 2" },
      { v: 92, time: "" },
      { v: 86, time: "" },
      { v: 94, time: "" },
      { v: 90, time: "" },
      { v: 97, time: "" },
      { v: 89, time: "Wk 3" },
      { v: 93, time: "" },
      { v: 85, time: "" },
      { v: 118, time: "" },
      { v: 121, time: "" },
      { v: 119, time: "" },
      { v: 92, time: "Wk 4" },
      { v: 87, time: "" },
      { v: 94, time: "" },
      { v: 90, time: "" },
      { v: 93, time: "now" },
    ],
    avg: 95, min: 85, max: 121, outOfRange: 3, latest: 93,
    rel: { en: "this week", sv: "denna vecka" },
    summary: { en: "Last 30 days · avg 95 bpm", sv: "Senaste 30 dagar · snitt 95 bpm" },
  },
};

const SV_DAYS: Record<string, string> = {
  Mon: "Mån", Tue: "Tis", Wed: "Ons", Thu: "Tor", Fri: "Fre", Sat: "Lör", Sun: "Sön",
};
const SV_LABEL: Record<string, string> = {
  "Wk 1": "V 1", "Wk 2": "V 2", "Wk 3": "V 3", "Wk 4": "V 4", "now": "nu", "today": "idag",
};

const RANGE_LOW = 70;
const RANGE_HIGH = 115;
const Y_MIN = 55;
const Y_MAX = 135;
const TINT = "oklch(0.55 0.16 285)";

export function VitalsMock() {
  const { t, i18n } = useTranslation();
  const sv = i18n.language?.startsWith("sv");

  const [period, setPeriod] = useState<PeriodKey>("24h");
  const ds = DATA[period];

  const title = sv ? "Puls" : "Pulse";
  const outLabel = sv ? "utanför intervall" : "out of range";
  const summary = sv ? ds.summary.sv : ds.summary.en;
  const rel = sv ? ds.rel.sv : ds.rel.en;
  const aria = sv
    ? `${title} ${summary}. Min ${ds.min}, max ${ds.max}, ${ds.outOfRange} värden utanför intervallet 70 till 115.`
    : `${title}. ${summary}. Min ${ds.min}, max ${ds.max}, ${ds.outOfRange} readings outside the 70 to 115 range.`;

  const ref = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [seriesVisible, setSeriesVisible] = useState(true);
  const firstMountRef = useRef(true);

  // Detect reduced motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    if (mq.matches) setDrawn(true);
  }, []);

  // Initial reveal via IntersectionObserver
  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            window.setTimeout(() => setDrawn(true), 120);
            io.disconnect();
          }
        }
      },
      { threshold: 0.35, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  // Period switch: light opacity crossfade (skip on first mount and reduced motion)
  useEffect(() => {
    if (firstMountRef.current) {
      firstMountRef.current = false;
      return;
    }
    if (reduced) return;
    setSeriesVisible(false);
    const id = window.setTimeout(() => setSeriesVisible(true), 180);
    return () => window.clearTimeout(id);
  }, [period, reduced]);

  const periods: PeriodKey[] = ["24h", "7d", "30d"];
  const pillLabel = (p: PeriodKey) =>
    p === "24h" ? t("vitals.range24h") : p === "7d" ? t("vitals.range7d") : t("vitals.range30d");

  const xLabel = (raw: string) => {
    if (!raw) return "";
    if (sv) return SV_DAYS[raw] ?? SV_LABEL[raw] ?? raw;
    return raw;
  };

  return (
    <div ref={ref}>
      {/* Period selector */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <span className="text-[12px] font-semibold text-marketing-muted uppercase tracking-wide">
          {t("vitals.range")}:
        </span>
        <div className="inline-flex items-center gap-1.5" role="tablist" aria-label={t("vitals.range")}>
          {periods.map((p) => {
            const active = p === period;
            return (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setPeriod(p)}
                className="rounded-full px-3 py-1 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                style={
                  active
                    ? { background: TINT, color: "white", border: `1px solid ${TINT}` }
                    : {
                        background: "transparent",
                        color: "var(--color-marketing-muted)",
                        border: "1px solid var(--color-marketing-line)",
                      }
                }
              >
                {pillLabel(p)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mk-glass mk-glass-border rounded-3xl p-5 md:p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-1">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="shrink-0 rounded-full h-10 w-10 grid place-items-center"
              style={{
                background: `color-mix(in oklab, ${TINT} 12%, transparent)`,
                color: TINT,
              }}
              aria-hidden
            >
              <Heart size={20} strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  className="text-[17px] font-bold text-marketing-ink leading-none"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {title}
                </h3>
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: `color-mix(in oklab, ${TINT} 14%, var(--color-marketing-bg))`,
                    color: TINT,
                  }}
                  title={sv ? "Referensintervall för Adam" : "Reference range for Adam"}
                >
                  {RANGE_LOW}–{RANGE_HIGH}
                  <Info size={11} strokeWidth={2.25} aria-hidden />
                </span>
              </div>
              <p className="text-[12px] text-marketing-muted mt-1.5">{summary}</p>
              <p className="text-[12px] text-marketing-muted">
                min {ds.min} · max {ds.max} ·{" "}
                <span className={ds.outOfRange > 0 ? "text-red-600 font-semibold" : ""}>
                  {ds.outOfRange} {outLabel}
                </span>
              </p>
            </div>
          </div>

          {/* Right callout */}
          <div className="flex flex-col items-end shrink-0">
            <div className="flex items-center gap-1.5" style={{ color: TINT }}>
              <TrendingUp size={16} strokeWidth={2.5} aria-hidden />
              <span
                className="text-[26px] font-bold leading-none tabular-nums"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {ds.latest}
              </span>
            </div>
            <span className="text-[11px] text-marketing-muted mt-1">{rel}</span>
          </div>
        </div>

        {/* Chart */}
        <div
          className="w-full h-[240px] mt-3"
          role="img"
          aria-label={aria}
          style={{
            opacity: reduced ? 1 : seriesVisible ? 1 : 0,
            transition: reduced ? undefined : "opacity 220ms ease-out",
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={ds.readings}
              margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
            >
              <XAxis
                dataKey="time"
                type="category"
                interval={0}
                tick={{ fontSize: 11, fill: "var(--color-marketing-muted)" }}
                tickFormatter={xLabel}
                tickLine={false}
                axisLine={{ stroke: "var(--color-marketing-line)" }}
              />
              <YAxis
                type="number"
                domain={[Y_MIN, Y_MAX]}
                ticks={[60, 80, 100, 120]}
                tick={{ fontSize: 11, fill: "var(--color-marketing-muted)" }}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <ReferenceArea
                y1={RANGE_LOW}
                y2={RANGE_HIGH}
                fill="var(--color-marketing-sage)"
                fillOpacity={0.22}
                stroke="var(--color-marketing-sage)"
                strokeOpacity={0.5}
                strokeDasharray="2 3"
              />
              {drawn && (
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={TINT}
                  strokeWidth={2.25}
                  dot={{ r: 3.5, fill: "var(--color-marketing-bg)", stroke: TINT, strokeWidth: 2 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={!reduced}
                  animationDuration={900}
                  animationEasing="ease-out"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

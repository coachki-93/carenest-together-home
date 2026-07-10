import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Heart, Info, TrendingUp } from "lucide-react";

/**
 * VitalsMock — single Puls card with a period selector (24h / 7d / 30d).
 *
 * Initial reveal: IntersectionObserver-triggered one-shot line-draw (900ms
 * ease-out via stroke-dashoffset). Period switch after that: a lighter
 * crossfade of just the line + dots (opacity 220ms) to the new dataset,
 * not a full replay of the entrance draw.
 *
 * `prefers-reduced-motion: reduce` skips both animations (instant swap).
 *
 * All three datasets: same 70–115 in-range band for Adam, 0 out of range.
 */

type PeriodKey = "24h" | "7d" | "30d";

interface Reading {
  t: number; // 0..1 across the window
  v: number; // bpm
  time: string; // label under x-axis
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
      { t: 0.000, v: 88, time: "09:15" },
      { t: 0.153, v: 92, time: "12:40" },
      { t: 0.271, v: 90, time: "15:20" },
      { t: 0.394, v: 95, time: "18:05" },
      { t: 0.547, v: 68, time: "21:30" },
      { t: 0.651, v: 65, time: "23:50" },
      { t: 0.803, v: 66, time: "03:15" },
      { t: 1.000, v: 91, time: "07:40" },
    ],
    avg: 82, min: 65, max: 95, outOfRange: 3, latest: 91,
    rel: { en: "1 h ago", sv: "1 h sedan" },
    summary: { en: "Last 24 hours · avg 82 bpm", sv: "Senaste 24 timmar · snitt 82 bpm" },
  },
  "7d": {
    readings: [
      { t: 0 / 21, v: 88, time: "Mon" },
      { t: 1 / 21, v: 92, time: "" },
      { t: 2 / 21, v: 86, time: "" },
      { t: 3 / 21, v: 84, time: "Tue" },
      { t: 4 / 21, v: 90, time: "" },
      { t: 5 / 21, v: 93, time: "" },
      { t: 6 / 21, v: 89, time: "Wed" },
      { t: 7 / 21, v: 95, time: "" },
      { t: 8 / 21, v: 87, time: "" },
      { t: 9 / 21, v: 91, time: "Thu" },
      { t: 10 / 21, v: 85, time: "" },
      { t: 11 / 21, v: 94, time: "" },
      { t: 12 / 21, v: 88, time: "Fri" },
      { t: 13 / 21, v: 92, time: "" },
      { t: 14 / 21, v: 90, time: "" },
      { t: 15 / 21, v: 86, time: "Sat" },
      { t: 16 / 21, v: 67, time: "" },
      { t: 17 / 21, v: 64, time: "" },
      { t: 18 / 21, v: 66, time: "Sun" },
      { t: 19 / 21, v: 89, time: "" },
      { t: 20 / 21, v: 91, time: "" },
      { t: 1.000, v: 92, time: "" },
    ],
    avg: 86, min: 64, max: 95, outOfRange: 3, latest: 92,
    rel: { en: "today", sv: "idag" },
    summary: { en: "Last 7 days · avg 86 bpm", sv: "Senaste 7 dagar · snitt 86 bpm" },
  },
  "30d": {
    readings: [
      { t: 0 / 21, v: 89, time: "Wk 1" },
      { t: 1 / 21, v: 93, time: "" },
      { t: 2 / 21, v: 87, time: "" },
      { t: 3 / 21, v: 91, time: "" },
      { t: 4 / 21, v: 95, time: "" },
      { t: 5 / 21, v: 88, time: "Wk 2" },
      { t: 6 / 21, v: 92, time: "" },
      { t: 7 / 21, v: 86, time: "" },
      { t: 8 / 21, v: 94, time: "" },
      { t: 9 / 21, v: 90, time: "" },
      { t: 10 / 21, v: 97, time: "" },
      { t: 11 / 21, v: 89, time: "Wk 3" },
      { t: 12 / 21, v: 93, time: "" },
      { t: 13 / 21, v: 85, time: "" },
      { t: 14 / 21, v: 68, time: "" },
      { t: 15 / 21, v: 65, time: "" },
      { t: 16 / 21, v: 67, time: "" },
      { t: 17 / 21, v: 92, time: "Wk 4" },
      { t: 18 / 21, v: 87, time: "" },
      { t: 19 / 21, v: 94, time: "" },
      { t: 20 / 21, v: 90, time: "" },
      { t: 1.000, v: 93, time: "now" },
    ],
    avg: 88, min: 65, max: 97, outOfRange: 3, latest: 93,
    rel: { en: "this week", sv: "denna vecka" },
    summary: { en: "Last 30 days · avg 88 bpm", sv: "Senaste 30 dagar · snitt 88 bpm" },
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

  // SVG geometry
  const W = 640;
  const H = 260;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  // Widen axis so the range band sits as a distinct strip.
  const yMin = 55;
  const yMax = 135;
  const yTicks = [60, 80, 100, 120];

  const y = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin)) * plotH;
  const x = (tv: number) => padL + tv * plotW;
  const bandTop = y(RANGE_HIGH);
  const bandBottom = y(RANGE_LOW);

  const path = ds.readings
    .map((r, i) => `${i === 0 ? "M" : "L"} ${x(r.t).toFixed(1)} ${y(r.v).toFixed(1)}`)
    .join(" ");

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

  // Period switch: crossfade (skip on first mount and reduced motion)
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
              <p className="text-[12px] text-marketing-muted">{minmax}</p>
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
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-[240px] mt-3"
          role="img"
          aria-label={aria}
        >
          {/* Y-axis gridlines + labels */}
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={padL}
                x2={padL + plotW}
                y1={y(tick)}
                y2={y(tick)}
                stroke="var(--color-marketing-line)"
                strokeWidth={1}
                strokeDasharray="2 4"
                opacity={0.7}
              />
              <text
                x={padL - 8}
                y={y(tick) + 4}
                textAnchor="end"
                className="fill-marketing-muted"
                style={{ fontSize: 11 }}
              >
                {tick}
              </text>
            </g>
          ))}

          {/* Range band */}
          <rect
            x={padL}
            y={bandTop}
            width={plotW}
            height={bandBottom - bandTop}
            fill={`color-mix(in oklab, var(--color-marketing-sage) 22%, transparent)`}
            rx={6}
          />
          <line
            x1={padL} x2={padL + plotW} y1={bandTop} y2={bandTop}
            stroke={`color-mix(in oklab, var(--color-marketing-sage) 55%, transparent)`}
            strokeWidth={1}
            strokeDasharray="2 3"
          />
          <line
            x1={padL} x2={padL + plotW} y1={bandBottom} y2={bandBottom}
            stroke={`color-mix(in oklab, var(--color-marketing-sage) 55%, transparent)`}
            strokeWidth={1}
            strokeDasharray="2 3"
          />

          {/* Series group (crossfades on period change) */}
          <g
            style={{
              opacity: reduced ? 1 : seriesVisible ? 1 : 0,
              transition: reduced ? undefined : "opacity 220ms ease-out",
            }}
          >
            <path
              d={path}
              fill="none"
              stroke={TINT}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              style={{
                strokeDasharray: 1,
                strokeDashoffset: drawn ? 0 : 1,
                transition: "stroke-dashoffset 900ms ease-out",
              }}
            />
            {ds.readings.map((r, i) => (
              <circle
                key={`${period}-${i}`}
                cx={x(r.t)}
                cy={y(r.v)}
                r={3.5}
                fill="var(--color-marketing-bg)"
                stroke={TINT}
                strokeWidth={2}
                style={{
                  opacity: drawn ? 1 : 0,
                  transition: `opacity 240ms ease-out ${600 + i * 30}ms`,
                }}
              />
            ))}
          </g>

          {/* X-axis timestamps */}
          {ds.readings.map((r, i) => (
            <text
              key={`${period}-lab-${i}`}
              x={x(r.t)}
              y={H - 8}
              textAnchor="middle"
              className="fill-marketing-muted"
              style={{ fontSize: 11 }}
            >
              {xLabel(r.time)}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

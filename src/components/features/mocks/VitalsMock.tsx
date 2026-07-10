import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Heart, Info, TrendingUp } from "lucide-react";

/**
 * VitalsMock — single Puls card mirroring the real vitals chart. Structure:
 * heart icon + title + range pill (top-left), trend + big current value +
 * relative time (top-right), 24h summary line, min/max/out-of-range line
 * (0 out of range → neutral, no alarm styling), then chart with y-axis
 * gridlines, an in-range band, and 8 realistic (uneven) timestamps across a
 * ~24h window. The line draws left→right on IntersectionObserver reveal
 * (900ms ease-out via stroke-dashoffset). One-shot;
 * `prefers-reduced-motion: reduce` shows the drawn line immediately.
 *
 * Demo data: 4-year-old Adam, awake, unremarkable. HR range 70–115.
 * All 8 readings in range (min 84, max 95, avg 90). Latest 93 bpm.
 */

interface Reading {
  t: number; // 0..1 across the window
  v: number; // bpm
  time: string; // HH:MM label
}

const HR: Reading[] = [
  { t: 0.000, v: 88, time: "09:15" },
  { t: 0.153, v: 92, time: "12:40" },
  { t: 0.271, v: 90, time: "15:20" },
  { t: 0.394, v: 95, time: "18:05" },
  { t: 0.547, v: 89, time: "21:30" },
  { t: 0.651, v: 84, time: "23:50" },
  { t: 0.803, v: 91, time: "03:15" },
  { t: 1.000, v: 93, time: "07:40" },
];

const AVG = 90;
const MIN = 84;
const MAX = 95;
const OUT_OF_RANGE = 0;
const LATEST = HR[HR.length - 1].v;
const RANGE_LOW = 70;
const RANGE_HIGH = 115;
const TINT = "oklch(0.55 0.16 285)";

export function VitalsMock() {
  const { i18n } = useTranslation();
  const sv = i18n.language?.startsWith("sv");

  const labels = sv
    ? {
        title: "Puls",
        unit: "bpm",
        summary: `Senaste 24 timmar · snitt ${AVG} bpm`,
        minmax: `min ${MIN} · max ${MAX} · ${OUT_OF_RANGE} utanför intervall`,
        rel: "1 h sedan",
        aria: `Puls senaste 24 timmar. Snitt ${AVG}, min ${MIN}, max ${MAX}, alla värden inom intervallet 70 till 115.`,
      }
    : {
        title: "Pulse",
        unit: "bpm",
        summary: `Last 24 hours · avg ${AVG} bpm`,
        minmax: `min ${MIN} · max ${MAX} · ${OUT_OF_RANGE} out of range`,
        rel: "1 h ago",
        aria: `Pulse over the last 24 hours. Average ${AVG}, min ${MIN}, max ${MAX}, all readings within the 70 to 115 range.`,
      };

  // SVG geometry
  const W = 640;
  const H = 260;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  // Y-axis: 70 / 85 / 100 / 115 (evenly spaced ticks derived from range).
  // Extend a little above/below so the band sits inside the plot.
  const yMin = 62;
  const yMax = 122;
  const yTicks = [70, 85, 100, 115];

  const y = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin)) * plotH;
  const x = (t: number) => padL + t * plotW;
  const bandTop = y(RANGE_HIGH);
  const bandBottom = y(RANGE_LOW);

  const path = HR.map(
    (r, i) => `${i === 0 ? "M" : "L"} ${x(r.t).toFixed(1)} ${y(r.v).toFixed(1)}`,
  ).join(" ");

  const ref = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setDrawn(true);
      return;
    }
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
  }, []);

  return (
    <div
      ref={ref}
      className="mk-glass mk-glass-border rounded-3xl p-5 md:p-6 shadow-2xl"
    >
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
                {labels.title}
              </h3>
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: `color-mix(in oklab, ${TINT} 14%, var(--color-marketing-bg))`,
                  color: TINT,
                }}
              >
                {RANGE_LOW}–{RANGE_HIGH}
                <Info size={11} strokeWidth={2.25} aria-hidden />
              </span>
            </div>
            <p className="text-[12px] text-marketing-muted mt-1.5">
              {labels.summary}
            </p>
            <p className="text-[12px] text-marketing-muted">
              {labels.minmax}
            </p>
          </div>
        </div>

        {/* Right callout */}
        <div className="flex flex-col items-end shrink-0">
          <div className="flex items-center gap-1.5" style={{ color: TINT }}>
            <TrendingUp size={16} strokeWidth={2.5} aria-hidden />
            <span
              className="text-[26px] font-bold leading-none"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {LATEST}
            </span>
          </div>
          <span className="text-[11px] text-marketing-muted mt-1">
            {labels.rel}
          </span>
        </div>
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-[240px] mt-3"
        role="img"
        aria-label={labels.aria}
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
              strokeDasharray={tick === RANGE_LOW || tick === RANGE_HIGH ? undefined : "2 4"}
              opacity={tick === RANGE_LOW || tick === RANGE_HIGH ? 0 : 0.7}
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

        {/* Line (drawn L→R) */}
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

        {/* Dots (fade in after line arrives) */}
        {HR.map((r, i) => (
          <g key={i}>
            <circle
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
          </g>
        ))}

        {/* X-axis timestamps */}
        {HR.map((r, i) => (
          <text
            key={i}
            x={x(r.t)}
            y={H - 8}
            textAnchor="middle"
            className="fill-marketing-muted"
            style={{ fontSize: 11 }}
          >
            {r.time}
          </text>
        ))}
      </svg>
    </div>
  );
}

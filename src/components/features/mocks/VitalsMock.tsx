import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * VitalsMock — two side-by-side TrendCard mirrors (Puls + SpO₂), both in
 * range. Line draws left-to-right on IntersectionObserver reveal (900ms
 * ease-out via stroke-dashoffset). One-shot. `prefers-reduced-motion: reduce`
 * shows the drawn line immediately.
 *
 * Demo data: 4-year-old Adam, awake, unremarkable. HR range 70–115,
 * readings 88–104. SpO₂ range 95–100, readings 96–99. No red text,
 * no out-of-range counters.
 */

interface Reading {
  t: number; // 0..1 x
  v: number; // value
}

const HR_READINGS: Reading[] = [
  { t: 0.02, v: 92 }, { t: 0.09, v: 96 }, { t: 0.16, v: 88 }, { t: 0.24, v: 94 },
  { t: 0.32, v: 100 }, { t: 0.40, v: 97 }, { t: 0.48, v: 91 }, { t: 0.56, v: 104 },
  { t: 0.64, v: 98 }, { t: 0.72, v: 95 }, { t: 0.80, v: 102 }, { t: 0.88, v: 97 },
  { t: 0.97, v: 98 },
];

const SPO2_READINGS: Reading[] = [
  { t: 0.02, v: 98 }, { t: 0.10, v: 97 }, { t: 0.18, v: 99 }, { t: 0.26, v: 98 },
  { t: 0.34, v: 97 }, { t: 0.42, v: 96 }, { t: 0.50, v: 98 }, { t: 0.58, v: 99 },
  { t: 0.66, v: 97 }, { t: 0.74, v: 98 }, { t: 0.82, v: 99 }, { t: 0.90, v: 98 },
  { t: 0.98, v: 98 },
];

function TrendCard({
  label,
  rangeLabel,
  rangeLow,
  rangeHigh,
  yMin,
  yMax,
  unit,
  avg,
  min,
  max,
  last,
  lastTime,
  readings,
  drawn,
  tint,
}: {
  label: string;
  rangeLabel: string;
  rangeLow: number;
  rangeHigh: number;
  yMin: number;
  yMax: number;
  unit: string;
  avg: number;
  min: number;
  max: number;
  last: number;
  lastTime: string;
  readings: Reading[];
  drawn: boolean;
  tint: string;
}) {
  // Viewport coords
  const W = 340;
  const H = 130;
  const padL = 8;
  const padR = 8;
  const padT = 10;
  const padB = 20;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const y = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin)) * plotH;
  const x = (t: number) => padL + t * plotW;
  const bandTop = y(rangeHigh);
  const bandBottom = y(rangeLow);

  const path = readings
    .map((r, i) => `${i === 0 ? "M" : "L"} ${x(r.t).toFixed(1)} ${y(r.v).toFixed(1)}`)
    .join(" ");

  return (
    <div className="rounded-2xl border border-marketing-line bg-marketing-bg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[13px] font-bold text-marketing-ink" style={{ fontFamily: "var(--font-display)" }}>
          {label}
        </p>
        <span
          className="text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full"
          style={{
            background: `color-mix(in oklab, ${tint} 18%, var(--color-marketing-bg))`,
            color: tint,
          }}
        >
          {rangeLabel}
        </span>
      </div>
      <p className="text-[11px] text-marketing-muted mb-2">
        {labels.avg} {avg} · {labels.min} {min} · {labels.max} {max} {unit}
      </p>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-[130px]"
        role="img"
        aria-label={`${label} — ${labels.aria(rangeLabel)}`}
      >
        {/* Range band */}
        <rect
          x={padL}
          y={bandTop}
          width={plotW}
          height={bandBottom - bandTop}
          fill={`color-mix(in oklab, ${tint} 14%, transparent)`}
          rx={4}
        />
        {/* Range edges */}
        <line
          x1={padL} x2={padL + plotW} y1={bandTop} y2={bandTop}
          stroke={`color-mix(in oklab, ${tint} 45%, transparent)`}
          strokeWidth={1}
          strokeDasharray="2 3"
        />
        <line
          x1={padL} x2={padL + plotW} y1={bandBottom} y2={bandBottom}
          stroke={`color-mix(in oklab, ${tint} 45%, transparent)`}
          strokeWidth={1}
          strokeDasharray="2 3"
        />
        {/* Line (drawn L→R) */}
        <path
          d={path}
          fill="none"
          stroke={tint}
          strokeWidth={2}
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
        {readings.map((r, i) => (
          <circle
            key={i}
            cx={x(r.t)}
            cy={y(r.v)}
            r={1.8}
            fill={tint}
            style={{
              opacity: drawn ? 1 : 0,
              transition: `opacity 240ms ease-out ${600 + i * 20}ms`,
            }}
          />
        ))}
      </svg>

      {/* Last */}
      <p className="text-[11px] text-marketing-muted mt-1">
        {labels.last} {last} {unit} · {lastTime}
      </p>
    </div>
  );
}

export function VitalsMock() {
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
            // small delay so the line begins after the card lands
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
      className="mk-glass mk-glass-border rounded-3xl p-5 md:p-6 shadow-2xl grid gap-4 sm:grid-cols-2"
    >
      <TrendCard
        label="Puls"
        rangeLabel="70–115"
        rangeLow={70}
        rangeHigh={115}
        yMin={62}
        yMax={122}
        unit="slag/min"
        avg={96}
        min={88}
        max={104}
        last={98}
        lastTime="14:20"
        readings={HR_READINGS}
        drawn={drawn}
        tint="oklch(0.55 0.16 285)"
      />
      <TrendCard
        label="SpO₂"
        rangeLabel="95–100"
        rangeLow={95}
        rangeHigh={100}
        yMin={92}
        yMax={101}
        unit="%"
        avg={98}
        min={96}
        max={99}
        last={98}
        lastTime="14:20"
        readings={SPO2_READINGS}
        drawn={drawn}
        tint="var(--color-marketing-sage)"
      />
    </div>
  );
}

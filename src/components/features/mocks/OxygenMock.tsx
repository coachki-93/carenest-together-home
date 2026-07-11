import { Hospital, Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/**
 * OxygenMock — tank countdown card that plays a short "pause happening"
 * scene on scroll-reveal.
 *
 * Numbers: LIV Mini 2 L @ 0.10 l/min = 3856 min total (see
 * src/lib/oxygen/tanks.ts). Demo remaining starts at 18h 24m (1104 min,
 * ~29% of tank), ticks 24 → 23 → 22 min in the visible portion, then the
 * hospital toggle visibly flips ON (mirrors HospitalToggle.tsx exactly:
 * neutral pill → red-tinted on-state), then a PAUSED chip pops in and
 * the "Resumes automatically" line fades in — ticking stops on pause.
 * One-shot; reduced motion renders the final paused state (toggle on)
 * instantly with no scene.
 */
export function OxygenMock() {
  const { t, i18n } = useTranslation();
  const sv = i18n.language?.startsWith("sv");

  const s = sv
    ? {
        kicker: "Syrgas · tub 2",
        model: "LIV Mini 2 L · 0,10 l/min",
        paused: "Pausad — på sjukhus",
        remainingKicker: "Återstår",
        remainingRunning: (m: number) => `18h ${m}m`,
        resumes: "Slår igång automatiskt när sjukhusläget stängs av.",
        tank: "Kvar i tuben",
        warn: "Varning vid 60 min och 20 min.",
      }
    : {
        kicker: "Oxygen · tank 2",
        model: "LIV Mini 2 L · 0.10 L/min",
        paused: "Paused — at hospital",
        remainingKicker: "Remaining",
        remainingRunning: (m: number) => `18h ${m}m`,
        resumes: "Resumes automatically when hospital mode is turned off.",
        tank: "Tank remaining",
        warn: "Warnings at 60 min and 20 min.",
      };

  const [minutes, setMinutes] = useState(24);
  const [toggleOn, setToggleOn] = useState(false);
  const [paused, setPaused] = useState(false);
  const [started, setStarted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setReduced(true);
      setMinutes(22);
      setToggleOn(true);
      setPaused(true);
      setStarted(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setStarted(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.35, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!started || reduced) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setMinutes(23), 1100));
    timers.push(setTimeout(() => setMinutes(22), 2300));
    timers.push(setTimeout(() => setToggleOn(true), 2900));
    timers.push(setTimeout(() => setPaused(true), 3700));
    return () => timers.forEach(clearTimeout);
  }, [started, reduced]);

  const barPct = 29;

  return (
    <div
      ref={ref}
      className="mk-glass mk-glass-border rounded-3xl p-5 md:p-6 shadow-2xl"
    >
      <div className="flex items-baseline justify-between mb-4 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-marketing-muted">
            {s.kicker}
          </p>
          <p
            className="text-lg font-bold text-marketing-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {s.model}
          </p>
        </div>
        <span
          aria-hidden={!paused}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] flex-none"
          style={{
            background:
              "color-mix(in oklab, oklch(0.62 0.18 25) 16%, var(--color-marketing-bg))",
            color: "oklch(0.42 0.16 25)",
            transformOrigin: "center",
            transform: paused ? "scale(1)" : "scale(0)",
            opacity: paused ? 1 : 0,
            transition: reduced
              ? "none"
              : "transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 220ms ease-out",
          }}
        >
          <Hospital className="size-3.5" />
          {s.paused}
        </span>
      </div>

      {/* Hospital toggle row — mirrors HospitalToggle.tsx styling */}
      <div className="mb-4">
        <span
          className={cn(
            "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold w-fit",
            toggleOn
              ? "border-red-400 bg-red-50 text-red-900"
              : "border-marketing-line bg-marketing-bg text-marketing-ink",
          )}
          style={{
            transition: reduced ? "none" : "background-color 260ms ease-out, border-color 260ms ease-out, color 260ms ease-out",
          }}
        >
          <Hospital className="size-4" />
          <span>{t("dashboard.atHospital")}</span>
          <Switch checked={toggleOn} tabIndex={-1} aria-hidden />
        </span>
      </div>

      {/* Big countdown */}
      <div className="rounded-2xl bg-marketing-surface border border-marketing-line px-4 py-5 mb-4">
        <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-marketing-muted mb-1">
          {s.remainingKicker}
        </p>
        <p
          className="text-4xl md:text-5xl font-bold text-marketing-ink tabular-nums"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {s.remainingRunning(minutes)}
        </p>
        <p
          className="text-[12px] text-marketing-muted mt-1.5"
          style={{
            opacity: paused ? 1 : 0,
            transition: reduced ? "none" : "opacity 320ms ease-out 60ms",
            minHeight: "1.2em",
          }}
        >
          {s.resumes}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-[11px] text-marketing-muted mb-1.5">
          <span className="font-semibold">{s.tank}</span>
          <span>~{barPct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-marketing-line overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${barPct}%`,
              background: paused
                ? "repeating-linear-gradient(90deg, var(--color-marketing-sage) 0 8px, color-mix(in oklab, var(--color-marketing-sage) 55%, transparent) 8px 12px)"
                : "var(--color-marketing-sage)",
              transition: reduced ? "none" : "background 320ms ease-out",
            }}
          />
        </div>
      </div>

      {/* Warnings */}
      <div className="flex items-center gap-2 text-[12px] text-marketing-muted">
        <Bell className="size-3.5 flex-none" />
        <span>{s.warn}</span>
      </div>
    </div>
  );
}

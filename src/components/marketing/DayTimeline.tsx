import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Check, Clock, Bell, Pill } from "lucide-react";


/**
 * Section 4 — "A day held together by everyone."
 *
 * Scroll-pinned timeline on md+ with no-preference reduced motion:
 * a tall outer track ("~325vh") wraps a sticky inner viewport. As the user
 * scrolls the outer track, we read scroll progress (rAF-throttled, gated by
 * IntersectionObserver on the track) and crossfade between four cards.
 *
 * On mobile (<md) OR prefers-reduced-motion: reduce → NO pinning. All four
 * cards render stacked in DOM order (also the SSR/no-JS baseline). All cards
 * are always in the DOM; only opacity/transform + `aria-hidden` change in
 * pinned mode.
 *
 * No wheel/touch handlers, no preventDefault: pinning is pure `position:
 * sticky`, so keyboard scroll (space, PgDn, arrows), scrollbar drag and
 * touch inertia all work natively.
 */
const display = { fontFamily: "var(--font-display)", fontWeight: 600 } as const;

const CARD_COUNT = 4;
// Total track = 100vh viewport + (N-1) × stepVh transitions = 280vh. The four
// cards divide the 180vh of scroll evenly (45vh each) via progress × N below.
const STEP_VH = 60;

export function DayTimeline() {
  const { t } = useTranslation();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const inViewRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [progress, setProgress] = useState(0); // 0..CARD_COUNT
  const activeIndex = Math.min(CARD_COUNT - 1, Math.max(0, Math.floor(progress)));
  const sub = Math.min(1, Math.max(0, progress - activeIndex));

  // Gate pin on md+ AND no-preference reduced-motion.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mqWide = window.matchMedia("(min-width: 768px)");
    const mqMotion = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const eval_ = () => setEnabled(mqWide.matches && mqMotion.matches);
    eval_();
    mqWide.addEventListener("change", eval_);
    mqMotion.addEventListener("change", eval_);
    return () => {
      mqWide.removeEventListener("change", eval_);
      mqMotion.removeEventListener("change", eval_);
    };
  }, []);

  // rAF-throttled scroll → progress. IO on the outer track flips inViewRef;
  // when it's false we short-circuit the scroll handler (still attached, but
  // cheap). Listener is fully torn down when `enabled` flips off.
  useEffect(() => {
    if (!enabled) return;
    const el = trackRef.current;
    if (!el) return;

    const compute = () => {
      rafRef.current = null;
      if (!inViewRef.current) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height - vh;
      if (total <= 0) {
        setProgress(0);
        return;
      }
      // -rect.top is how far we've scrolled past the track's start.
      const raw = (-rect.top) / total;
      const clamped = Math.min(1, Math.max(0, raw));
      // Multiply by CARD_COUNT so integer part == active card index, fractional == sub.
      setProgress(clamped * CARD_COUNT);
    };

    const onScroll = () => {
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(compute);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          inViewRef.current = e.isIntersecting;
          if (e.isIntersecting) onScroll();
        }
      },
      { threshold: 0, rootMargin: "0px" },
    );
    io.observe(el);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    compute();

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [enabled]);

  const cards = useMemo(
    () => [
      {
        eyebrow: t("marketing.day.timeline.c1.eyebrow"),
        title: t("marketing.day.timeline.c1.title"),
        body: t("marketing.day.timeline.c1.body"),
        visual: <Card1Visual />,
      },
      {
        eyebrow: t("marketing.day.timeline.c2.eyebrow"),
        title: t("marketing.day.timeline.c2.title"),
        body: t("marketing.day.timeline.c2.body"),
        visual: <Card2Visual />,
      },
      {
        eyebrow: t("marketing.day.timeline.c3.eyebrow"),
        title: t("marketing.day.timeline.c3.title"),
        body: t("marketing.day.timeline.c3.body"),
        visual: <Card3Visual />,
      },
      {
        eyebrow: t("marketing.day.timeline.c4.eyebrow"),
        title: t("marketing.day.timeline.c4.title"),
        body: t("marketing.day.timeline.c4.body"),
        visual: <Card4Visual />,
      },
    ],
    [t],
  );

  const header = (
    <div className="max-w-2xl mx-auto text-center space-y-3 md:space-y-4 mk-day-header">
      <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.22em] text-marketing-sage">
        {t("marketing.day.kicker")}
      </span>
      <h2 className="text-display-sm md:text-display-md text-marketing-ink" style={display}>
        {t("marketing.day.title")}
      </h2>
      <p className="mk-day-header-sub text-marketing-muted text-base md:text-lg leading-[1.7]">
        {t("marketing.day.sub")}
      </p>
    </div>
  );

  return (
    <section className="bg-marketing-surface border-y border-marketing-line">
      {enabled ? (
        <div
          ref={trackRef}
          className="mk-day-track relative"
          style={{ height: `calc(100vh + ${(CARD_COUNT - 1) * STEP_VH}vh)` }}
        >
          <div className="sticky top-0 h-screen min-h-[560px] flex flex-col justify-center px-6 md:px-8 pt-10 md:pt-14 pb-6 md:pb-10">
            <div className="mk-day-header-wrap shrink-0 pb-6 md:pb-8">
              {header}
            </div>
            <div className="max-w-6xl w-full mx-auto grid md:grid-cols-[128px_1fr] gap-8 md:gap-12">
              <Rail activeIndex={activeIndex} sub={sub} />
              <div className="relative grid" role="list">
                {cards.map((c, i) => {
                  const isActive = i === activeIndex;
                  // Cards ahead drift down, cards behind drift up; active sits at 0.
                  const dy = isActive ? 0 : i > activeIndex ? 12 : -12;
                  return (
                    <article
                      key={i}
                      role="listitem"
                      aria-hidden={!isActive}
                      className="[grid-area:1/1] rounded-3xl bg-marketing-bg border border-marketing-line p-8 md:p-10 shadow-sm"
                      style={{
                        opacity: isActive ? 1 : 0,
                        transform: `translateY(${dy}px)`,
                        transition:
                          "opacity 320ms ease-out, transform 320ms ease-out",
                        pointerEvents: isActive ? "auto" : "none",
                      }}
                    >
                      <CardBody
                        eyebrow={c.eyebrow}
                        title={c.title}
                        body={c.body}
                      >
                        {c.visual}
                      </CardBody>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="px-6 md:px-8 pt-16 md:pt-20 pb-20 md:pb-28">
          <div className="pb-10 md:pb-12">{header}</div>
          <div className="max-w-3xl mx-auto grid gap-6 md:gap-8">
            {cards.map((c, i) => (
              <article
                key={i}
                className="rounded-3xl bg-marketing-bg border border-marketing-line p-6 md:p-8 shadow-sm"
              >
                <CardBody eyebrow={c.eyebrow} title={c.title} body={c.body}>
                  {c.visual}
                </CardBody>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function CardBody({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div className="grid md:grid-cols-[1fr_1fr] gap-6 md:gap-10 items-center">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-marketing-sage mb-3 tabular-nums">
          {eyebrow}
        </p>
        <h3
          className="text-display-sm md:text-display-md text-marketing-ink mb-4"
          style={display}
        >
          {title}
        </h3>
        <p className="text-marketing-muted text-base md:text-lg leading-[1.7]">
          {body}
        </p>
      </div>
      <div>{children}</div>
    </div>
  );
}

/* Left rail — desktop-pinned mode only, aria-hidden. */
function Rail({ activeIndex, sub }: { activeIndex: number; sub: number }) {
  const { t } = useTranslation();
  const labels = [
    t("marketing.day.timeline.c1.eyebrow"),
    t("marketing.day.timeline.c2.eyebrow"),
    t("marketing.day.timeline.c3.eyebrow"),
    t("marketing.day.timeline.c4.eyebrow"),
  ];
  return (
    <div className="hidden md:block relative" aria-hidden>
      <div className="relative h-full min-h-[320px]">
        {/* Vertical line */}
        <div className="absolute left-2 top-1 bottom-1 w-px bg-marketing-line" />
        {/* Filled segment: from top to (activeIndex + sub) / (N-1) */}
        <div
          className="absolute left-2 top-1 w-px bg-marketing-sage origin-top"
          style={{
            bottom: 4,
            transform: `scaleY(${Math.min(
              1,
              (activeIndex + sub) / (labels.length - 1),
            )})`,
            transition: "transform 200ms ease-out",
          }}
        />
        <ul className="relative flex flex-col justify-between h-full min-h-[320px] py-0.5">
          {labels.map((l, i) => {
            const done = i < activeIndex;
            const active = i === activeIndex;
            return (
              <li key={i} className="flex items-center gap-3">
                <span
                  className="relative z-10 size-4 rounded-full border shrink-0 grid place-items-center"
                  style={{
                    background: done || active ? "var(--color-marketing-sage)" : "var(--color-marketing-bg)",
                    borderColor: done || active ? "var(--color-marketing-sage)" : "var(--color-marketing-line)",
                    boxShadow: active
                      ? "0 0 0 4px color-mix(in oklab, var(--color-marketing-sage) 22%, transparent)"
                      : "none",
                    transition: "background-color 200ms, box-shadow 200ms",
                  }}
                >
                  {done && (
                    <Check className="size-2.5 text-marketing-bg" strokeWidth={3} />
                  )}
                </span>
                <span
                  className="text-xs font-mono tabular-nums"
                  style={{
                    color: active
                      ? "var(--color-marketing-ink)"
                      : "var(--color-marketing-muted)",
                    fontWeight: active ? 600 : 400,
                    transition: "color 200ms",
                  }}
                >
                  {l}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* ── Visuals ─────────────────────────────────────────────────────────── */

function Card1Visual() {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-marketing-surface border border-marketing-line p-3.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-marketing-muted mb-2.5">
          {t("marketing.day.timeline.c1.selectorLabel")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-marketing-sage text-marketing-bg px-2.5 py-1 text-xs font-semibold">
            <span className="size-2 rounded-full bg-marketing-bg/90" />
            {t("marketing.day.timeline.c1.chipPicked")}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-marketing-bg border border-marketing-line text-marketing-ink px-2.5 py-1 text-xs">
            <span
              className="size-2 rounded-full"
              style={{ background: "oklch(0.72 0.15 30)" }}
            />
            {t("marketing.day.timeline.c1.chipOther1")}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-marketing-bg border border-marketing-line text-marketing-ink px-2.5 py-1 text-xs">
            <span
              className="size-2 rounded-full"
              style={{ background: "oklch(0.70 0.15 200)" }}
            />
            {t("marketing.day.timeline.c1.chipOther2")}
          </span>
        </div>
      </div>
      <div className="rounded-2xl bg-marketing-bg border border-marketing-line p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-marketing-muted mb-2">
          {t("marketing.day.timeline.c1.checklistLabel")}
        </p>
        <ul className="space-y-1.5">
          {[t("marketing.day.timeline.c1.checkA"), t("marketing.day.timeline.c1.checkB")].map(
            (item, i) => (
              <li key={i} className="flex items-center gap-2 text-[13px] text-marketing-ink">
                <span className="size-4 rounded-md border border-marketing-line grid place-items-center">
                  <Check className="size-3 text-marketing-sage" strokeWidth={3} />
                </span>
                {item}
              </li>
            ),
          )}
        </ul>
      </div>
    </div>
  );
}

function Card2Visual() {
  const { t } = useTranslation();
  const rows = [
    { time: t("marketing.day.timeline.c2.row1Time"), task: t("marketing.day.timeline.c2.row1Task"), sub: t("marketing.day.timeline.c2.row1Sub"), Icon: Pill },
    { time: t("marketing.day.timeline.c2.row2Time"), task: t("marketing.day.timeline.c2.row2Task"), sub: t("marketing.day.timeline.c2.row2Sub"), Icon: Clock },
    { time: t("marketing.day.timeline.c2.row3Time"), task: t("marketing.day.timeline.c2.row3Task"), sub: t("marketing.day.timeline.c2.row3Sub"), Icon: Pill },
  ];
  return (
    <ul className="space-y-2">
      {rows.map((r, i) => (
        <li
          key={i}
          className="flex items-center gap-3 rounded-2xl bg-marketing-bg border border-marketing-line px-3 py-2.5"
        >
          <span className="text-[11px] font-mono tabular-nums text-marketing-muted w-12 shrink-0">
            {r.time}
          </span>
          <span className="size-8 rounded-xl grid place-items-center bg-marketing-surface text-marketing-sage shrink-0">
            <r.Icon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-marketing-ink truncate">{r.task}</p>
            {r.sub ? <p className="text-[11px] text-marketing-muted truncate">{r.sub}</p> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Card3Visual() {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-marketing-bg border border-marketing-line p-3.5">
        <div className="flex items-baseline justify-between mb-2">
          <span
            className="text-display-xs text-marketing-ink tabular-nums"
            style={display}
          >
            {t("marketing.day.timeline.c3.progress")}
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-marketing-muted font-semibold">
            {t("marketing.day.timeline.c3.progressLabel")}
          </span>
        </div>
        <div className="h-2 rounded-full bg-marketing-line overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: "57%",
              background:
                "linear-gradient(90deg, var(--color-marketing-sage) 0%, color-mix(in oklab, var(--color-marketing-sage) 60%, white) 100%)",
            }}
          />
        </div>
      </div>
      <div
        className="rounded-2xl border p-3 flex items-center gap-2.5"
        style={{
          background: "color-mix(in oklab, oklch(0.75 0.15 60) 10%, transparent)",
          borderColor: "color-mix(in oklab, oklch(0.75 0.15 60) 30%, transparent)",
        }}
      >
        <span className="size-8 rounded-xl grid place-items-center bg-marketing-bg text-[oklch(0.62_0.16_60)] shrink-0">
          <Bell className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-marketing-ink truncate">
            {t("marketing.day.timeline.c3.alertTitle")}
          </p>
          <p className="text-[11px] text-marketing-muted truncate">
            {t("marketing.day.timeline.c3.alertMeta")}
          </p>
        </div>
      </div>
    </div>
  );
}

function Card4Visual() {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-marketing-bg border border-marketing-line p-3.5">
        <p className="text-[10px] uppercase tracking-[0.18em] text-marketing-muted font-semibold mb-2">
          {t("marketing.day.timeline.c4.prefillLead")}
        </p>
        <ul className="space-y-1 text-[12px] text-marketing-muted italic">
          <li>• {t("marketing.day.timeline.c4.prefill1")}</li>
          <li>• {t("marketing.day.timeline.c4.prefill2")}</li>
        </ul>
      </div>
      <div className="rounded-2xl bg-marketing-surface border border-marketing-line p-2.5 flex items-center gap-2.5">
        <span className="size-6 rounded-full grid place-items-center bg-marketing-sage/15 text-marketing-sage shrink-0">
          <Check className="size-3.5" strokeWidth={3} />
        </span>
        <p className="text-[12px] text-marketing-ink flex-1 truncate">
          {t("marketing.day.timeline.c4.readBy")}
        </p>
      </div>
    </div>
  );
}

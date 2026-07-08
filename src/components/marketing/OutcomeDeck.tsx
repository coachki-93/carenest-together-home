import { useEffect, useRef, useState, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Pill, Package, BellOff, BellRing, Check, type LucideIcon } from "lucide-react";
import { Reveal } from "@/components/marketing/Reveal";

/**
 * Section 5 — "What actually changes at home."
 *
 * Fanned deck of four outcome cards on xl+ with no-preference reduced-motion.
 * Closed state: eyebrow + headline + icon fully legible for every card. Hover
 * or focus-visible on a card: it lifts to the front (z + shadow), straightens
 * to 0deg, scales ~1.03, reveals body + vignette. Siblings dim + part slightly.
 *
 * Below xl (<1280px) OR prefers-reduced-motion: reduce → the existing stacked
 * OutcomeCard grid renders instead. Same gating pattern as DayTimeline.
 *
 * Entrance choreography: one-shot deal-in on scroll-into-view (IO 20%). Cards
 * start collapsed at center-x and animate to their fan positions, staggered
 * 60ms cards 1→4, 420ms each. After the last card lands the deck is "armed"
 * (hover/focus enabled). Reduced-motion skips the deal-in.
 */

const display = { fontFamily: "var(--font-display)", fontWeight: 600 } as const;

type CardTheme = {
  bg: string;
  border: string;
  chipBg: string;
  chipFg: string;
  eyebrow: string;
  ink: string;
  muted: string;
  bodyMuted: string;
  ringShadow: string;
};

const THEME: Record<"sage" | "amber" | "violet" | "ink", CardTheme> = {
  sage: {
    bg: "color-mix(in oklab, var(--color-marketing-sage) 12%, var(--color-marketing-bg))",
    border: "color-mix(in oklab, var(--color-marketing-sage) 40%, transparent)",
    chipBg: "color-mix(in oklab, var(--color-marketing-sage) 22%, var(--color-marketing-bg))",
    chipFg: "var(--color-marketing-sage)",
    eyebrow: "var(--color-marketing-sage)",
    ink: "var(--color-marketing-ink)",
    muted: "var(--color-marketing-muted)",
    bodyMuted: "var(--color-marketing-muted)",
    ringShadow:
      "0 30px 60px -20px color-mix(in oklab, var(--color-marketing-sage) 40%, transparent), 0 8px 20px -8px color-mix(in oklab, var(--color-marketing-ink) 25%, transparent)",
  },
  amber: {
    bg: "color-mix(in oklab, oklch(0.78 0.13 70) 14%, var(--color-marketing-bg))",
    border: "color-mix(in oklab, oklch(0.62 0.16 60) 32%, transparent)",
    chipBg: "color-mix(in oklab, oklch(0.75 0.13 65) 24%, var(--color-marketing-bg))",
    chipFg: "oklch(0.48 0.12 55)",
    eyebrow: "oklch(0.48 0.12 55)",
    ink: "var(--color-marketing-ink)",
    muted: "var(--color-marketing-muted)",
    bodyMuted: "var(--color-marketing-muted)",
    ringShadow:
      "0 30px 60px -20px color-mix(in oklab, oklch(0.62 0.16 60) 40%, transparent), 0 8px 20px -8px color-mix(in oklab, var(--color-marketing-ink) 25%, transparent)",
  },
  violet: {
    bg: "color-mix(in oklab, oklch(0.55 0.16 285) 14%, var(--color-marketing-bg))",
    border: "color-mix(in oklab, oklch(0.55 0.16 285) 34%, transparent)",
    chipBg: "color-mix(in oklab, oklch(0.55 0.16 285) 22%, var(--color-marketing-bg))",
    chipFg: "oklch(0.42 0.16 285)",
    eyebrow: "oklch(0.42 0.16 285)",
    ink: "var(--color-marketing-ink)",
    muted: "var(--color-marketing-muted)",
    bodyMuted: "var(--color-marketing-muted)",
    ringShadow:
      "0 30px 60px -20px color-mix(in oklab, oklch(0.55 0.16 285) 45%, transparent), 0 8px 20px -8px color-mix(in oklab, var(--color-marketing-ink) 25%, transparent)",
  },
  ink: {
    bg: "var(--color-marketing-ink)",
    border: "color-mix(in oklab, var(--color-marketing-bg) 12%, transparent)",
    chipBg: "color-mix(in oklab, var(--color-marketing-bg) 10%, transparent)",
    chipFg: "var(--color-marketing-bg)",
    eyebrow: "var(--color-marketing-sage)",
    ink: "var(--color-marketing-bg)",
    muted: "color-mix(in oklab, var(--color-marketing-bg) 68%, transparent)",
    bodyMuted: "color-mix(in oklab, var(--color-marketing-bg) 78%, transparent)",
    ringShadow:
      "0 30px 60px -20px color-mix(in oklab, var(--color-marketing-ink) 60%, transparent), 0 8px 20px -8px color-mix(in oklab, var(--color-marketing-ink) 40%, transparent)",
  },
};

type OutcomeDef = {
  key: string;
  eyebrowKey: string;
  headlineKey: string;
  bodyKey: string;
  icon: LucideIcon;
  theme: keyof typeof THEME;
  Vignette: () => JSX.Element;
};

/* ── Vignettes ─────────────────────────────────────────────────────── */

function MedicationVignette() {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl bg-marketing-bg border border-marketing-line p-3 flex items-center gap-3">
      <div className="size-9 rounded-xl bg-marketing-sage-soft border border-marketing-sage-line text-marketing-sage flex items-center justify-center shrink-0">
        <Pill className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-marketing-ink truncate">
          {t("marketing.outcomes.vignette.medName")}
        </p>
        <p className="text-[11px] text-marketing-muted tabular-nums truncate">
          {t("marketing.outcomes.vignette.medTime")} · {t("marketing.outcomes.vignette.medBy")}
        </p>
      </div>
      <span className="inline-flex items-center gap-1 rounded-full bg-marketing-sage-soft border border-marketing-sage-line text-marketing-sage px-2 py-0.5 text-[11px] font-semibold shrink-0">
        <Check className="size-2.5" strokeWidth={3} />
        {t("marketing.outcomes.vignette.medGiven")}
      </span>
    </div>
  );
}

function SuppliesVignette() {
  const { t } = useTranslation();
  const items = [
    {
      name: t("marketing.outcomes.vignette.suppliesItem1Name"),
      qty: t("marketing.outcomes.vignette.suppliesItem1Qty"),
    },
    {
      name: t("marketing.outcomes.vignette.suppliesItem2Name"),
      qty: t("marketing.outcomes.vignette.suppliesItem2Qty"),
    },
  ];
  return (
    <div className="rounded-2xl bg-marketing-bg border border-marketing-line p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ color: "oklch(0.48 0.14 25)" }}
        >
          {t("marketing.outcomes.vignette.suppliesToOrder")}
        </p>
        <span className="text-[10px] text-marketing-muted font-medium">
          → {t("marketing.outcomes.vignette.suppliesShoppingList")}
        </span>
      </div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5"
            style={{
              background: "color-mix(in oklab, oklch(0.65 0.18 25) 6%, transparent)",
              borderColor: "color-mix(in oklab, oklch(0.65 0.18 25) 22%, transparent)",
            }}
          >
            <span className="text-[12px] font-semibold text-marketing-ink truncate">
              {it.name}
            </span>
            <span className="text-[11px] tabular-nums text-marketing-muted shrink-0">
              {it.qty}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CalmVignette() {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl bg-marketing-bg border border-marketing-line p-3.5">
      <div className="flex items-baseline justify-between mb-2">
        <span
          className="text-display-xs text-marketing-ink tabular-nums"
          style={display}
        >
          {t("marketing.outcomes.vignette.calmProgress")}
        </span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-marketing-muted font-semibold">
          {t("marketing.outcomes.vignette.calmProgressLabel")}
        </span>
      </div>
      <div className="h-2 rounded-full bg-marketing-line overflow-hidden mb-3">
        <div
          className="h-full rounded-full"
          style={{
            width: "100%",
            background:
              "linear-gradient(90deg, var(--color-marketing-sage) 0%, color-mix(in oklab, var(--color-marketing-sage) 60%, white) 100%)",
          }}
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="size-6 rounded-full grid place-items-center bg-marketing-sage/15 text-marketing-sage shrink-0">
          <Check className="size-3.5" strokeWidth={3} />
        </span>
        <p className="text-[12px] font-medium text-marketing-ink flex-1">
          {t("marketing.outcomes.vignette.calmAllClear")}
        </p>
      </div>
    </div>
  );
}

function CheckVignette() {
  const { t } = useTranslation();
  return (
    <div
      className="rounded-2xl border p-3 flex items-center gap-3"
      style={{
        background: "color-mix(in oklab, var(--color-marketing-bg) 8%, transparent)",
        borderColor: "color-mix(in oklab, var(--color-marketing-bg) 20%, transparent)",
      }}
    >
      <span
        className="size-9 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: "color-mix(in oklab, var(--color-marketing-bg) 14%, transparent)",
          color: "var(--color-marketing-bg)",
        }}
      >
        <BellRing className="size-4" />
      </span>
      <p
        className="text-[13px] font-semibold flex-1 min-w-0 truncate"
        style={{ color: "var(--color-marketing-bg)" }}
      >
        {t("marketing.outcomes.vignette.checkTitle")}
      </p>
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums shrink-0"
        style={{
          background: "color-mix(in oklab, oklch(0.72 0.16 30) 30%, transparent)",
          color: "var(--color-marketing-bg)",
        }}
      >
        {t("marketing.outcomes.vignette.checkLate")}
      </span>
    </div>
  );
}

/* ── Data ─────────────────────────────────────────────────────────── */

const CARDS: OutcomeDef[] = [
  {
    key: "meds",
    eyebrowKey: "marketing.outcomes.c1Eyebrow",
    headlineKey: "marketing.outcomes.c1Headline",
    bodyKey: "marketing.outcomes.c1Body",
    icon: Pill,
    theme: "sage",
    Vignette: MedicationVignette,
  },
  {
    key: "supplies",
    eyebrowKey: "marketing.outcomes.c2Eyebrow",
    headlineKey: "marketing.outcomes.c2Headline",
    bodyKey: "marketing.outcomes.c2Body",
    icon: Package,
    theme: "amber",
    Vignette: SuppliesVignette,
  },
  {
    key: "calm",
    eyebrowKey: "marketing.outcomes.c3Eyebrow",
    headlineKey: "marketing.outcomes.c3Headline",
    bodyKey: "marketing.outcomes.c3Body",
    icon: BellOff,
    theme: "violet",
    Vignette: CalmVignette,
  },
  {
    key: "checks",
    eyebrowKey: "marketing.outcomes.c4Eyebrow",
    headlineKey: "marketing.outcomes.c4Headline",
    bodyKey: "marketing.outcomes.c4Body",
    icon: BellRing,
    theme: "ink",
    Vignette: CheckVignette,
  },
];

/* Fan geometry — center-anchored. */
const FAN = [
  { rotate: -8, tx: -360, ty: 12 },
  { rotate: -3, tx: -130, ty: 2 },
  { rotate: 3, tx: 130, ty: 2 },
  { rotate: 8, tx: 360, ty: 12 },
] as const;

/* Sibling parting when another card is open — outer cards move outward more. */
const PART = [
  { rotate: -1, tx: -10 },
  { rotate: -0.5, tx: -4 },
  { rotate: 0.5, tx: 4 },
  { rotate: 1, tx: 10 },
] as const;

/* ── Deck ─────────────────────────────────────────────────────────── */

export function OutcomeDeck() {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  const [dealt, setDealt] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const deckRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mqWide = window.matchMedia("(min-width: 1280px)");
    const mqMotion = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const evalGate = () => {
      setEnabled(mqWide.matches && mqMotion.matches);
      setReduced(!mqMotion.matches);
    };
    evalGate();
    mqWide.addEventListener("change", evalGate);
    mqMotion.addEventListener("change", evalGate);
    return () => {
      mqWide.removeEventListener("change", evalGate);
      mqMotion.removeEventListener("change", evalGate);
    };
  }, []);

  // Entrance deal-in when the deck scrolls into view.
  useEffect(() => {
    if (!enabled) return;
    if (reduced) {
      setDealt(true);
      return;
    }
    const el = deckRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setDealt(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled, reduced]);

  // Escape closes; outside-tap closes.
  useEffect(() => {
    if (openIndex == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenIndex(null);
    };
    const onDown = (e: PointerEvent) => {
      const el = deckRef.current;
      if (!el) return;
      if (!(e.target instanceof Node) || !el.contains(e.target)) {
        setOpenIndex(null);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [openIndex]);

  useEffect(() => () => {
    if (closeTimer.current != null) window.clearTimeout(closeTimer.current);
  }, []);

  const openNow = (i: number) => {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpenIndex(i);
  };
  const closeDeferred = (i: number) => {
    if (closeTimer.current != null) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      // Only close if this card is still the open one.
      setOpenIndex((cur) => (cur === i ? null : cur));
      closeTimer.current = null;
    }, 150);
  };

  return (
    <section className="px-6 md:px-8 py-20 md:py-28">
      <div className="max-w-6xl mx-auto">
        <Reveal className="max-w-2xl mx-auto text-center space-y-4 mb-14">
          <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.22em] text-marketing-sage">
            {t("marketing.outcomes.kicker")}
          </span>
          <h2 className="text-display-md text-marketing-ink" style={display}>
            {t("marketing.outcomes.title")}
          </h2>
        </Reveal>

        {enabled ? (
          <div
            ref={deckRef}
            className="relative mx-auto"
            style={{ height: 520, maxWidth: 1152 }}
          >
            {CARDS.map((c, i) => {
              const isOpen = openIndex === i;
              const anyOpen = openIndex != null;
              const otherOpen = anyOpen && !isOpen;
              const rest = FAN[i];
              const part = otherOpen
                ? { rotate: PART[i].rotate, tx: PART[i].tx, ty: 0 }
                : { rotate: 0, tx: 0, ty: 0 };

              // Not dealt yet: collapsed at center, no rotation, invisible.
              // Dealt: rest position, or open (0deg + scale + lift), plus
              // parting drift when another sibling is open.
              const rotate = !dealt
                ? 0
                : isOpen
                  ? 0
                  : rest.rotate + part.rotate;
              const tx = !dealt ? 0 : rest.tx + part.tx;
              const ty = !dealt
                ? 24
                : isOpen
                  ? rest.ty - 8
                  : rest.ty + part.ty;
              const scale = !dealt ? 0.98 : isOpen ? 1.03 : 1;
              const opacity = !dealt ? 0 : otherOpen ? 0.7 : 1;

              const theme = THEME[c.theme];
              const dealDelay = dealt && !reduced ? 0 : i * 60;

              return (
                <OutcomeFanCard
                  key={c.key}
                  index={i}
                  card={c}
                  theme={theme}
                  isOpen={isOpen}
                  reduced={reduced}
                  style={{
                    transform: `translate(-50%, 0) translate(${tx}px, ${ty}px) rotate(${rotate}deg) scale(${scale})`,
                    opacity,
                    zIndex: isOpen ? 20 : 5 + i,
                    transitionDelay: dealt ? "0ms" : `${dealDelay}ms`,
                    boxShadow: isOpen
                      ? theme.ringShadow
                      : "0 12px 30px -18px color-mix(in oklab, var(--color-marketing-ink) 35%, transparent)",
                  }}
                  onOpen={() => openNow(i)}
                  onDeferClose={() => closeDeferred(i)}
                />
              );
            })}
          </div>
        ) : (
          <FallbackGrid />
        )}
      </div>
    </section>
  );
}

/* ── Individual card ──────────────────────────────────────────────── */

function OutcomeFanCard({
  index,
  card,
  theme,
  isOpen,
  reduced,
  style,
  onOpen,
  onDeferClose,
}: {
  index: number;
  card: OutcomeDef;
  theme: CardTheme;
  isOpen: boolean;
  reduced: boolean;
  style: React.CSSProperties;
  onOpen: () => void;
  onDeferClose: () => void;
}) {
  const { t } = useTranslation();
  const Icon = card.icon;
  const Vignette = card.Vignette;
  // Inner pair (cards 2 & 3) sit deeper below the outer card corners.
  const topPad = index === 1 || index === 2 ? 32 : 20;
  const revealId = `outcome-reveal-${card.key}`;

  return (
    <button
      type="button"
      aria-expanded={isOpen}
      aria-controls={revealId}
      onPointerEnter={onOpen}
      onPointerLeave={onDeferClose}
      onFocus={onOpen}
      onBlur={onDeferClose}
      onClick={() => (isOpen ? onDeferClose() : onOpen())}
      className="absolute top-0 left-1/2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-marketing-sage focus-visible:ring-offset-2 focus-visible:ring-offset-marketing-bg rounded-3xl"
      style={{
        width: 320,
        height: 460,
        transformOrigin: "center center",
        transition: reduced
          ? "opacity 200ms ease-out"
          : "transform 320ms cubic-bezier(0.2, 0.7, 0.2, 1), opacity 220ms ease-out, box-shadow 260ms ease-out",
        willChange: "transform, opacity",
        ...style,
      }}
    >
      <div
        className="relative w-full h-full rounded-3xl border overflow-hidden"
        style={{
          background: theme.bg,
          borderColor: theme.border,
          padding: `${topPad}px 22px 22px 22px`,
        }}
      >
        {/* Face (always visible) */}
        <div className="flex items-start gap-3 mb-4">
          <span
            className="size-10 rounded-xl grid place-items-center shrink-0"
            style={{
              background: theme.chipBg,
              color: theme.chipFg,
            }}
          >
            <Icon className="size-5" />
          </span>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.22em] pt-2.5"
            style={{ color: theme.eyebrow }}
          >
            {t(card.eyebrowKey)}
          </p>
        </div>
        <h3
          className="text-[22px] leading-[1.2]"
          style={{ ...display, color: theme.ink, textWrap: "balance" as never }}
        >
          {t(card.headlineKey)}
        </h3>

        {/* Reveal (body + vignette) — always in the DOM. */}
        <div
          id={revealId}
          aria-hidden={!isOpen}
          className="absolute left-0 right-0 px-[22px]"
          style={{
            bottom: 22,
            opacity: isOpen ? 1 : 0,
            transform: isOpen ? "translateY(0)" : "translateY(6px)",
            transition: reduced
              ? "opacity 180ms ease-out"
              : "opacity 220ms ease-out 60ms, transform 220ms ease-out 60ms",
            pointerEvents: isOpen ? "auto" : "none",
          }}
        >
          <p
            className="text-[13px] leading-[1.55] mb-3"
            style={{ color: theme.bodyMuted }}
          >
            {t(card.bodyKey)}
          </p>
          <Vignette />
        </div>
      </div>
    </button>
  );
}

/* ── Fallback grid (sub-xl or reduced-motion) ─────────────────────── */

function FallbackGrid() {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
      {CARDS.map((c) => {
        const theme = THEME[c.theme];
        const Icon = c.icon;
        const Vignette = c.Vignette;
        return (
          <Reveal key={c.key}>
            <div
              className="rounded-3xl p-5 border h-full flex flex-col"
              style={{ background: theme.bg, borderColor: theme.border }}
            >
              <div className="flex items-start gap-3 mb-3">
                <span
                  className="size-10 rounded-xl grid place-items-center shrink-0"
                  style={{ background: theme.chipBg, color: theme.chipFg }}
                >
                  <Icon className="size-5" />
                </span>
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.22em] pt-2.5"
                  style={{ color: theme.eyebrow }}
                >
                  {t(c.eyebrowKey)}
                </p>
              </div>
              <h3
                className="text-display-xs mb-3"
                style={{ ...display, color: theme.ink, textWrap: "balance" as never }}
              >
                {t(c.headlineKey)}
              </h3>
              <p
                className="text-sm leading-relaxed mb-4"
                style={{ color: theme.bodyMuted }}
              >
                {t(c.bodyKey)}
              </p>
              <div className="mt-auto">
                <Vignette />
              </div>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}

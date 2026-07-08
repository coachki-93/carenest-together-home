import { useEffect, useRef, useState, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Pill, Package, BellOff, BellRing, Check, type LucideIcon } from "lucide-react";
import { Reveal } from "@/components/marketing/Reveal";

/**
 * Section 5 — "What actually changes at home."
 *
 * Fanned deck of four outcome cards on xl+ with no-preference reduced-motion.
 * ALL card content is rendered at rest (eyebrow, headline, body, vignette).
 * Hover / focus-visible is pure emphasis — the hovered card lifts to the
 * front (z + shadow), straightens to 0deg, scales ~1.03; siblings dim and
 * part slightly. No content is gated behind interaction.
 *
 * Below xl (<1280px) OR prefers-reduced-motion: reduce → the stacked
 * OutcomeCard grid renders instead, using the same enriched vignettes.
 *
 * Entrance choreography: one-shot deal-in on scroll-into-view (IO 20%).
 * Cards start collapsed at center-x and animate to their fan positions,
 * staggered 60ms cards 1→4. Reduced-motion skips the deal-in.
 *
 * ── Geometry (near-kiss, all content legible at rest) ────────────────
 * Card 300w × 500h, stage width 1120px. Center-anchored (top-0 left-1/2).
 * Horizontal centers: ±140, ±420  →  advance 280  →  overlap 20px.
 * Rotations kept: outer ±8°, inner ±3°.
 * At 8°, sin(8°)·250 ≈ 34.8px corner shift — neighbour top/bottom corners
 * dive a few px under; content zone (vertical middle) stays uncovered.
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
  Vignette: () => ReactElement;
};

/* ── Vignettes ─────────────────────────────────────────────────────── */

function MedRow({
  time,
  name,
  by,
  status,
}: {
  time: string;
  name: string;
  by?: string;
  status?: { label: string; kind: "given" | "upcoming" };
}) {
  return (
    <li className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 bg-marketing-bg border border-marketing-line">
      <span className="text-[10px] tabular-nums font-semibold text-marketing-muted w-10 shrink-0">
        {time}
      </span>
      <div className="min-w-0 flex-1">
        {by ? (
          <>
            <p className="text-[12px] font-semibold text-marketing-ink truncate leading-tight">
              {by}
            </p>
            <p className="text-[10px] text-marketing-muted truncate leading-tight">
              {name}
            </p>
          </>
        ) : (
          <p className="text-[12px] font-medium text-marketing-ink truncate leading-tight">
            {name}
          </p>
        )}
      </div>
      {status ? (
        status.kind === "given" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-marketing-sage-soft border border-marketing-sage-line text-marketing-sage px-1.5 py-0.5 text-[10px] font-semibold shrink-0">
            <Check className="size-2.5" strokeWidth={3} />
            {status.label}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-marketing-line text-marketing-muted px-1.5 py-0.5 text-[10px] font-semibold shrink-0">
            {status.label}
          </span>
        )
      ) : (
        <span className="inline-flex items-center rounded-full border border-marketing-line text-marketing-muted px-1.5 py-0.5 text-[10px] font-semibold shrink-0">
          —
        </span>
      )}
    </li>
  );
}

function MedicationVignette() {
  const { t } = useTranslation();
  return (
    <ul className="space-y-1.5">
      <MedRow
        time={t("marketing.outcomes.vignette.medRow1Time")}
        name={t("marketing.outcomes.vignette.medRow1Name")}
        by={t("marketing.outcomes.vignette.medRow1By")}
        status={{ label: t("marketing.outcomes.vignette.medGiven"), kind: "given" }}
      />
      <MedRow
        time={t("marketing.outcomes.vignette.medRow2Time")}
        name={t("marketing.outcomes.vignette.medRow2Name")}
        by={t("marketing.outcomes.vignette.medRow2By")}
        status={{ label: t("marketing.outcomes.vignette.medGiven"), kind: "given" }}
      />
      <MedRow
        time={t("marketing.outcomes.vignette.medRow3Time")}
        name={t("marketing.outcomes.vignette.medRow3Name")}
      />
    </ul>
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
    {
      name: t("marketing.outcomes.vignette.suppliesItem3Name"),
      qty: t("marketing.outcomes.vignette.suppliesItem3Qty"),
    },
  ];
  return (
    <div className="space-y-2">
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
    <div className="flex flex-col items-center text-center gap-3 py-2">
      <span className="size-10 rounded-full grid place-items-center bg-marketing-sage/15 text-marketing-sage">
        <Check className="size-5" strokeWidth={3} />
      </span>
      <p
        className="text-[17px] leading-[1.35] text-marketing-ink"
        style={{ ...display, textWrap: "balance" as never }}
      >
        {t("schedule.allCaughtUp")}
      </p>
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

/* Fan geometry — center-anchored. Advance 280 → overlap 20px near-kiss. */
const FAN = [
  { rotate: -8, tx: -420, ty: 10 },
  { rotate: -3, tx: -140, ty: 0 },
  { rotate: 3, tx: 140, ty: 0 },
  { rotate: 8, tx: 420, ty: 10 },
] as const;

/* Sibling parting when another card is hovered — outer moves outward more. */
const PART = [
  { rotate: -1, tx: -10 },
  { rotate: -0.5, tx: -4 },
  { rotate: 0.5, tx: 4 },
  { rotate: 1, tx: 10 },
] as const;

const CARD_W = 300;
const CARD_H = 500;

/* ── Deck ─────────────────────────────────────────────────────────── */

export function OutcomeDeck() {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  const [dealt, setDealt] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const deckRef = useRef<HTMLDivElement | null>(null);

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
            style={{ height: CARD_H + 40, maxWidth: 1120 }}
          >
            {CARDS.map((c, i) => {
              const isHover = hoverIndex === i;
              const anyHover = hoverIndex != null;
              const otherHover = anyHover && !isHover;
              const rest = FAN[i];
              const part = otherHover
                ? { rotate: PART[i].rotate, tx: PART[i].tx, ty: 0 }
                : { rotate: 0, tx: 0, ty: 0 };

              const rotate = !dealt
                ? 0
                : isHover
                  ? 0
                  : rest.rotate + part.rotate;
              const tx = !dealt ? 0 : rest.tx + part.tx;
              const ty = !dealt
                ? 24
                : isHover
                  ? rest.ty - 8
                  : rest.ty + part.ty;
              const scale = !dealt ? 0.98 : isHover ? 1.03 : 1;
              const opacity = !dealt ? 0 : otherHover ? 0.7 : 1;

              const theme = THEME[c.theme];
              const dealDelay = dealt && !reduced ? 0 : i * 60;

              return (
                <OutcomeFanCard
                  key={c.key}
                  card={c}
                  theme={theme}
                  isHover={isHover}
                  reduced={reduced}
                  style={{
                    transform: `translate(-50%, 0) translate(${tx}px, ${ty}px) rotate(${rotate}deg) scale(${scale})`,
                    opacity,
                    zIndex: isHover ? 20 : 5 + i,
                    transitionDelay: dealt ? "0ms" : `${dealDelay}ms`,
                    boxShadow: isHover
                      ? theme.ringShadow
                      : "0 12px 30px -18px color-mix(in oklab, var(--color-marketing-ink) 35%, transparent)",
                  }}
                  onEnter={() => setHoverIndex(i)}
                  onLeave={() => setHoverIndex((cur) => (cur === i ? null : cur))}
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
  card,
  theme,
  isHover,
  reduced,
  style,
  onEnter,
  onLeave,
}: {
  card: OutcomeDef;
  theme: CardTheme;
  isHover: boolean;
  reduced: boolean;
  style: React.CSSProperties;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const { t } = useTranslation();
  const Icon = card.icon;
  const Vignette = card.Vignette;

  return (
    <article
      tabIndex={0}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      className="absolute top-0 left-1/2 focus:outline-none focus-visible:ring-2 focus-visible:ring-marketing-sage focus-visible:ring-offset-2 focus-visible:ring-offset-marketing-bg rounded-3xl"
      style={{
        width: CARD_W,
        height: CARD_H,
        transformOrigin: "center center",
        transition: reduced
          ? "opacity 200ms ease-out"
          : "transform 320ms cubic-bezier(0.2, 0.7, 0.2, 1), opacity 220ms ease-out, box-shadow 260ms ease-out",
        willChange: "transform, opacity",
        ...style,
      }}
    >
      <div
        className="relative w-full h-full rounded-3xl border overflow-hidden flex flex-col"
        style={{
          background: theme.bg,
          borderColor: theme.border,
          padding: "22px",
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <span
            className="size-10 rounded-xl grid place-items-center shrink-0"
            style={{ background: theme.chipBg, color: theme.chipFg }}
          >
            <Icon className="size-5" />
          </span>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.22em]"
            style={{ color: theme.eyebrow }}
          >
            {t(card.eyebrowKey)}
          </p>
        </div>
        <h3
          className="text-[20px] leading-[1.22] mb-3"
          style={{
            ...display,
            color: theme.ink,
            textWrap: "balance" as never,
          }}
        >
          {t(card.headlineKey)}
        </h3>
        <p
          className="text-[12.5px] leading-[1.55] mb-4"
          style={{ color: theme.bodyMuted }}
        >
          {t(card.bodyKey)}
        </p>
        <div className="mt-auto">
          <Vignette />
        </div>
      </div>
    </article>
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
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="size-10 rounded-xl grid place-items-center shrink-0"
                  style={{ background: theme.chipBg, color: theme.chipFg }}
                >
                  <Icon className="size-5" />
                </span>
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.22em]"
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

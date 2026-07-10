import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Siren,
  ClipboardList,
  BabyIcon,
  Settings2,
  Smartphone,
  Languages,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/marketing/Reveal";
import { Kicker } from "@/components/marketing/Kicker";
import {
  OUTCOME_DECK_THEME,
  type CardTheme,
} from "@/components/marketing/OutcomeDeck";
import { MosaicRow } from "@/components/features/MosaicRow";

/**
 * MosaicDeck — 6-card fanned deck for the /features "Always there" section.
 *
 * Same deal-in + hover/focus emphasis choreography as OutcomeDeck (landing).
 * Reuses OUTCOME_DECK_THEME so palette + shadows are identical. Since only 4
 * themes exist for 6 cards, two are repeated in an order that keeps no two
 * adjacent cards sharing a color: violet, sage, amber, ink, violet, sage.
 *
 * Gates: xl-only (>= 1280px) AND prefers-reduced-motion: no-preference.
 * Otherwise falls back to the existing MosaicRow grid unchanged.
 *
 * ── Geometry ─────────────────────────────────────────────────────────
 * Card 230w × 320h, stage width 1120px. Center-anchored.
 * Horizontal centers: ±450, ±270, ±90 → advance 180 → overlap 50px near-kiss.
 * Rotations: outer ±10°, middle ±6°, inner ±2°.
 */

const display = { fontFamily: "var(--font-display)", fontWeight: 600 } as const;

type MosaicCard = {
  key: string;
  Icon: LucideIcon;
  titleKey: string;
  bodyKey: string;
  theme: keyof typeof OUTCOME_DECK_THEME;
};

const CARDS: MosaicCard[] = [
  { key: "c1", Icon: Siren, titleKey: "featuresV2.mosaic.c1t", bodyKey: "featuresV2.mosaic.c1b", theme: "violet" },
  { key: "c2", Icon: ClipboardList, titleKey: "featuresV2.mosaic.c2t", bodyKey: "featuresV2.mosaic.c2b", theme: "sage" },
  { key: "c3", Icon: BabyIcon, titleKey: "featuresV2.mosaic.c3t", bodyKey: "featuresV2.mosaic.c3b", theme: "amber" },
  { key: "c4", Icon: Settings2, titleKey: "featuresV2.mosaic.c4t", bodyKey: "featuresV2.mosaic.c4b", theme: "ink" },
  { key: "c5", Icon: Smartphone, titleKey: "featuresV2.mosaic.c5t", bodyKey: "featuresV2.mosaic.c5b", theme: "violet" },
  { key: "c6", Icon: Languages, titleKey: "featuresV2.mosaic.c6t", bodyKey: "featuresV2.mosaic.c6b", theme: "sage" },
];

const FAN = [
  { rotate: -10, tx: -450, ty: 16 },
  { rotate: -6, tx: -270, ty: 6 },
  { rotate: -2, tx: -90, ty: 0 },
  { rotate: 2, tx: 90, ty: 0 },
  { rotate: 6, tx: 270, ty: 6 },
  { rotate: 10, tx: 450, ty: 16 },
] as const;

const PART = [
  { rotate: -1.2, tx: -12 },
  { rotate: -0.8, tx: -7 },
  { rotate: -0.4, tx: -3 },
  { rotate: 0.4, tx: 3 },
  { rotate: 0.8, tx: 7 },
  { rotate: 1.2, tx: 12 },
] as const;

const CARD_W = 230;
const CARD_H = 320;

export function MosaicDeck() {
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

  if (!enabled) {
    // Fallback grid = existing MosaicRow (unchanged).
    return <MosaicRow />;
  }

  return (
    <section className="relative px-6 md:px-8 py-20 md:py-28 border-t border-marketing-line bg-marketing-surface">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-14 md:mb-16">
          <Reveal>
            <Kicker>{t("featuresV2.mosaic.kicker")}</Kicker>
          </Reveal>
          <Reveal delayMs={120}>
            <p
              className="mt-5 text-marketing-ink text-lg md:text-xl leading-[1.6]"
              style={{ ...display, fontWeight: 500, textWrap: "balance" as never }}
            >
              {t("featuresV2.mosaic.intro")}
            </p>
          </Reveal>
        </div>

        <div
          ref={deckRef}
          className="relative mx-auto"
          style={{ height: CARD_H + 48, maxWidth: 1120 }}
        >
          {CARDS.map((c, i) => {
            const isHover = hoverIndex === i;
            const anyHover = hoverIndex != null;
            const otherHover = anyHover && !isHover;
            const rest = FAN[i];
            const part = otherHover
              ? { rotate: PART[i].rotate, tx: PART[i].tx, ty: 0 }
              : { rotate: 0, tx: 0, ty: 0 };

            const rotate = !dealt ? 0 : isHover ? 0 : rest.rotate + part.rotate;
            const tx = !dealt ? 0 : rest.tx + part.tx;
            const ty = !dealt ? 24 : isHover ? rest.ty - 8 : rest.ty + part.ty;
            const scale = !dealt ? 0.98 : isHover ? 1.04 : 1;
            const opacity = !dealt ? 0 : otherHover ? 0.68 : 1;

            const theme = OUTCOME_DECK_THEME[c.theme];
            const dealDelay = dealt && !reduced ? 0 : i * 60;

            return (
              <MosaicFanCard
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
      </div>
    </section>
  );
}

function MosaicFanCard({
  card,
  theme,
  reduced,
  style,
  onEnter,
  onLeave,
}: {
  card: MosaicCard;
  theme: CardTheme;
  isHover: boolean;
  reduced: boolean;
  style: React.CSSProperties;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const { t } = useTranslation();
  const Icon = card.Icon;
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
        <span
          className="size-11 rounded-xl grid place-items-center shrink-0 mb-5"
          style={{ background: theme.chipBg, color: theme.chipFg }}
          aria-hidden
        >
          <Icon className="size-5" strokeWidth={1.8} />
        </span>
        <h3
          className="text-[18px] leading-[1.25] mb-3"
          style={{ ...display, color: theme.ink, textWrap: "balance" as never }}
        >
          {t(card.titleKey)}
        </h3>
        <p
          className="text-[13px] leading-[1.6]"
          style={{ color: theme.bodyMuted }}
        >
          {t(card.bodyKey)}
        </p>
      </div>
    </article>
  );
}

import { Check, type LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Reveal } from "@/components/marketing/Reveal";
import { Kicker } from "@/components/marketing/Kicker";

/**
 * FeatureBand — shared shell for /features bands.
 *
 * Anatomy: kicker · declarative headline (solid ink, no gradient — gradient is
 * reserved for the page hero) · 1–2 line sub · large visual · compact checklist
 * with tinted check icons. Alternates left/right on lg+ via `reverse`; stacked
 * on mobile. Reveal choreography is armed-paused (default), one-shot;
 * reduced-motion is instant (handled inside Reveal).
 */

export type BandTint = "sage" | "amber" | "violet" | "ink";

const TINT: Record<BandTint, { chipBg: string; chipFg: string; check: string }> = {
  sage: {
    chipBg:
      "color-mix(in oklab, var(--color-marketing-sage) 22%, var(--color-marketing-bg))",
    chipFg: "var(--color-marketing-sage)",
    check: "var(--color-marketing-sage)",
  },
  amber: {
    chipBg: "color-mix(in oklab, oklch(0.75 0.13 65) 24%, var(--color-marketing-bg))",
    chipFg: "oklch(0.48 0.12 55)",
    check: "oklch(0.48 0.12 55)",
  },
  violet: {
    chipBg: "color-mix(in oklab, oklch(0.55 0.16 285) 22%, var(--color-marketing-bg))",
    chipFg: "oklch(0.42 0.16 285)",
    check: "oklch(0.42 0.16 285)",
  },
  ink: {
    chipBg:
      "color-mix(in oklab, var(--color-marketing-ink) 10%, var(--color-marketing-bg))",
    chipFg: "var(--color-marketing-ink)",
    check: "var(--color-marketing-ink)",
  },
};

export function bandTint(tint: BandTint) {
  return TINT[tint];
}

const display = { fontFamily: "var(--font-display)", fontWeight: 600 } as const;

export interface FeatureBandProps {
  kicker: string;
  headline: string;
  sub: string;
  bullets: string[];
  Icon?: LucideIcon;
  visual: ReactNode;
  tint: BandTint;
  reverse?: boolean;
  surface?: boolean;
  compact?: boolean;
  id?: string;
}

export function FeatureBand({
  kicker,
  headline,
  sub,
  bullets,
  Icon,
  visual,
  tint,
  reverse = false,
  surface = false,
  compact = false,
  id,
}: FeatureBandProps) {
  const t = TINT[tint];
  return (
    <section
      id={id}
      className={
        "relative px-6 md:px-8 border-t border-marketing-line " +
        (compact ? "py-14 md:py-20 " : "py-20 md:py-28 ") +
        (surface ? "bg-marketing-surface" : "")
      }
    >
      <div className="max-w-6xl mx-auto">
        <div
          className={
            "grid gap-10 lg:gap-16 items-center lg:grid-cols-2 " +
            (reverse ? "lg:[&>*:first-child]:order-2" : "")
          }
        >
          <div>
            <Reveal>
              <div className="flex items-center gap-3 mb-4">
                {Icon ? (
                  <span
                    className="size-10 rounded-xl grid place-items-center"
                    style={{ background: t.chipBg, color: t.chipFg }}
                    aria-hidden
                  >
                    <Icon className="size-5" strokeWidth={1.8} />
                  </span>
                ) : null}
                <Kicker>{kicker}</Kicker>
              </div>
              <h2
                className="text-display-md text-marketing-ink mb-5"
                style={{ ...display, textWrap: "balance" as never }}
              >
                {headline}
              </h2>
              <p className="text-marketing-muted text-base md:text-lg leading-[1.75] mb-7">
                {sub}
              </p>
            </Reveal>
            <ul className="space-y-3">
              {bullets.map((b, i) => (
                <Reveal key={i} delayMs={140 + i * 60}>
                  <li className="flex items-start gap-3">
                    <span
                      className="mt-1 size-5 rounded-full grid place-items-center flex-none"
                      style={{ background: t.chipBg, color: t.check }}
                      aria-hidden
                    >
                      <Check className="size-3.5" strokeWidth={2.5} />
                    </span>
                    <span className="text-marketing-ink text-[15px] md:text-base leading-[1.6]">
                      {b}
                    </span>
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
          <Reveal delayMs={140}>
            <div className="relative">{visual}</div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/** Small utility for mock cards that need a consistent glass surface. */
export function MockCardStyle(): CSSProperties {
  return {
    background: "var(--color-marketing-bg)",
  };
}

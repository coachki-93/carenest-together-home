import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { MobileCardCarousel } from "@/components/marketing/MobileCardCarousel";

export type DayTimelineCard = {
  eyebrow: string;
  title: string;
  body: string;
  visual: ReactNode;
};

const display = { fontFamily: "var(--font-display)", fontWeight: 600 } as const;

/**
 * Mobile-only (<md) presentation of the "A day with Tillsa" timeline:
 * a swipeable scroll-snap carousel, one step per viewport width.
 * Fully separate render from the desktop pinned timeline — no pinning,
 * no scroll-progress transforms.
 */
export function DayTimelineMobile({
  cards,
  header,
}: {
  cards: DayTimelineCard[];
  header: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className="px-4 pt-16 pb-20">
      <div className="pb-8">{header}</div>
      <MobileCardCarousel
        label={t("marketing.day.title")}
        dotLabel={(i, total) => `${i + 1} / ${total}`}
        slides={cards.map((c, i) => (
          <article
            key={i}
            className="w-full min-w-0 overflow-hidden rounded-3xl border border-marketing-line bg-marketing-bg p-5 shadow-sm"
          >
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-marketing-sage tabular-nums">
              {c.eyebrow}
            </p>
            <h3
              className="mb-3 text-display-sm text-marketing-ink"
              style={display}
            >
              {c.title}
            </h3>
            <p className="mb-5 text-base leading-[1.7] text-marketing-muted">
              {c.body}
            </p>
            <div className="min-w-0">{c.visual}</div>
          </article>
        ))}
      />
    </div>
  );
}

import {
  Siren,
  ClipboardList,
  BabyIcon,
  Settings2,
  Smartphone,
  Languages,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Reveal } from "@/components/marketing/Reveal";
import { Kicker } from "@/components/marketing/Kicker";

/**
 * MosaicRow — six "always there" cards, About-style data-card idiom.
 * Push notifications lives in the intro sentence, not its own card.
 */
export function MosaicRow() {
  const { t } = useTranslation();

  const cards: Array<{ Icon: LucideIcon; title: string; body: string; tint: string }> = [
    {
      Icon: Siren,
      title: t("featuresV2.mosaic.c1t"),
      body: t("featuresV2.mosaic.c1b"),
      tint: "oklch(0.62 0.18 25)",
    },
    {
      Icon: ClipboardList,
      title: t("featuresV2.mosaic.c2t"),
      body: t("featuresV2.mosaic.c2b"),
      tint: "var(--color-marketing-sage)",
    },
    {
      Icon: BabyIcon,
      title: t("featuresV2.mosaic.c3t"),
      body: t("featuresV2.mosaic.c3b"),
      tint: "oklch(0.55 0.16 285)",
    },
    {
      Icon: Settings2,
      title: t("featuresV2.mosaic.c4t"),
      body: t("featuresV2.mosaic.c4b"),
      tint: "var(--color-marketing-ink)",
    },
    {
      Icon: Smartphone,
      title: t("featuresV2.mosaic.c5t"),
      body: t("featuresV2.mosaic.c5b"),
      tint: "oklch(0.62 0.14 45)",
    },
    {
      Icon: Languages,
      title: t("featuresV2.mosaic.c6t"),
      body: t("featuresV2.mosaic.c6b"),
      tint: "oklch(0.48 0.14 200)",
    },
  ];

  return (
    <section className="relative px-6 md:px-8 py-20 md:py-28 border-t border-marketing-line bg-marketing-surface">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
          <Reveal>
            <Kicker>{t("featuresV2.mosaic.kicker")}</Kicker>
          </Reveal>
          <Reveal delayMs={120}>
            <p
              className="mt-5 text-marketing-ink text-lg md:text-xl leading-[1.6]"
              style={{ fontFamily: "var(--font-display)", fontWeight: 500, textWrap: "balance" as never }}
            >
              {t("featuresV2.mosaic.intro")}
            </p>
          </Reveal>
        </div>

        <div className="grid gap-4 md:gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ Icon, title, body, tint }, i) => (
            <Reveal key={i} delayMs={120 + i * 60}>
              <article className="mk-glass mk-glass-border rounded-2xl p-6 h-full flex flex-col">
                <span
                  className="size-10 rounded-xl grid place-items-center mb-4"
                  style={{
                    background: `color-mix(in oklab, ${tint} 16%, var(--color-marketing-bg))`,
                    color: tint,
                  }}
                  aria-hidden
                >
                  <Icon className="size-5" strokeWidth={1.8} />
                </span>
                <h3
                  className="text-marketing-ink text-lg mb-2"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
                >
                  {title}
                </h3>
                <p className="text-marketing-muted text-[14.5px] leading-[1.65]">
                  {body}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

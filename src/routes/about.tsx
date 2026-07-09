import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Plus, Users, UserCheck, Ban, EyeOff, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { MarketingHeader } from "@/components/carenest/MarketingHeader";
import { MarketingFooter } from "@/components/carenest/MarketingFooter";
import { Reveal } from "@/components/marketing/Reveal";
import { HeroHeadline } from "@/components/marketing/HeroHeadline";
import {
  OUTCOME_DECK_THEME,
  type CardTheme,
} from "@/components/marketing/OutcomeDeck";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { resolveHeadLanguage, OG_LOCALE } from "@/lib/i18n/head";

const SITE = "https://carenest-together-home.lovable.app";
const OG_IMAGE = SITE + "/og-image.jpg";
const CONTACT_EMAIL = "hello@carenest.app";

const ABOUT_META = {
  en: {
    title: "About CareNest — built with families",
    description:
      "CareNest is the calm, shared place for what keeps a medically complex child safe — built with the families living it.",
    ogTitle: "About CareNest",
    ogDescription:
      "Why CareNest exists, what it believes, how your family's data is handled, and how to get in touch.",
  },
  sv: {
    title: "Om CareNest — byggt med familjer",
    description:
      "CareNest är den lugna, gemensamma platsen för det som håller ett barn med komplexa vårdbehov tryggt — byggt med familjerna som lever det.",
    ogTitle: "Om CareNest",
    ogDescription:
      "Varför CareNest finns, vad vi tror på, hur familjens data hanteras, och hur du kontaktar oss.",
  },
} as const;

export const Route = createFileRoute("/about")({
  head: () => {
    const lang = resolveHeadLanguage();
    const m = ABOUT_META[lang];
    return {
      meta: [
        { title: m.title },
        { name: "description", content: m.description },
        { property: "og:title", content: m.ogTitle },
        { property: "og:description", content: m.ogDescription },
        { property: "og:url", content: SITE + "/about" },
        { property: "og:type", content: "website" },
        { property: "og:locale", content: OG_LOCALE[lang] },
        { property: "og:image", content: OG_IMAGE },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: OG_IMAGE },
      ],
      links: [{ rel: "canonical", href: SITE + "/about" }],
    };
  },
  component: AboutPage,
});

const serif = {
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  letterSpacing: "-0.025em",
} as const;

const display = { fontFamily: "var(--font-display)", fontWeight: 600 } as const;

// Bare uppercase tracked label — matches landing's Kicker (no dot, no pill).
function Kicker({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.22em] text-marketing-sage">
      {children}
    </span>
  );
}

// Per-word mk-headline-gradient spans, static (no entrance) — used for
// section-scale headings that want the same gradient signature as the hero.
function GradientWords({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <span key={i} className="mk-headline-gradient inline-block">
          {w}
          {i < words.length - 1 ? "\u00A0" : ""}
        </span>
      ))}
    </>
  );
}

function AboutPage() {
  const { t } = useTranslation();
  const faqKeys = ["q1", "q2", "q3", "q4", "q5"] as const;
  return (
    <main
      className="min-h-screen bg-marketing-bg text-marketing-ink antialiased pt-20 md:pt-24"
      style={{ fontFamily: "var(--font-sans-marketing)" }}
    >
      <MarketingHeader />

      {/* Hero + story (one continuous opening statement) */}
      <section className="px-6 md:px-8 pt-10 md:pt-16 pb-20 md:pb-28">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <Reveal immediate delayMs={0}>
            <Kicker>{t("marketing.about.kicker")}</Kicker>
          </Reveal>
          <HeroHeadline
            line1={t("marketing.about.title")}
            line2={t("marketing.about.titleB")}
          />
          <div className="space-y-6 text-[1.05rem] leading-[1.85] text-marketing-muted pt-2">
            <Reveal immediate delayMs={520}>
              <p>{t("marketing.about.p1")}</p>
            </Reveal>
            <Reveal immediate delayMs={640}>
              <p>{t("marketing.about.p2")}</p>
            </Reveal>
            <Reveal immediate delayMs={760}>
              <p>{t("marketing.about.p3")}</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Your child's data */}
      <section className="px-6 md:px-8 py-20 md:py-24 border-t border-marketing-line bg-marketing-surface">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="max-w-2xl mb-12">
              <Reveal immediate delayMs={0}>
                <Kicker>{t("marketing.about.dataKicker")}</Kicker>
              </Reveal>
              <Reveal immediate delayMs={120}>
                <h2
                  className="tracking-tight text-marketing-ink mt-4"
                  style={{
                    ...serif,
                    fontSize: "clamp(1.75rem, 3.6vw, 2.5rem)",
                    lineHeight: 1.1,
                  }}
                >
                  <span className="block">
                    {t("marketing.about.dataTitleA")}
                  </span>
                  <span className="block">
                    <GradientWords text={t("marketing.about.dataTitleB")} />
                  </span>
                </h2>
              </Reveal>
            </div>
          </Reveal>

          <div className="grid gap-5 md:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                Icon: Users,
                theme: OUTCOME_DECK_THEME.sage,
                eyebrow: "marketing.about.data1Eyebrow",
                headline: "marketing.about.data1Headline",
                body: "marketing.about.data1Body",
                rotate: -2,
              },
              {
                Icon: UserCheck,
                theme: OUTCOME_DECK_THEME.amber,
                eyebrow: "marketing.about.data2Eyebrow",
                headline: "marketing.about.data2Headline",
                body: "marketing.about.data2Body",
                rotate: 1,
              },
              {
                Icon: Ban,
                theme: OUTCOME_DECK_THEME.violet,
                eyebrow: "marketing.about.data3Eyebrow",
                headline: "marketing.about.data3Headline",
                body: "marketing.about.data3Body",
                rotate: -1,
              },
              {
                Icon: EyeOff,
                theme: OUTCOME_DECK_THEME.ink,
                eyebrow: "marketing.about.data4Eyebrow",
                headline: "marketing.about.data4Headline",
                body: "marketing.about.data4Body",
                rotate: 2,
              },
            ].map((c, i) => (
              <Reveal key={i} immediate delayMs={i * 120}>
                <DataCard
                  Icon={c.Icon}
                  theme={c.theme}
                  eyebrow={t(c.eyebrow)}
                  headline={t(c.headline)}
                  body={t(c.body)}
                  rotate={c.rotate}
                />
              </Reveal>
            ))}
          </div>

          <Reveal immediate delayMs={600}>
            <p className="mt-10 text-xs md:text-sm text-marketing-muted leading-[1.75] max-w-3xl">
              {t("marketing.about.dataFootnote")}
            </p>
          </Reveal>
        </div>
      </section>

      {/* About-FAQ */}
      <section className="px-6 md:px-8 py-20 md:py-28 border-t border-marketing-line">
        <div className="max-w-3xl mx-auto">
          <Reveal className="text-center mb-12 space-y-3">
            <Kicker>{t("marketing.about.faqKicker")}</Kicker>
            <h2
              className="tracking-tight text-marketing-ink"
              style={{
                ...serif,
                fontSize: "clamp(1.75rem, 3.6vw, 2.5rem)",
                lineHeight: 1.1,
              }}
            >
              {t("marketing.about.faqTitle")}
            </h2>
          </Reveal>
          <Accordion
            type="single"
            collapsible
            defaultValue="q1"
            className="mk-glass rounded-3xl px-5 md:px-7 divide-y divide-marketing-line/60"
          >
            {faqKeys.map((k) => (
              <AccordionItem key={k} value={k} className="border-0">
                <AccordionTrigger
                  className="text-left text-lg py-5 hover:no-underline [&[data-state=open]>svg]:hidden text-marketing-ink"
                  style={serif}
                >
                  <span className="flex-1 pr-4">
                    {t(`marketing.about.faq.${k}Q`)}
                  </span>
                  <span className="text-marketing-sage shrink-0">
                    <Plus className="size-5 transition-transform [[data-state=open]_&]:rotate-45" />
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-marketing-muted text-base md:text-lg leading-[1.7]">
                  {t(`marketing.about.faq.${k}A`, { email: CONTACT_EMAIL })}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}

function DataCard({
  Icon,
  theme,
  eyebrow,
  headline,
  body,
  rotate,
}: {
  Icon: LucideIcon;
  theme: CardTheme;
  eyebrow: string;
  headline: string;
  body: string;
  rotate: number;
}) {
  return (
    <div
      className={
        "group rounded-3xl p-6 md:p-7 border flex flex-col min-h-[280px] md:min-h-[300px] xl:min-h-[320px] " +
        "transition-transform duration-300 ease-out will-change-transform " +
        "xl:[transform:rotate(var(--rest-rot))] xl:hover:[transform:rotate(0deg)_translateY(-4px)] " +
        "hover:shadow-[0_22px_50px_-24px_color-mix(in_oklab,var(--color-marketing-ink)_45%,transparent)] " +
        "motion-reduce:transition-none motion-reduce:xl:[transform:none] motion-reduce:hover:shadow-none"
      }
      style={
        {
          background: theme.bg,
          borderColor: theme.border,
          ["--rest-rot" as string]: `${rotate}deg`,
        } as React.CSSProperties
      }
    >
      <div className="flex items-center gap-3 mb-4">
        <span
          className="size-10 rounded-xl grid place-items-center shrink-0"
          style={{ background: theme.chipBg, color: theme.chipFg }}
        >
          <Icon className="size-5" strokeWidth={1.8} />
        </span>
        <p
          className="text-[11px] font-bold uppercase tracking-[0.22em]"
          style={{ color: theme.eyebrow }}
        >
          {eyebrow}
        </p>
      </div>
      <h3
        className="text-display-xs mb-3"
        style={{
          ...display,
          color: theme.ink,
          textWrap: "balance" as never,
        }}
      >
        {headline}
      </h3>
      <p
        className="text-[13px] leading-[1.6]"
        style={{ color: theme.bodyMuted }}
      >
        {body}
      </p>
    </div>
  );
}

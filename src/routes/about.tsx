import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Plus, Users, UserCheck, Ban, EyeOff, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { MarketingHeader } from "@/components/carenest/MarketingHeader";
import { MarketingFooter } from "@/components/carenest/MarketingFooter";
import { Reveal } from "@/components/marketing/Reveal";
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

// Bare uppercase tracked label — matches landing's Kicker (no dot, no pill).
function Kicker({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.22em] text-marketing-sage">
      {children}
    </span>
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

      {/* Hero */}
      <section className="px-6 md:px-8 pt-10 md:pt-16 pb-16 md:pb-24">
        <Reveal>
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <Reveal immediate delayMs={0}>
              <Kicker>{t("marketing.about.kicker")}</Kicker>
            </Reveal>
            <Reveal immediate delayMs={120}>
              <h1
                className="tracking-tight text-marketing-ink"
                style={{
                  ...serif,
                  fontSize: "clamp(2.25rem, 5.2vw, 3.75rem)",
                  lineHeight: 1.05,
                }}
              >
                <span className="block">{t("marketing.about.title")}</span>
                <span className="block mk-headline-gradient">
                  {t("marketing.about.titleB")}
                </span>
              </h1>
            </Reveal>
            <Reveal immediate delayMs={240}>
              <p className="text-marketing-muted leading-[1.75] text-[1.05rem] max-w-2xl mx-auto">
                {t("marketing.about.heroSub")}
              </p>
            </Reveal>
          </div>
        </Reveal>
      </section>

      {/* Our story — centered */}
      <section className="px-6 md:px-8 py-16 md:py-24 border-t border-marketing-line">
        <div className="max-w-2xl mx-auto text-center">
          <Reveal immediate delayMs={0}>
            <h2
              className="tracking-tight text-marketing-ink"
              style={{
                ...serif,
                fontSize: "clamp(1.75rem, 3.6vw, 2.5rem)",
                lineHeight: 1.1,
              }}
            >
              {t("marketing.about.storyLede")}
            </h2>
          </Reveal>
          <div className="mt-8 space-y-6 text-[1.05rem] leading-[1.85] text-marketing-muted">
            <Reveal immediate delayMs={120}>
              <p>{t("marketing.about.p1")}</p>
            </Reveal>
            <Reveal immediate delayMs={260}>
              <p>{t("marketing.about.p2")}</p>
            </Reveal>
            <Reveal immediate delayMs={400}>
              <p>{t("marketing.about.p3")}</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Your child's data */}
      <section className="px-6 md:px-8 py-20 md:py-24 border-t border-marketing-line bg-marketing-surface">
        <div className="max-w-5xl mx-auto">
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
                  <span className="block mk-headline-gradient">
                    {t("marketing.about.dataTitleB")}
                  </span>
                </h2>
              </Reveal>
            </div>
          </Reveal>

          <Reveal>
            <div className="grid gap-4 md:gap-5 sm:grid-cols-2">
              <Reveal immediate delayMs={0}>
                <DataCard
                  Icon={Users}
                  theme={OUTCOME_DECK_THEME.sage}
                  eyebrow={t("marketing.about.data1Eyebrow")}
                  headline={t("marketing.about.data1Headline")}
                  body={t("marketing.about.data1Body")}
                />
              </Reveal>
              <Reveal immediate delayMs={120}>
                <DataCard
                  Icon={UserCheck}
                  theme={OUTCOME_DECK_THEME.amber}
                  eyebrow={t("marketing.about.data2Eyebrow")}
                  headline={t("marketing.about.data2Headline")}
                  body={t("marketing.about.data2Body")}
                />
              </Reveal>
              <Reveal immediate delayMs={240}>
                <DataCard
                  Icon={Ban}
                  theme={OUTCOME_DECK_THEME.violet}
                  eyebrow={t("marketing.about.data3Eyebrow")}
                  headline={t("marketing.about.data3Headline")}
                  body={t("marketing.about.data3Body")}
                />
              </Reveal>
              <Reveal immediate delayMs={360}>
                <DataCard
                  Icon={EyeOff}
                  theme={OUTCOME_DECK_THEME.ink}
                  eyebrow={t("marketing.about.data4Eyebrow")}
                  headline={t("marketing.about.data4Headline")}
                  body={t("marketing.about.data4Body")}
                />
              </Reveal>
            </div>
          </Reveal>

          <Reveal immediate delayMs={480}>
            <p className="mt-8 text-xs md:text-sm text-marketing-muted leading-[1.75] max-w-3xl">
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
}: {
  Icon: LucideIcon;
  theme: CardTheme;
  eyebrow: string;
  headline: string;
  body: string;
}) {
  return (
    <div
      className={
        "rounded-3xl p-5 md:p-6 border h-full flex flex-col transition-all duration-200 " +
        "hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-22px_color-mix(in_oklab,var(--color-marketing-ink)_45%,transparent)] " +
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-none"
      }
      style={{ background: theme.bg, borderColor: theme.border }}
    >
      <div className="flex items-center gap-3 mb-3">
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
        className="text-[20px] leading-[1.22] mb-3"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
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



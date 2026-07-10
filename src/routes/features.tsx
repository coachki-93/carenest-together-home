import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  CalendarCheck,
  Activity,
  Pill,
  Wind,
  FileText,
  Users,
  Home,
  ArrowRight,
} from "lucide-react";
import { MarketingHeader } from "@/components/carenest/MarketingHeader";
import { MarketingFooter } from "@/components/carenest/MarketingFooter";
import { Reveal } from "@/components/marketing/Reveal";
import { Kicker } from "@/components/marketing/Kicker";
import { HeroHeadline } from "@/components/marketing/HeroHeadline";
import { FeatureBand } from "@/components/features/FeatureBand";
import { TodayMockLeft, TodayMockRight } from "@/components/features/mocks/TodayMock";
import { Check } from "lucide-react";
import { bandTint } from "@/components/features/FeatureBand";
import { VitalsMock } from "@/components/features/mocks/VitalsMock";
import { MedsMock } from "@/components/features/mocks/MedsMock";
import { OxygenMock } from "@/components/features/mocks/OxygenMock";
import { HandoversMock } from "@/components/features/mocks/HandoversMock";
import { TeamMock } from "@/components/features/mocks/TeamMock";
import { HouseholdMock } from "@/components/features/mocks/HouseholdMock";
import { MosaicRow } from "@/components/features/MosaicRow";
import { resolveHeadLanguage, OG_LOCALE } from "@/lib/i18n/head";

const SITE = "https://carenest-together-home.lovable.app";
const OG_IMAGE = SITE + "/og-image.jpg";

const FEATURES_META = {
  en: {
    title: "Features — everything CareNest does, in one place",
    description:
      "Today's tasks, vitals, medications, oxygen, handovers, team and household — every part of the day on one calm page.",
  },
  sv: {
    title: "Funktioner — allt CareNest gör, på ett ställe",
    description:
      "Dagens uppgifter, vitalvärden, mediciner, syrgas, överlämningar, team och hushåll — hela dagen på en lugn sida.",
  },
} as const;

export const Route = createFileRoute("/features")({
  head: () => {
    const lang = resolveHeadLanguage();
    const m = FEATURES_META[lang];
    return {
      meta: [
        { title: m.title },
        { name: "description", content: m.description },
        { property: "og:title", content: m.title },
        { property: "og:description", content: m.description },
        { property: "og:url", content: SITE + "/features" },
        { property: "og:type", content: "website" },
        { property: "og:locale", content: OG_LOCALE[lang] },
        { property: "og:image", content: OG_IMAGE },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: OG_IMAGE },
      ],
      links: [{ rel: "canonical", href: SITE + "/features" }],
    };
  },
  component: FeaturesPage,
});

const sansMk = { fontFamily: "var(--font-sans-marketing)" } as const;

function FeaturesPage() {
  const { t } = useTranslation();
  return (
    <main
      className="min-h-screen bg-marketing-bg text-marketing-ink antialiased pt-20 md:pt-24"
      style={sansMk}
    >
      <MarketingHeader />

      {/* Hero */}
      <section className="relative px-6 md:px-8 pt-10 md:pt-16 pb-16 md:pb-24">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <Reveal immediate delayMs={0}>
            <Kicker>{t("featuresV2.hero.kicker")}</Kicker>
          </Reveal>
          <HeroHeadline
            line1={t("featuresV2.hero.line1")}
            line2={t("featuresV2.hero.line2")}
          />
          <Reveal immediate delayMs={520}>
            <p className="text-marketing-muted text-base md:text-lg leading-[1.75] max-w-2xl mx-auto">
              {t("featuresV2.hero.sub")}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Band 1 — TODAY (bespoke: full-width intro, then two cards side by side) */}
      <TodayBand />


      {/* Band 2 — VITALS (visual left, violet, surface) */}
      <FeatureBand
        id="vitals"
        kicker={t("featuresV2.vitals.kicker")}
        headline={t("featuresV2.vitals.headline")}
        sub={t("featuresV2.vitals.sub")}
        bullets={[
          t("featuresV2.vitals.b1"),
          t("featuresV2.vitals.b2"),
          t("featuresV2.vitals.b3"),
          t("featuresV2.vitals.b4"),
          t("featuresV2.vitals.b5"),
        ]}
        Icon={Activity}
        tint="violet"
        reverse
        surface
        visual={<VitalsMock />}
      />

      {/* Band 3 — MEDICATIONS (visual right, amber) */}
      <FeatureBand
        id="medications"
        kicker={t("featuresV2.meds.kicker")}
        headline={t("featuresV2.meds.headline")}
        sub={t("featuresV2.meds.sub")}
        bullets={[
          t("featuresV2.meds.b1"),
          t("featuresV2.meds.b2"),
          t("featuresV2.meds.b3"),
          t("featuresV2.meds.b4"),
        ]}
        Icon={Pill}
        tint="amber"
        visual={<MedsMock />}
      />

      {/* Band 4 — OXYGEN (visual left, ink, surface) */}
      <FeatureBand
        id="oxygen"
        kicker={t("featuresV2.oxygen.kicker")}
        headline={t("featuresV2.oxygen.headline")}
        sub={t("featuresV2.oxygen.sub")}
        bullets={[
          t("featuresV2.oxygen.b1"),
          t("featuresV2.oxygen.b2"),
          t("featuresV2.oxygen.b3"),
          t("featuresV2.oxygen.b4"),
        ]}
        Icon={Wind}
        tint="ink"
        reverse
        surface
        visual={<OxygenMock />}
      />

      {/* Band 5 — HANDOVERS (visual right, sage) */}
      <FeatureBand
        id="handovers"
        kicker={t("featuresV2.handovers.kicker")}
        headline={t("featuresV2.handovers.headline")}
        sub={t("featuresV2.handovers.sub")}
        bullets={[
          t("featuresV2.handovers.b1"),
          t("featuresV2.handovers.b2"),
          t("featuresV2.handovers.b3"),
          t("featuresV2.handovers.b4"),
        ]}
        Icon={FileText}
        tint="sage"
        visual={<HandoversMock />}
      />

      {/* Band 6 — TEAM (visual left, violet, surface) */}
      <FeatureBand
        id="team"
        kicker={t("featuresV2.team.kicker")}
        headline={t("featuresV2.team.headline")}
        sub={t("featuresV2.team.sub")}
        bullets={[
          t("featuresV2.team.b1"),
          t("featuresV2.team.b2"),
          t("featuresV2.team.b3"),
          t("featuresV2.team.b4"),
        ]}
        Icon={Users}
        tint="violet"
        reverse
        surface
        visual={<TeamMock />}
      />

      {/* Band 7 — HOUSEHOLD (compact, visual right, amber) */}
      <FeatureBand
        id="household"
        kicker={t("featuresV2.household.kicker")}
        headline={t("featuresV2.household.headline")}
        sub={t("featuresV2.household.sub")}
        bullets={[
          t("featuresV2.household.b1"),
          t("featuresV2.household.b2"),
          t("featuresV2.household.b3"),
          t("featuresV2.household.b4"),
        ]}
        Icon={Home}
        tint="amber"
        compact
        visual={<HouseholdMock />}
      />

      {/* "Always there" mosaic */}
      <MosaicRow />

      {/* Closing CTA — glass pair (mirrors landing hero recipe) */}
      <section className="relative px-6 md:px-8 py-24 md:py-32 border-t border-marketing-line">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <Kicker>{t("featuresV2.cta.kicker")}</Kicker>
          </Reveal>
          <Reveal delayMs={120}>
            <h2
              className="mt-5 text-display-md text-marketing-ink"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                textWrap: "balance" as never,
              }}
            >
              {t("featuresV2.cta.headline")}
            </h2>
          </Reveal>
          <Reveal delayMs={200}>
            <p className="mt-5 text-marketing-muted text-base md:text-lg leading-[1.75] max-w-xl mx-auto">
              {t("featuresV2.cta.sub")}
            </p>
          </Reveal>
          <Reveal delayMs={280}>
            <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link
                to="/auth/signup"
                className="mk-cta-glass mk-cta-glass--primary inline-flex items-center justify-center gap-2 rounded-full font-semibold px-7 py-3.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-marketing-bg focus-visible:ring-primary"
              >
                {t("marketing.hero.ctaCreate")}
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/invite"
                className="mk-cta-glass mk-cta-glass--clear inline-flex items-center justify-center rounded-full text-marketing-ink font-semibold px-7 py-3.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-marketing-bg focus-visible:ring-marketing-sage"
              >
                {t("invite.haveInvite")}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}

function TodayBand() {
  const { t } = useTranslation();
  const tint = bandTint("sage");
  const bullets = [
    t("featuresV2.today.b1"),
    t("featuresV2.today.b2"),
    t("featuresV2.today.b3"),
    t("featuresV2.today.b4"),
    t("featuresV2.today.b5"),
  ];
  return (
    <section
      id="today"
      className="relative px-6 md:px-8 border-t border-marketing-line py-20 md:py-28"
    >
      <div className="max-w-6xl mx-auto">
        {/* Full-width intro (centered) */}
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <div className="flex items-center justify-center gap-3 mb-4">
              <span
                className="size-10 rounded-xl grid place-items-center"
                style={{ background: tint.chipBg, color: tint.chipFg }}
                aria-hidden
              >
                <CalendarCheck className="size-5" strokeWidth={1.8} />
              </span>
              <Kicker>{t("featuresV2.today.kicker")}</Kicker>
            </div>
            <h2
              className="text-display-md text-marketing-ink mb-5"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                textWrap: "balance" as never,
              }}
            >
              {t("featuresV2.today.headline")}
            </h2>
            <p className="text-marketing-muted text-base md:text-lg leading-[1.75] mb-7">
              {t("featuresV2.today.sub")}
            </p>
          </Reveal>
        </div>
        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3 mb-12 md:mb-16 max-w-2xl mx-auto">
          {bullets.map((b, i) => (
            <Reveal key={i} delayMs={140 + i * 60}>
              <li className="flex items-start gap-3 text-left">
                <span
                  className="mt-1 size-5 rounded-full grid place-items-center flex-none"
                  style={{ background: tint.chipBg, color: tint.check }}
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

        {/* Two cards side by side */}
        <div className="grid gap-6 lg:gap-8 lg:grid-cols-2 items-stretch">
          <Reveal delayMs={140} className="h-full">
            <TodayMockLeft />
          </Reveal>
          <Reveal delayMs={220} className="h-full">
            <TodayMockRight />
          </Reveal>
        </div>
      </div>
    </section>
  );
}


import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Mail, Users, UserCheck, Ban, EyeOff } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { MarketingHeader } from "@/components/carenest/MarketingHeader";
import { MarketingFooter } from "@/components/carenest/MarketingFooter";
import { Reveal } from "@/components/marketing/Reveal";

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

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-marketing-sage">
      <span className="w-1.5 h-1.5 rounded-full bg-marketing-sage" />
      {children}
    </p>
  );
}

function AboutPage() {
  const { t } = useTranslation();
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
                <span className="block text-marketing-sage">
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

      {/* Our story — two-column */}
      <section className="px-6 md:px-8 py-16 md:py-24 border-t border-marketing-line">
        <Reveal>
          <div className="max-w-5xl mx-auto grid gap-10 md:gap-16 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
            <div>
              <Reveal immediate delayMs={0}>
                <Kicker>{t("marketing.about.beliefsTitle")}</Kicker>
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
                  {t("marketing.about.storyLede")}
                </h2>
              </Reveal>
            </div>
            <div className="space-y-6 text-[1.05rem] leading-[1.85] text-marketing-muted">
              <Reveal immediate delayMs={0}>
                <p>{t("marketing.about.p1")}</p>
              </Reveal>
              <Reveal immediate delayMs={140}>
                <p>{t("marketing.about.p2")}</p>
              </Reveal>
              <Reveal immediate delayMs={280}>
                <p>{t("marketing.about.p3")}</p>
              </Reveal>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Beliefs — glass cards */}
      <section className="relative overflow-hidden px-6 md:px-8 py-20 md:py-24 border-t border-marketing-line">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-0"
          style={{
            background:
              "radial-gradient(60rem 24rem at 20% 0%, color-mix(in oklab, var(--primary) 8%, transparent), transparent 65%), radial-gradient(50rem 22rem at 85% 100%, color-mix(in oklab, var(--primary) 7%, transparent), transparent 70%)",
          }}
        />
        <div className="relative z-10 max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <Reveal immediate delayMs={0}>
                <Kicker>{t("marketing.about.beliefsTitle")}</Kicker>
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
                  {t("marketing.about.beliefsTitle")}
                </h2>
              </Reveal>
            </div>
          </Reveal>
          <Reveal>
            <div className="grid gap-5 md:gap-6 md:grid-cols-3">
              <Reveal immediate delayMs={0}>
                <Belief
                  title={t("marketing.about.b1Title")}
                  body={t("marketing.about.b1Body")}
                />
              </Reveal>
              <Reveal immediate delayMs={140}>
                <Belief
                  title={t("marketing.about.b2Title")}
                  body={t("marketing.about.b2Body")}
                />
              </Reveal>
              <Reveal immediate delayMs={280}>
                <Belief
                  title={t("marketing.about.b3Title")}
                  body={t("marketing.about.b3Body")}
                />
              </Reveal>
            </div>
          </Reveal>
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
                  <span className="block text-marketing-sage">
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
                  title={t("marketing.about.data1Title")}
                  body={t("marketing.about.data1Body")}
                />
              </Reveal>
              <Reveal immediate delayMs={120}>
                <DataCard
                  Icon={UserCheck}
                  title={t("marketing.about.data2Title")}
                  body={t("marketing.about.data2Body")}
                />
              </Reveal>
              <Reveal immediate delayMs={240}>
                <DataCard
                  Icon={Ban}
                  title={t("marketing.about.data3Title")}
                  body={t("marketing.about.data3Body")}
                />
              </Reveal>
              <Reveal immediate delayMs={360}>
                <DataCard
                  Icon={EyeOff}
                  title={t("marketing.about.data4Title")}
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

      {/* Contact + Closing CTA */}
      <section className="px-6 md:px-8 py-20 md:py-24 border-t border-marketing-line">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <Reveal immediate delayMs={0}>
            <h2
              className="tracking-tight text-marketing-ink"
              style={{
                ...serif,
                fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
                lineHeight: 1.1,
              }}
            >
              {t("marketing.about.contactTitle")}
            </h2>
          </Reveal>
          <Reveal immediate delayMs={120}>
            <p className="text-marketing-muted leading-[1.75]">
              {t("marketing.about.contactBody")}
            </p>
          </Reveal>
          <Reveal immediate delayMs={200}>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center gap-2 rounded-full bg-marketing-sage text-marketing-bg font-semibold px-6 py-3.5 shadow-sm hover:brightness-[1.08] transition-all"
            >
              <Mail className="size-4" />
              {CONTACT_EMAIL}
            </a>
          </Reveal>

          <Reveal immediate delayMs={320}>
            <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/auth/signup"
                className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-[1.08] transition-all"
              >
                {t("splash.ctaCreate")}
              </Link>
              <Link
                to="/invite"
                className="inline-flex items-center justify-center rounded-full border border-marketing-line bg-marketing-bg px-6 py-3 text-sm font-semibold text-marketing-ink hover:bg-marketing-surface transition-colors"
              >
                {t("splash.ctaInvite")}
              </Link>
            </div>
          </Reveal>

          <div className="pt-4">
            <Link
              to="/"
              className="text-sm text-marketing-muted hover:text-marketing-sage transition-colors"
            >
              ← {t("marketing.install.backHome")}
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}

function Belief({ title, body }: { title: string; body: string }) {
  return (
    <div className="mk-glass rounded-3xl p-6 md:p-7 h-full">
      <h3
        className="text-marketing-ink mb-2"
        style={{ ...serif, fontSize: "1.15rem", lineHeight: 1.25 }}
      >
        {title}
      </h3>
      <p className="text-marketing-muted leading-[1.75] text-sm md:text-[0.95rem]">
        {body}
      </p>
    </div>
  );
}

function DataCard({
  Icon,
  title,
  body,
}: {
  Icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-marketing-line bg-marketing-bg p-6 h-full">
      <div className="flex items-center gap-3 mb-3">
        <span className="inline-flex items-center justify-center size-9 rounded-full bg-marketing-sage/10 text-marketing-sage">
          <Icon className="size-[18px]" strokeWidth={1.8} />
        </span>
        <h3
          className="text-marketing-ink"
          style={{ ...serif, fontSize: "1.05rem", lineHeight: 1.25 }}
        >
          {title}
        </h3>
      </div>
      <p className="text-marketing-muted leading-[1.7] text-sm">{body}</p>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Mail } from "lucide-react";
import { MarketingHeader } from "@/components/carenest/MarketingHeader";
import { MarketingFooter } from "@/components/carenest/MarketingFooter";

import { resolveHeadLanguage, OG_LOCALE } from "@/lib/i18n/head";

const SITE = "https://carenest-together-home.lovable.app";
const OG_IMAGE = SITE + "/og-image.jpg";
const CONTACT_EMAIL = "hello@carenest.app";

const ABOUT_META = {
  en: {
    title: "About CareNest — built with families",
    description:
      "CareNest is built with and for families of children with special needs. The knowledge shouldn't live in one parent's head — this is a calm, shared place for it.",
    ogTitle: "About CareNest",
    ogDescription:
      "Why CareNest exists, what it believes, and how to get in touch. Built with families of medically complex children.",
  },
  sv: {
    title: "Om CareNest — byggt med familjer",
    description:
      "CareNest är byggt med och för familjer till barn med särskilda behov. Kunskapen ska inte bo i en förälders huvud — det här är en lugn, gemensam plats för den.",
    ogTitle: "Om CareNest",
    ogDescription:
      "Varför CareNest finns, vad vi tror på, och hur du kontaktar oss. Byggt med familjer till barn med komplexa vårdbehov.",
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


const serif = { fontFamily: "var(--font-display)", fontWeight: 700, letterSpacing: "-0.025em" } as const;

function AboutPage() {
  const { t } = useTranslation();
  return (
    <main className="min-h-screen bg-marketing-bg text-marketing-ink antialiased pt-20 md:pt-24" style={{ fontFamily: "var(--font-sans-marketing)" }}>
      <MarketingHeader />

      <section className="px-6 md:px-8 pt-10 md:pt-16 pb-14 md:pb-20">
        <div className="max-w-3xl mx-auto text-center">
          <p className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-marketing-sage">
            <span className="w-1.5 h-1.5 rounded-full bg-marketing-sage" />
            {t("marketing.about.kicker")}
          </p>
          <h1
            className="tracking-tight text-marketing-ink mt-5"
            style={{ ...serif, fontSize: "clamp(2rem, 4.5vw, 3.25rem)", lineHeight: 1.08 }}
          >
            {t("marketing.about.title")}
          </h1>
        </div>
      </section>

      <section className="px-6 md:px-8 pb-14">
        <div className="max-w-2xl mx-auto space-y-6 text-[1.05rem] leading-[1.85] text-marketing-muted">
          <p>{t("marketing.about.p1")}</p>
          <p>{t("marketing.about.p2")}</p>
          <p>{t("marketing.about.p3")}</p>
        </div>
      </section>

      <section className="px-6 md:px-8 py-16 md:py-20 border-y border-marketing-line bg-marketing-surface">
        <div className="max-w-3xl mx-auto">
          <h2
            className="tracking-tight text-marketing-ink text-center mb-10"
            style={{ ...serif, fontSize: "clamp(1.5rem, 3vw, 2.25rem)", lineHeight: 1.1 }}
          >
            {t("marketing.about.beliefsTitle")}
          </h2>
          <ul className="space-y-6">
            <Belief title={t("marketing.about.b1Title")} body={t("marketing.about.b1Body")} />
            <Belief title={t("marketing.about.b2Title")} body={t("marketing.about.b2Body")} />
            <Belief title={t("marketing.about.b3Title")} body={t("marketing.about.b3Body")} />
          </ul>
        </div>
      </section>

      <section className="px-6 md:px-8 py-20 md:py-24">
        <div className="max-w-2xl mx-auto text-center space-y-5">
          <h2 className="tracking-tight text-marketing-ink" style={{ ...serif, fontSize: "clamp(1.5rem, 3vw, 2.25rem)", lineHeight: 1.1 }}>
            {t("marketing.about.contactTitle")}
          </h2>
          <p className="text-marketing-muted leading-[1.75]">
            {t("marketing.about.contactBody")}
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center gap-2 rounded-full bg-marketing-sage text-marketing-bg font-semibold px-6 py-3.5 shadow-sm hover:brightness-[1.08] transition-all"
          >
            <Mail className="size-4" />
            {CONTACT_EMAIL}
          </a>
          <div className="pt-6">
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
    <li className="rounded-2xl border border-marketing-line bg-marketing-bg p-6 md:p-7 shadow-sm">
      <h3 className="text-marketing-ink mb-2" style={{ ...serif, fontSize: "1.2rem" }}>
        {title}
      </h3>
      <p className="text-marketing-muted leading-[1.75]">{body}</p>
    </li>
  );
}

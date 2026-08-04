import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Plus, ShieldAlert } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { MarketingHeader } from "@/components/carenest/MarketingHeader";
import { MarketingFooter } from "@/components/carenest/MarketingFooter";
import { FaqSection } from "@/components/carenest/FaqSection";
import { ContactForm } from "@/components/carenest/ContactForm";
import { Reveal } from "@/components/marketing/Reveal";
import { HeroHeadline } from "@/components/marketing/HeroHeadline";
import { Kicker } from "@/components/marketing/Kicker";
import { resolveHeadLanguage, OG_LOCALE } from "@/lib/i18n/head";

const SITE = "https://tillsa.app";
const OG_IMAGE = SITE + "/og-image.jpg";

const SUPPORT_META = {
  en: {
    title: "Support — help with Tillsa",
    description:
      "Find answers in the FAQ, learn what each feature does in the in-app Guidebook, or send us a message — a real person reads every one.",
    ogTitle: "Tillsa Support",
    ogDescription:
      "FAQ, in-app Guidebook and a direct line to us for account, billing and everything else.",
  },
  sv: {
    title: "Support — hjälp med Tillsa",
    description:
      "Hitta svar i vanliga frågor, läs vad varje funktion gör i handboken i appen, eller skicka ett meddelande — en riktig människa läser varje ett.",
    ogTitle: "Tillsa Support",
    ogDescription:
      "Vanliga frågor, handboken i appen och en direkt väg till oss för konto, betalning och allt annat.",
  },
} as const;

export const Route = createFileRoute("/support")({
  head: () => {
    const lang = resolveHeadLanguage();
    const m = SUPPORT_META[lang];
    return {
      meta: [
        { title: m.title },
        { name: "description", content: m.description },
        { property: "og:title", content: m.ogTitle },
        { property: "og:description", content: m.ogDescription },
        { property: "og:url", content: SITE + "/support" },
        { property: "og:type", content: "website" },
        { property: "og:locale", content: OG_LOCALE[lang] },
        { property: "og:image", content: OG_IMAGE },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: OG_IMAGE },
      ],
      links: [{ rel: "canonical", href: SITE + "/support" }],
    };
  },
  component: SupportPage,
});

const display = { fontFamily: "var(--font-display)", fontWeight: 600 } as const;
const serif = {
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  letterSpacing: "-0.025em",
} as const;

const TROUBLE = ["notif", "email", "offline", "login"];
const USING_KEYS = ["u1", "u2", "u3", "u4", "u5"];

function SupportPage() {
  const { t } = useTranslation();

  return (
    <main
      className="min-h-screen bg-marketing-bg text-marketing-ink antialiased pt-20 md:pt-24"
      style={{ fontFamily: "var(--font-sans-marketing)" }}
    >
      <MarketingHeader />

      {/* Hero */}
      <section className="px-6 md:px-8 pt-10 md:pt-16 pb-4">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <Reveal immediate delayMs={0}>
            <Kicker>{t("marketing.support.kicker")}</Kicker>
          </Reveal>
          <HeroHeadline
            line1={t("marketing.support.title")}
            line2={t("marketing.support.titleB")}
          />
          <Reveal immediate delayMs={320}>
            <p className="text-[1.05rem] leading-[1.85] text-marketing-muted">
              {t("marketing.support.intro")}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Safety note */}
      <section className="px-6 md:px-8 pt-6">
        <div className="max-w-2xl mx-auto">
          <Reveal>
            <div className="mk-glass rounded-3xl p-5 md:p-6 flex gap-4 border border-marketing-line/60">
              <ShieldAlert
                className="size-6 shrink-0 text-marketing-sage"
                strokeWidth={1.6}
                aria-hidden
              />
              <div className="space-y-1.5">
                <h2 className="text-marketing-ink text-base" style={serif}>
                  {t("marketing.support.safetyTitle")}
                </h2>
                <p className="text-marketing-muted text-sm leading-relaxed">
                  {t("marketing.support.safetyBody")}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Troubleshooting */}
      <section id="troubleshooting" className="px-6 md:px-8 py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          <Reveal className="text-center mb-10 space-y-3">
            <Kicker>{t("marketing.support.troubleshootKicker")}</Kicker>
            <h2 className="text-display-md text-marketing-ink" style={display}>
              {t("marketing.support.troubleshootTitle")}
            </h2>
          </Reveal>
          <Accordion
            type="single"
            collapsible
            className="mk-glass rounded-3xl px-5 md:px-7 divide-y divide-marketing-line/60"
          >
            {TROUBLE.map((k) => (
              <AccordionItem key={k} value={k} className="border-0">
                <AccordionTrigger
                  className="text-left text-lg py-5 hover:no-underline [&[data-state=open]>svg]:hidden text-marketing-ink"
                  style={display}
                >
                  <span className="flex-1 pr-4">
                    {t(`marketing.support.troubleshoot.${k}Q`)}
                  </span>
                  <span className="text-marketing-sage shrink-0">
                    <Plus className="size-5 transition-transform [[data-state=open]_&]:rotate-45" />
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-marketing-muted text-base leading-[1.75]">
                  {t(`marketing.support.troubleshoot.${k}A`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* FAQ — using the app */}
      <FaqSection
        id="support-using"
        keys={USING_KEYS}
        kicker="marketing.faq.usingKicker"
        title="marketing.faq.usingTitle"
        className="px-6 md:px-8 pb-16 md:pb-24"
      />

      {/* FAQ — general / pre-sale */}
      <FaqSection id="support-faq" className="px-6 md:px-8 pb-20 md:pb-28" />

      {/* Contact */}
      <section id="support-contact" className="px-6 md:px-8 pb-20 md:pb-28">
        <div className="max-w-xl mx-auto space-y-8">
          <Reveal className="text-center space-y-3">
            <Kicker>{t("marketing.support.contactKicker")}</Kicker>
            <h2 className="text-display-md text-marketing-ink" style={display}>
              {t("marketing.support.contactTitle")}
            </h2>
            <p className="text-marketing-muted text-base leading-[1.7]">
              {t("marketing.support.contactBody")}
            </p>
          </Reveal>
          <Reveal>
            <ContactForm idPrefix="support-contact" />
          </Reveal>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}


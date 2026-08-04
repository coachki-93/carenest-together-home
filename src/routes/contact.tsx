import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { MarketingHeader } from "@/components/carenest/MarketingHeader";
import { MarketingFooter } from "@/components/carenest/MarketingFooter";
import { Reveal } from "@/components/marketing/Reveal";
import { HeroHeadline } from "@/components/marketing/HeroHeadline";
import { ContactForm } from "@/components/carenest/ContactForm";
import { resolveHeadLanguage, OG_LOCALE } from "@/lib/i18n/head";

const SITE = "https://tillsa.app";
const OG_IMAGE = SITE + "/og-image.jpg";

export const Route = createFileRoute("/contact")({
  head: () => {
    const lang = resolveHeadLanguage();
    const m =
      lang === "sv"
        ? {
            title: "Kontakta Tillsa — vi läser varje meddelande",
            description:
              "Frågor, feedback eller något som inte fungerar? Skicka ett meddelande så hör vi av oss.",
            ogTitle: "Kontakta Tillsa",
            ogDescription:
              "Skicka ett meddelande — en riktig människa läser varje ett.",
          }
        : {
            title: "Contact Tillsa — we read every message",
            description:
              "Questions, feedback or something not working? Send us a message and we'll get back to you.",
            ogTitle: "Contact Tillsa",
            ogDescription: "Send us a message — a real person reads every one.",
          };
    return {
      meta: [
        { title: m.title },
        { name: "description", content: m.description },
        { property: "og:title", content: m.ogTitle },
        { property: "og:description", content: m.ogDescription },
        { property: "og:url", content: SITE + "/contact" },
        { property: "og:type", content: "website" },
        { property: "og:locale", content: OG_LOCALE[lang] },
        { property: "og:image", content: OG_IMAGE },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: OG_IMAGE },
      ],
      links: [{ rel: "canonical", href: SITE + "/contact" }],
    };
  },
  component: ContactPage,
});

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.22em] text-marketing-sage">
      {children}
    </span>
  );
}

function ContactPage() {
  const { t } = useTranslation();

  return (
    <main
      className="min-h-screen bg-marketing-bg text-marketing-ink antialiased pt-20 md:pt-24"
      style={{ fontFamily: "var(--font-sans-marketing)" }}
    >
      <MarketingHeader />

      <section className="px-6 md:px-8 pt-10 md:pt-16 pb-20 md:pb-28">
        <div className="max-w-xl mx-auto space-y-8">
          <div className="text-center space-y-6">
            <Reveal immediate delayMs={0}>
              <Kicker>{t("marketing.contact.kicker")}</Kicker>
            </Reveal>
            <HeroHeadline
              line1={t("marketing.contact.title")}
              line2={t("marketing.contact.titleB")}
            />
            <Reveal immediate delayMs={320}>
              <p className="text-[1.05rem] leading-[1.85] text-marketing-muted">
                {t("marketing.contact.intro")}
              </p>
            </Reveal>
          </div>

          <Reveal immediate delayMs={440}>
            <ContactForm />
          </Reveal>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}

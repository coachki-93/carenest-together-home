import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/marketing/LegalPage";
import { resolveHeadLanguage, OG_LOCALE } from "@/lib/i18n/head";

const SITE = "https://tillsa.app";
const OG_IMAGE = SITE + "/og/og-default.png";

const META = {
  en: {
    title: "Terms of Service — Tillsa",
    description:
      "The terms that apply when you use Tillsa: what the service is and is not, accounts, subscription and pricing, cancellation, and liability.",
  },
  sv: {
    title: "Användarvillkor — Tillsa",
    description:
      "Villkoren som gäller när du använder Tillsa: vad tjänsten är och inte är, konton, prenumeration och pris, uppsägning och ansvar.",
  },
} as const;

export const Route = createFileRoute("/terms")({
  head: () => {
    const lang = resolveHeadLanguage();
    const m = META[lang];
    return {
      meta: [
        { title: m.title },
        { name: "description", content: m.description },
        { property: "og:title", content: m.title },
        { property: "og:description", content: m.description },
        { property: "og:url", content: SITE + "/terms" },
        { property: "og:type", content: "website" },
        { property: "og:locale", content: OG_LOCALE[lang] },
        { property: "og:image", content: OG_IMAGE },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: OG_IMAGE },
      ],
      links: [{ rel: "canonical", href: SITE + "/terms" }],
    };
  },
  component: TermsPage,
});

function TermsPage() {
  return <LegalPage docKey="terms" />;
}

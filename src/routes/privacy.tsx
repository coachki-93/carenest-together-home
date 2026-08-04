import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/marketing/LegalPage";
import { resolveHeadLanguage, OG_LOCALE } from "@/lib/i18n/head";

const SITE = "https://tillsa.app";
const OG_IMAGE = SITE + "/og-image.jpg";

const META = {
  en: {
    title: "Privacy Policy — Tillsa",
    description:
      "How Tillsa handles your family's data: what we process, the legal basis, where it is stored, how long we keep it, and your GDPR rights.",
  },
  sv: {
    title: "Integritetspolicy — Tillsa",
    description:
      "Hur Tillsa hanterar er familjs uppgifter: vad vi behandlar, rättslig grund, var det lagras, hur länge vi sparar det och era rättigheter enligt GDPR.",
  },
} as const;

export const Route = createFileRoute("/privacy")({
  head: () => {
    const lang = resolveHeadLanguage();
    const m = META[lang];
    return {
      meta: [
        { title: m.title },
        { name: "description", content: m.description },
        { property: "og:title", content: m.title },
        { property: "og:description", content: m.description },
        { property: "og:url", content: SITE + "/privacy" },
        { property: "og:type", content: "website" },
        { property: "og:locale", content: OG_LOCALE[lang] },
        { property: "og:image", content: OG_IMAGE },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: OG_IMAGE },
      ],
      links: [{ rel: "canonical", href: SITE + "/privacy" }],
    };
  },
  component: PrivacyPage,
});

function PrivacyPage() {
  return <LegalPage docKey="privacy" />;
}

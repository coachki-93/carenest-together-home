import { useTranslation } from "react-i18next";
import { MarketingHeader } from "@/components/carenest/MarketingHeader";
import { MarketingFooter } from "@/components/carenest/MarketingFooter";
import { Reveal } from "@/components/marketing/Reveal";

type Section = { heading: string; body: string[] };

const serif = {
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  letterSpacing: "-0.025em",
} as const;

/** Shared long-form layout for legal pages (privacy policy, terms of service).
 *  Content comes entirely from i18n under `legal.<doc>.*`. */
export function LegalPage({ docKey }: { docKey: "privacy" | "terms" }) {
  const { t } = useTranslation();
  const base = `legal.${docKey}`;
  const sections = t(`${base}.sections`, { returnObjects: true }) as Section[];

  return (
    <main
      className="min-h-screen bg-marketing-bg text-marketing-ink antialiased pt-20 md:pt-24"
      style={{ fontFamily: "var(--font-sans-marketing)" }}
    >
      <MarketingHeader />

      <section className="px-6 md:px-8 pt-10 md:pt-16 pb-16 md:pb-20">
        <div className="max-w-2xl mx-auto">
          <Reveal immediate>
            <h1
              className="tracking-tight text-marketing-ink"
              style={{
                ...serif,
                fontSize: "clamp(2rem, 4.4vw, 3rem)",
                lineHeight: 1.1,
              }}
            >
              {t(`${base}.title`)}
            </h1>
          </Reveal>
          <Reveal immediate delayMs={120}>
            <p className="mt-4 text-sm text-marketing-muted">
              {t(`${base}.updated`)}
            </p>
          </Reveal>
          <Reveal immediate delayMs={200}>
            <p className="mt-6 text-[1.05rem] leading-[1.85] text-marketing-muted">
              {t(`${base}.intro`)}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="px-6 md:px-8 pb-24 md:pb-32 border-t border-marketing-line bg-marketing-surface pt-14 md:pt-20">
        <div className="max-w-2xl mx-auto space-y-12">
          {(Array.isArray(sections) ? sections : []).map((s, i) => (
            <Reveal key={i}>
              <article className="space-y-4">
                <h2
                  className="tracking-tight text-marketing-ink"
                  style={{
                    ...serif,
                    fontSize: "clamp(1.15rem, 2.2vw, 1.4rem)",
                    lineHeight: 1.25,
                  }}
                >
                  {s.heading}
                </h2>
                {s.body.map((p, j) => (
                  <p
                    key={j}
                    className="text-[1rem] leading-[1.85] text-marketing-muted"
                  >
                    {p}
                  </p>
                ))}
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}

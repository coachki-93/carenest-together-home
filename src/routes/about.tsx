import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Plus, Users, UserCheck, Ban, EyeOff } from "lucide-react";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { MarketingHeader } from "@/components/carenest/MarketingHeader";
import { MarketingFooter } from "@/components/carenest/MarketingFooter";
import { Reveal } from "@/components/marketing/Reveal";
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
                  Composition={CompRing}
                  title={t("marketing.about.data1Title")}
                  body={t("marketing.about.data1Body")}
                />
              </Reveal>
              <Reveal immediate delayMs={120}>
                <DataCard
                  Icon={UserCheck}
                  Composition={CompTag}
                  title={t("marketing.about.data2Title")}
                  body={t("marketing.about.data2Body")}
                />
              </Reveal>
              <Reveal immediate delayMs={240}>
                <DataCard
                  Icon={Ban}
                  Composition={CompDissolve}
                  title={t("marketing.about.data3Title")}
                  body={t("marketing.about.data3Body")}
                />
              </Reveal>
              <Reveal immediate delayMs={360}>
                <DataCard
                  Icon={EyeOff}
                  Composition={CompEyeOff}
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

      {/* Closing CTA */}
      <section className="px-6 md:px-8 py-20 md:py-24 border-t border-marketing-line">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <Reveal immediate delayMs={0}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
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
  Composition,
  title,
  body,
}: {
  Icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
  Composition: ComponentType;
  title: string;
  body: string;
}) {
  return (
    <div
      className={
        "mk-glass rounded-2xl p-6 h-full transition-all duration-200 " +
        "hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-14px_color-mix(in_oklab,var(--primary)_35%,transparent)] " +
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-none"
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
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
        <div className="shrink-0 hidden sm:block text-marketing-sage" aria-hidden>
          <Composition />
        </div>
      </div>
    </div>
  );
}

/* ────────── Decorative compositions ──────────
   All aria-hidden, currentColor-driven, no numbers/text. */

const COMP_SIZE = 76;

function CompRing() {
  // Ring of muted dots on a circle, three filled dots inside — invite-only boundary.
  const r = 30;
  const cx = COMP_SIZE / 2;
  const cy = COMP_SIZE / 2;
  const outer = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
  return (
    <svg width={COMP_SIZE} height={COMP_SIZE} viewBox={`0 0 ${COMP_SIZE} ${COMP_SIZE}`}>
      {outer.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={2.4}
          fill="currentColor"
          opacity={0.28}
        />
      ))}
      <circle cx={cx - 6} cy={cy} r={3.2} fill="currentColor" />
      <circle cx={cx + 6} cy={cy - 3} r={3.2} fill="currentColor" />
      <circle cx={cx + 2} cy={cy + 7} r={3.2} fill="currentColor" />
    </svg>
  );
}

function CompTag() {
  // Row of dots — one carries a small tag (thin stem + rounded square).
  const y = COMP_SIZE / 2 + 4;
  const dots = [10, 22, 34, 46, 58];
  return (
    <svg width={COMP_SIZE} height={COMP_SIZE} viewBox={`0 0 ${COMP_SIZE} ${COMP_SIZE}`}>
      {dots.map((x, i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={3}
          fill="currentColor"
          opacity={i === 2 ? 1 : 0.3}
        />
      ))}
      {/* tag stem + label attached to the middle dot */}
      <line
        x1={34}
        y1={y - 3}
        x2={34}
        y2={y - 18}
        stroke="currentColor"
        strokeWidth={1}
        opacity={0.65}
      />
      <rect
        x={28}
        y={y - 30}
        width={20}
        height={12}
        rx={3}
        fill="currentColor"
        opacity={0.85}
      />
    </svg>
  );
}

function CompDissolve() {
  // 5x5 dot grid, opacity fades toward the edges (no ads / no selling — nothing leaves).
  const cols = 5;
  const rows = 5;
  const step = 13;
  const start = (COMP_SIZE - (cols - 1) * step) / 2;
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const nodes = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const d = Math.hypot(c - cx, r - cy);
      const op = Math.max(0.06, 1 - d / 3.2);
      nodes.push(
        <circle
          key={`${r}-${c}`}
          cx={start + c * step}
          cy={start + r * step}
          r={2.2}
          fill="currentColor"
          opacity={op}
        />,
      );
    }
  }
  return (
    <svg width={COMP_SIZE} height={COMP_SIZE} viewBox={`0 0 ${COMP_SIZE} ${COMP_SIZE}`}>
      {nodes}
    </svg>
  );
}

function CompEyeOff() {
  // Sparse dot field + a diagonal slash — subtle "not watched" motif.
  const dots = [
    [16, 20],
    [30, 16],
    [46, 22],
    [58, 18],
    [20, 36],
    [38, 40],
    [56, 38],
    [18, 54],
    [34, 58],
    [52, 56],
  ] as const;
  return (
    <svg width={COMP_SIZE} height={COMP_SIZE} viewBox={`0 0 ${COMP_SIZE} ${COMP_SIZE}`}>
      {dots.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={2.2}
          fill="currentColor"
          opacity={0.35}
        />
      ))}
      <line
        x1={12}
        y1={64}
        x2={64}
        y2={12}
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}

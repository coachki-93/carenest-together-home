import { createFileRoute } from "@tanstack/react-router";
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
        "mk-glass rounded-2xl overflow-hidden h-full flex flex-col transition-all duration-200 " +
        "hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-14px_color-mix(in_oklab,var(--primary)_35%,transparent)] " +
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-none"
      }
    >
      <div
        className="relative h-32 md:h-36 text-marketing-sage flex items-center justify-center"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--primary) 8%, transparent) 0%, color-mix(in oklab, var(--primary) 3%, transparent) 100%)",
        }}
        aria-hidden
      >
        <Composition />
      </div>
      <div className="p-6 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center size-9 rounded-full bg-marketing-sage/10 text-marketing-sage shrink-0">
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
    </div>
  );
}

/* ────────── Decorative compositions ──────────
   All aria-hidden via parent, currentColor-driven (text-marketing-sage).
   Three tints from a single hue via opacity: 1.0 (solid), 0.55 (mid),
   0.22 (soft). Regular grids, stacks, rows — no scattered elements. */

const TINT_HI = 1;
const TINT_MID = 0.55;
const TINT_LO = 0.22;

/** Invite-only — rounded-square boundary containing a 3×3 dot grid;
 *  two faded dots sit outside the boundary. */
function CompRing() {
  const W = 200;
  const H = 110;
  // Boundary rect
  const bx = 62;
  const by = 12;
  const bw = 76;
  const bh = 86;
  // 3×3 dot grid centered inside boundary
  const step = 22;
  const dotR = 8;
  const gridCX = bx + bw / 2;
  const gridCY = by + bh / 2;
  const dots: [number, number][] = [];
  for (let r = -1; r <= 1; r++) {
    for (let c = -1; c <= 1; c++) {
      dots.push([gridCX + c * step, gridCY + r * step]);
    }
  }
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-[86%] h-[86%]"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* boundary */}
      <rect
        x={bx}
        y={by}
        width={bw}
        height={bh}
        rx={16}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        opacity={TINT_MID}
      />
      {/* interior grid */}
      {dots.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={dotR}
          fill="currentColor"
          opacity={i === 4 ? TINT_HI : TINT_MID}
        />
      ))}
      {/* outsiders */}
      <circle cx={20} cy={55} r={dotR} fill="currentColor" opacity={TINT_LO} />
      <circle cx={180} cy={55} r={dotR} fill="currentColor" opacity={TINT_LO} />
    </svg>
  );
}

/** Every action has a name — three horizontal rounded bars, each ending in
 *  a solid square "tag"; middle bar's tag is the strongest tone. */
function CompTag() {
  const W = 200;
  const H = 110;
  const rows = [
    { y: 18, opacity: TINT_MID },
    { y: 50, opacity: TINT_HI },
    { y: 82, opacity: TINT_MID },
  ];
  const barX = 20;
  const barW = 118;
  const barH = 12;
  const tagX = barX + barW + 8;
  const tagS = 18;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-[86%] h-[86%]"
      preserveAspectRatio="xMidYMid meet"
    >
      {rows.map((r, i) => (
        <g key={i}>
          <rect
            x={barX}
            y={r.y}
            width={barW}
            height={barH}
            rx={barH / 2}
            fill="currentColor"
            opacity={r.opacity * 0.6}
          />
          <rect
            x={tagX}
            y={r.y - 3}
            width={tagS}
            height={tagS}
            rx={4}
            fill="currentColor"
            opacity={r.opacity}
          />
        </g>
      ))}
    </svg>
  );
}

/** No ads, no selling — 5×4 dot grid whose opacity dissolves toward the
 *  outer bottom-right corner. Regular grid, nothing scattered. */
function CompDissolve() {
  const W = 200;
  const H = 110;
  const cols = 5;
  const rows = 4;
  const stepX = 30;
  const stepY = 26;
  const gridW = (cols - 1) * stepX;
  const gridH = (rows - 1) * stepY;
  const startX = (W - gridW) / 2;
  const startY = (H - gridH) / 2;
  const dotR = 8;
  const nodes: ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // distance from top-left corner (opposite of dissolve target)
      const d = Math.hypot(c / (cols - 1), r / (rows - 1)); // 0..sqrt(2)
      const t = d / Math.SQRT2; // 0 top-left → 1 bottom-right
      const op = TINT_HI * (1 - t) + TINT_LO * t * 0.35;
      nodes.push(
        <circle
          key={`${r}-${c}`}
          cx={startX + c * stepX}
          cy={startY + r * stepY}
          r={dotR}
          fill="currentColor"
          opacity={Math.max(0.08, op)}
        />,
      );
    }
  }
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-[86%] h-[86%]"
      preserveAspectRatio="xMidYMid meet"
    >
      {nodes}
    </svg>
  );
}

/** No trackers — a triangle dot-grid whose top rows fade to transparent.
 *  Nothing looking down. Rows widen toward the base. */
function CompEyeOff() {
  const W = 200;
  const H = 110;
  const rows = 5; // top row 1 dot, bottom row 5 dots
  const stepX = 24;
  const stepY = 20;
  const gridH = (rows - 1) * stepY;
  const startY = (H - gridH) / 2;
  const dotR = 8;
  const nodes: ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    const count = r + 1;
    const rowW = (count - 1) * stepX;
    const rowStartX = (W - rowW) / 2;
    // opacity: top row very faded, base row full
    const tier = r / (rows - 1); // 0..1
    const op = TINT_LO * (1 - tier) + TINT_HI * tier;
    for (let c = 0; c < count; c++) {
      nodes.push(
        <circle
          key={`${r}-${c}`}
          cx={rowStartX + c * stepX}
          cy={startY + r * stepY}
          r={dotR}
          fill="currentColor"
          opacity={op < 0.12 ? 0.12 : op}
        />,
      );
    }
  }
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-[86%] h-[86%]"
      preserveAspectRatio="xMidYMid meet"
    >
      {nodes}
    </svg>
  );
}


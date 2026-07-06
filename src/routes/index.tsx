import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CalendarCheck,
  Activity,
  Pill,
  Wind,
  Bell,
  Users,
  ShieldCheck,
  Languages,
  Tablet,
  Home,
  Wrench,
  Check,
  Plus,
  MessageSquareText,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MarketingHeader } from "@/components/carenest/MarketingHeader";
import { MarketingFooter } from "@/components/carenest/MarketingFooter";

const SITE = "https://carenest-together-home.lovable.app";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CareNest — A calm home base for your child's care team" },
      {
        name: "description",
        content:
          "CareNest is the shared home base for families of children with special needs. Meds, vitals, oxygen, schedules and handovers — visible to every caregiver you trust.",
      },
      { property: "og:title", content: "CareNest — Care, together" },
      {
        property: "og:description",
        content:
          "Everything about your child's care — out of your head, into one calm place. Bilingual, tablet-friendly, built with families.",
      },
      { property: "og:url", content: SITE + "/" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: SITE + "/" }],
  }),
  component: Landing,
});

const serif = { fontFamily: "var(--font-display)", fontWeight: 800, letterSpacing: "-0.02em" } as const;
const sansMk = { fontFamily: "var(--font-sans-marketing)" } as const;

function Landing() {
  const { t } = useTranslation();
  return (
    <main
      className="min-h-screen bg-marketing-bg text-marketing-ink antialiased"
      style={sansMk}
    >
      <MarketingHeader />
      <Hero />

      {/* ── 2. The problem, named kindly ── */}
      <section className="px-6 md:px-8 py-20 md:py-28">
        <Reveal className="max-w-2xl mx-auto text-center space-y-6">
          <Kicker>{t("marketing.problem.kicker")}</Kicker>
          <h2
            className="tracking-tight text-marketing-ink"
            style={{ ...serif, fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", lineHeight: 1.1 }}
          >
            {t("marketing.problem.title")}
          </h2>
          <p className="text-marketing-muted leading-[1.75] text-[1.05rem]">
            {t("marketing.problem.body1")}
          </p>
          <p className="text-marketing-muted leading-[1.75] text-[1.05rem]">
            {t("marketing.problem.body2")}
          </p>
        </Reveal>
      </section>

      {/* ── 2b. For whom (supplements the problem) ── */}
      <section className="px-6 md:px-8 pb-8 md:pb-12">
        <Reveal className="max-w-3xl mx-auto text-center space-y-5">
          <Kicker>{t("marketing.forWhom.kicker")}</Kicker>
          <h2
            className="tracking-tight text-marketing-ink"
            style={{ ...serif, fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", lineHeight: 1.1 }}
          >
            {t("marketing.forWhom.title")}
          </h2>
          <p className="text-marketing-muted leading-[1.75] text-[1.05rem]">
            {t("marketing.forWhom.body")}
          </p>
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            <span className="inline-flex items-center rounded-full border border-marketing-line bg-marketing-surface px-4 py-1.5 text-sm text-marketing-ink">
              {t("marketing.forWhom.chip1")}
            </span>
            <span className="inline-flex items-center rounded-full border border-marketing-line bg-marketing-surface px-4 py-1.5 text-sm text-marketing-ink">
              {t("marketing.forWhom.chip2")}
            </span>
            <span className="inline-flex items-center rounded-full border border-marketing-line bg-marketing-surface px-4 py-1.5 text-sm text-marketing-ink">
              {t("marketing.forWhom.chip3")}
            </span>
          </div>
        </Reveal>
        <Reveal className="max-w-2xl mx-auto mt-10">
          <div className="rounded-2xl border border-marketing-line bg-marketing-surface p-6 md:p-7 text-center">
            <h3
              className="text-marketing-ink mb-2"
              style={{ ...serif, fontSize: "clamp(1.15rem, 1.6vw, 1.35rem)" }}
            >
              {t("marketing.forWhom.caregiverTitle")}
            </h3>
            <p className="text-marketing-muted leading-relaxed text-[0.98rem]">
              {t("marketing.forWhom.caregiverBody")}
            </p>
          </div>
        </Reveal>
      </section>



      {/* ── 3. The bridge line ── */}
      <section className="px-6 md:px-8 py-24 md:py-36">
        <Reveal className="max-w-4xl mx-auto text-center">
          <h2
            className="tracking-tight text-marketing-ink italic"
            style={{ ...serif, fontSize: "clamp(2rem, 5vw, 3.75rem)", lineHeight: 1.1 }}
          >
            {t("marketing.bridge.line")}
          </h2>
        </Reveal>
      </section>

      {/* ── 4. A day with CareNest — timeline ── */}
      <DaySection />

      {/* ── 5. Outcomes ── */}
      <section className="px-6 md:px-8 py-20 md:py-28">
        <div className="max-w-6xl mx-auto">
          <Reveal className="max-w-2xl mx-auto text-center space-y-4 mb-14">
            <Kicker>{t("marketing.outcomes.kicker")}</Kicker>
            <h2
              className="tracking-tight text-marketing-ink"
              style={{ ...serif, fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", lineHeight: 1.1 }}
            >
              {t("marketing.outcomes.title")}
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6 md:gap-7">
            <OutcomeCard
              icon={<Home className="size-5" />}
              title={t("marketing.outcomes.c1Title")}
              body={t("marketing.outcomes.c1Body")}
              chips={[t("marketing.outcomes.c1Chip1"), t("marketing.outcomes.c1Chip2"), t("marketing.outcomes.c1Chip3")]}
            />
            <OutcomeCard
              icon={<Users className="size-5" />}
              title={t("marketing.outcomes.c2Title")}
              body={t("marketing.outcomes.c2Body")}
              chips={[t("marketing.outcomes.c2Chip1"), t("marketing.outcomes.c2Chip2"), t("marketing.outcomes.c2Chip3")]}
            />
            <OutcomeCard
              icon={<Wrench className="size-5" />}
              title={t("marketing.outcomes.c3Title")}
              body={t("marketing.outcomes.c3Body")}
              chips={[t("marketing.outcomes.c3Chip1"), t("marketing.outcomes.c3Chip2"), t("marketing.outcomes.c3Chip3")]}
            />
            <OutcomeCard
              icon={<Bell className="size-5" />}
              title={t("marketing.outcomes.c4Title")}
              body={t("marketing.outcomes.c4Body")}
              chips={[t("marketing.outcomes.c4Chip1"), t("marketing.outcomes.c4Chip2")]}
            />
          </div>
        </div>
      </section>

      {/* ── 6. Essentials vs complex care ── */}
      <section className="px-6 md:px-8 py-20 md:py-28 bg-marketing-surface border-y border-marketing-line">
        <div className="max-w-6xl mx-auto">
          <Reveal className="max-w-2xl mx-auto text-center space-y-4 mb-14">
            <Kicker>{t("marketing.inside.kicker")}</Kicker>
            <h2
              className="tracking-tight text-marketing-ink"
              style={{ ...serif, fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", lineHeight: 1.1 }}
            >
              {t("marketing.inside.title")}
            </h2>
            <p className="text-marketing-muted text-[1.05rem] leading-[1.7]">
              {t("marketing.inside.sub")}
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            <ComparisonCard
              title={t("marketing.essentials.title")}
              subtitle={t("marketing.essentials.subtitle")}
              items={[1, 2, 3, 4, 5, 6, 7, 8].map((n) => t(`marketing.essentials.i${n}`))}
            />
            <ComparisonCard
              accent
              title={t("marketing.complex.title")}
              subtitle={t("marketing.complex.subtitle")}
              items={[1, 2, 3, 4, 5, 6].map((n) => t(`marketing.complex.i${n}`))}
            />
          </div>

          <div className="mt-12 flex justify-center">
            <Link
              to="/features"
              className="inline-flex items-center gap-2 text-sm font-medium text-marketing-ink border-b border-marketing-ink/30 hover:border-marketing-sage hover:text-marketing-sage transition-colors py-1"
            >
              {t("marketing.inside.seeAll")}
            </Link>
          </div>
        </div>
      </section>

      {/* ── 7. Every shift, accounted for — deep violet card ── */}
      <section className="px-6 md:px-8 py-20 md:py-28">
        <Reveal className="max-w-6xl mx-auto">
          <div
            className="rounded-3xl p-8 md:p-14 relative overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in oklab, var(--primary) 92%, black) 0%, color-mix(in oklab, var(--primary) 78%, transparent) 100%)",
              color: "var(--primary-foreground)",
            }}
          >
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none opacity-40"
              style={{
                background:
                  "radial-gradient(30rem 20rem at 90% 10%, color-mix(in oklab, white 20%, transparent), transparent 70%)",
              }}
            />
            <div className="relative grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-14 items-center">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] mb-5 opacity-80">
                  {t("marketing.team.kicker")}
                </p>
                <h2
                  className="tracking-tight mb-6"
                  style={{ ...serif, fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", lineHeight: 1.1 }}
                >
                  {t("marketing.team.title")}
                </h2>
                <p className="text-[1rem] leading-[1.75] opacity-90 max-w-xl mb-8">
                  {t("marketing.team.body")}
                </p>
                <ul className="space-y-4">
                  {[1, 2, 3].map((n) => (
                    <li key={n} className="flex gap-3 items-start">
                      <span className="mt-1 size-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                        <Check className="size-3" />
                      </span>
                      <div>
                        <p className="font-semibold text-[0.95rem]">
                          {t(`marketing.team.b${n}Title`)}
                        </p>
                        <p className="text-sm opacity-85 leading-relaxed">
                          {t(`marketing.team.b${n}Body`)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mock screenshot: "Checked by Rusan · Kommun" */}
              <div className="relative">
                <div className="rounded-2xl bg-marketing-bg text-marketing-ink shadow-2xl border border-marketing-line p-5 space-y-4 rotate-[-1deg]">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-marketing-muted font-semibold">
                      {t("marketing.team.mockLabel")}
                    </p>
                    <span className="text-[10px] rounded-full bg-marketing-sage-soft border border-marketing-sage-line text-marketing-sage px-2 py-0.5 font-semibold">
                      ✓
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-full flex items-center justify-center font-bold text-marketing-bg" style={{ background: "var(--primary)" }}>
                      R
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-marketing-muted uppercase tracking-wider">
                        {t("marketing.team.mockCheckedBy")}
                      </p>
                      <p className="text-lg italic text-marketing-ink" style={serif}>
                        {t("marketing.team.mockName")} · {t("marketing.team.mockRole")}
                      </p>
                    </div>
                  </div>
                  <div className="h-px bg-marketing-line" />
                  <div className="flex items-center gap-2 text-sm text-marketing-muted">
                    <Check className="size-4 text-marketing-sage" />
                    <span>{t("marketing.team.mockAnswer")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── 8. Trust strip ── */}
      <section className="px-6 md:px-8 py-16 md:py-20 border-y border-marketing-line bg-marketing-surface">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
          {[1, 2, 3, 4].map((n) => (
            <Reveal key={n} delayMs={n * 60}>
              <p
                className="italic text-marketing-ink leading-[1.15] tracking-tight"
                style={{ ...serif, fontSize: "clamp(1.25rem, 2vw, 1.75rem)" }}
              >
                {t(`marketing.trust.s${n}Value`)}
              </p>
              <p className="mt-2 text-sm text-marketing-muted leading-snug">
                {t(`marketing.trust.s${n}Label`)}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── 9. Tablet / bilingual band ── */}
      <section className="px-6 md:px-8 py-20 md:py-28">
        <Reveal className="max-w-3xl mx-auto text-center space-y-6">
          <Kicker>{t("marketing.tablet.kicker")}</Kicker>
          <h2
            className="tracking-tight text-marketing-ink"
            style={{ ...serif, fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", lineHeight: 1.1 }}
          >
            {t("marketing.tablet.title")}
          </h2>
          <p className="text-marketing-muted text-[1.05rem] leading-[1.75]">
            {t("marketing.tablet.body")}
          </p>
          <p className="text-marketing-muted text-[1.05rem] leading-[1.75]">
            {t("marketing.tablet.bodyExtra")}
          </p>
          <div className="flex flex-wrap gap-2 justify-center pt-4">
            <PillTag icon={<Tablet className="size-3.5" />}>{t("marketing.tablet.t1")}</PillTag>
            <PillTag icon={<Languages className="size-3.5" />}>{t("marketing.tablet.t2")}</PillTag>
            <PillTag icon={<ShieldCheck className="size-3.5" />}>{t("marketing.tablet.t3")}</PillTag>
          </div>
        </Reveal>
      </section>

      {/* ── 10. What CareNest is not ── */}
      <section className="px-6 md:px-8 py-16 md:py-20 border-y border-marketing-line">
        <Reveal className="max-w-2xl mx-auto text-center space-y-5">
          <Kicker>{t("marketing.not.kicker")}</Kicker>
          <p className="text-marketing-muted text-[1.05rem] leading-[1.75]">
            {t("marketing.not.body")}
          </p>
        </Reveal>
      </section>

      {/* ── 11. Pricing ── */}
      <section id="pricing" className="px-6 md:px-8 py-20 md:py-28 bg-marketing-surface border-b border-marketing-line">
        <div className="max-w-4xl mx-auto">
          <Reveal className="max-w-2xl mx-auto text-center space-y-4 mb-14">
            <Kicker>{t("marketing.pricing.kicker")}</Kicker>
            <h2
              className="tracking-tight text-marketing-ink"
              style={{ ...serif, fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", lineHeight: 1.1 }}
            >
              {t("marketing.pricing.title")}
            </h2>
            <p className="text-marketing-muted text-[1.05rem] leading-[1.7]">
              {t("marketing.pricing.sub")}
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6">
            <PriceCard
              label={t("marketing.pricing.monthlyLabel")}
              price={t("marketing.pricing.monthlyPrice")}
              sub={t("marketing.pricing.monthlySub")}
              featuresLabel={t("marketing.pricing.featuresLabel")}
              cta={t("marketing.pricing.monthlyCta")}
            />
            <PriceCard
              accent
              badge={t("marketing.pricing.annualBadge")}
              label={t("marketing.pricing.annualLabel")}
              price={t("marketing.pricing.annualPrice")}
              sub={t("marketing.pricing.annualSub")}
              featuresLabel={t("marketing.pricing.featuresLabel")}
              cta={t("marketing.pricing.annualCta")}
            />
          </div>
        </div>
      </section>

      {/* ── 12. FAQ ── */}
      <section id="faq" className="px-6 md:px-8 py-20 md:py-28">
        <div className="max-w-3xl mx-auto">
          <Reveal className="text-center mb-12 space-y-3">
            <Kicker>{t("marketing.faq.kicker")}</Kicker>
            <h2
              className="tracking-tight text-marketing-ink"
              style={{ ...serif, fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", lineHeight: 1.1 }}
            >
              {t("marketing.faq.title")}
            </h2>
          </Reveal>
          <Accordion
            type="single"
            collapsible
            defaultValue="q1"
            className="divide-y divide-marketing-line border-y border-marketing-line"
          >
            {["q1", "q2", "q3", "q4", "q5", "q6", "q7"].map((k) => (
              <AccordionItem key={k} value={k} className="border-0">
                <AccordionTrigger
                  className="text-left text-lg py-5 hover:no-underline [&[data-state=open]>svg]:hidden text-marketing-ink"
                  style={serif}
                >
                  <span className="flex-1 pr-4">{t(`marketing.faq.${k}Q`)}</span>
                  <span className="text-marketing-sage shrink-0">
                    <Plus className="size-5 transition-transform [[data-state=open]_&]:rotate-45" />
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-marketing-muted leading-[1.75] text-[1rem]">
                  {t(`marketing.faq.${k}A`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── 13. Closing CTA ── */}
      <section className="px-6 md:px-8 py-24 md:py-32 bg-marketing-surface border-t border-marketing-line">
        <Reveal className="max-w-3xl mx-auto text-center space-y-7">
          <h2
            className="tracking-tight text-marketing-ink"
            style={{ ...serif, fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1.05 }}
          >
            {t("marketing.cta.title")}
          </h2>
          <p className="text-marketing-muted text-[1.05rem] max-w-xl mx-auto leading-[1.75]">
            {t("marketing.cta.body")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              to="/auth/signup"
              className="inline-flex items-center justify-center rounded-full bg-marketing-sage text-marketing-bg font-semibold px-7 py-3.5 shadow-sm hover:brightness-[1.08] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-marketing-sage"
            >
              {t("marketing.hero.ctaCreate")}
            </Link>
            <Link
              to="/invite"
              className="inline-flex items-center justify-center rounded-full bg-marketing-bg border border-marketing-line text-marketing-ink font-semibold px-7 py-3.5 hover:border-marketing-sage hover:text-marketing-sage transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketing-sage"
            >
              {t("marketing.hero.ctaInvite")}
            </Link>
          </div>
        </Reveal>
      </section>

      <MarketingFooter />
    </main>
  );
}

/* ───────────────── building blocks ───────────────── */

function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-marketing-sage">
      <Sparkles className="size-3" />
      <span>{children}</span>
    </p>
  );
}

function PillTag({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-marketing-bg border border-marketing-line px-3.5 py-1.5 text-xs font-medium text-marketing-ink">
      <span className="text-marketing-sage">{icon}</span>
      {children}
    </span>
  );
}

function OutcomeCard({
  icon,
  title,
  body,
  chips,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  chips: string[];
}) {
  return (
    <Reveal className="group rounded-3xl border border-marketing-line bg-marketing-bg p-7 md:p-8 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:border-marketing-sage-line">
      <div className="size-11 rounded-2xl bg-marketing-sage-soft border border-marketing-sage-line text-marketing-sage flex items-center justify-center mb-5">
        {icon}
      </div>
      <h3
        className="italic text-marketing-ink leading-[1.15] mb-3"
        style={{ ...serif, fontSize: "clamp(1.25rem, 2.2vw, 1.6rem)" }}
      >
        {title}
      </h3>
      <p className="text-marketing-muted leading-[1.7] mb-5">{body}</p>
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <span
            key={c}
            className="rounded-full bg-marketing-surface border border-marketing-line px-3 py-1 text-xs text-marketing-muted"
          >
            {c}
          </span>
        ))}
      </div>
    </Reveal>
  );
}

function ComparisonCard({
  title,
  subtitle,
  items,
  accent,
}: {
  title: string;
  subtitle: string;
  items: string[];
  accent?: boolean;
}) {
  return (
    <Reveal
      className={`rounded-3xl bg-marketing-bg p-7 md:p-9 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${
        accent ? "border-2 border-marketing-sage" : "border border-marketing-line"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.2em] text-marketing-muted mb-2">{subtitle}</p>
      <h3 className="italic text-marketing-ink mb-6" style={{ ...serif, fontSize: "clamp(1.35rem, 2.4vw, 1.75rem)" }}>
        {title}
      </h3>
      <ul className="space-y-3.5">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-3 text-[0.95rem] text-marketing-ink leading-[1.6]">
            <Check className={`size-4 shrink-0 mt-1 ${accent ? "text-marketing-sage" : "text-marketing-sage"}`} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

function PriceCard({
  label,
  price,
  sub,
  featuresLabel,
  cta,
  badge,
  accent,
}: {
  label: string;
  price: string;
  sub: string;
  featuresLabel: string;
  cta: string;
  badge?: string;
  accent?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={`relative rounded-3xl bg-marketing-bg p-7 md:p-8 flex flex-col items-start shadow-sm ${
        accent ? "border-2 border-marketing-sage" : "border border-marketing-line"
      }`}
    >
      {badge && (
        <span className="absolute -top-3 left-6 inline-flex items-center rounded-full bg-marketing-sage text-marketing-bg px-3 py-1 text-xs font-semibold tracking-wide">
          {badge}
        </span>
      )}
      <p className="text-sm font-medium text-marketing-muted mb-4">{label}</p>
      <p className="text-4xl md:text-5xl italic text-marketing-ink mb-2" style={serif}>
        {price}
      </p>
      <p className="text-sm text-marketing-muted mb-6">{sub}</p>
      <p className="text-xs font-semibold uppercase tracking-wider text-marketing-muted mb-3">
        {featuresLabel}
      </p>
      <ul className="space-y-2.5 mb-8">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <li key={n} className="flex items-start gap-2.5 text-sm text-marketing-ink">
            <Check className="size-4 text-marketing-sage shrink-0 mt-0.5" />
            <span>{t(`marketing.pricing.f${n}`)}</span>
          </li>
        ))}
      </ul>
      <Link
        to="/auth/signup"
        className={`mt-auto w-full text-center px-6 py-3.5 rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-marketing-sage ${
          accent
            ? "bg-marketing-sage text-marketing-bg hover:brightness-[1.08] shadow-sm"
            : "bg-marketing-bg border border-marketing-line text-marketing-ink hover:border-marketing-sage hover:text-marketing-sage"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}

/* Day timeline (Section 4) */
function DaySection() {
  const { t } = useTranslation();
  const steps = [1, 2, 3, 4].map((n) => ({
    time: t(`marketing.day.t${n}Time`),
    title: t(`marketing.day.t${n}Title`),
    body: t(`marketing.day.t${n}Body`),
  }));
  return (
    <section className="px-6 md:px-8 py-20 md:py-28 bg-marketing-surface border-y border-marketing-line">
      <div className="max-w-5xl mx-auto">
        <Reveal className="max-w-2xl mx-auto text-center space-y-4 mb-16">
          <Kicker>{t("marketing.day.kicker")}</Kicker>
          <h2
            className="tracking-tight text-marketing-ink"
            style={{ ...serif, fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", lineHeight: 1.1 }}
          >
            {t("marketing.day.title")}
          </h2>
          <p className="text-marketing-muted text-[1.05rem]">{t("marketing.day.sub")}</p>
        </Reveal>

        <ol className="relative md:pl-8">
          {/* Vertical rail (desktop) */}
          <span
            aria-hidden
            className="hidden md:block absolute left-2 top-2 bottom-2 w-px"
            style={{ background: "color-mix(in oklab, var(--primary) 35%, transparent)" }}
          />
          {steps.map((s, i) => (
            <li key={i} className="relative mb-10 last:mb-0">
              <Reveal delayMs={i * 80}>
                <div className="md:grid md:grid-cols-[9rem_1fr] md:gap-8 items-start">
                  <div className="flex items-center gap-3 mb-3 md:mb-0">
                    <span
                      aria-hidden
                      className="hidden md:block absolute left-0 -translate-x-[3px] size-3 rounded-full ring-4 ring-marketing-surface"
                      style={{ top: "0.65rem", background: "var(--primary)" }}
                    />
                    <span
                      className="rounded-full bg-marketing-bg border border-marketing-sage-line text-marketing-sage px-3 py-1 text-xs font-semibold tabular-nums"
                    >
                      {s.time}
                    </span>
                  </div>
                  <div className="rounded-2xl bg-marketing-bg border border-marketing-line p-6 md:p-7 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all">
                    <h3
                      className="italic text-marketing-ink mb-2 leading-tight"
                      style={{ ...serif, fontSize: "clamp(1.15rem, 2vw, 1.5rem)" }}
                    >
                      {s.title}
                    </h3>
                    <p className="text-marketing-muted leading-[1.75] text-[0.98rem]">{s.body}</p>
                  </div>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* Reveal: fade-up on IntersectionObserver (respects prefers-reduced-motion) */
function Reveal({
  children,
  className = "",
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    if (mq.matches) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible || reduced ? "translateY(0)" : "translateY(14px)",
        transition: reduced ? "none" : `opacity 0.5s ease-out ${delayMs}ms, transform 0.5s ease-out ${delayMs}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

/* ─────────── Hero ─────────── */
function Hero() {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const y = Math.max(-200, Math.min(200, -rect.top * 0.06));
        setOffset(y);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section
      ref={ref}
      className="relative px-6 md:px-8 pt-10 md:pt-16 pb-20 md:pb-32 overflow-hidden"
    >
      {/* Aurora */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60rem 40rem at 15% 20%, color-mix(in oklab, var(--primary) 10%, transparent), transparent 70%), radial-gradient(45rem 35rem at 90% 80%, color-mix(in oklab, oklch(0.85 0.09 55) 12%, transparent), transparent 70%)",
        }}
      />

      <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_1.1fr] gap-14 lg:gap-14 items-center">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-marketing-sage-soft border border-marketing-sage-line text-[11px] font-medium uppercase tracking-[0.18em] text-marketing-sage mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-marketing-sage" />
            {t("marketing.hero.kicker")}
          </span>

          <h1
            className="tracking-tight text-primary mb-6 max-w-[16ch]"
            style={{
              ...serif,
              fontSize: "clamp(2.5rem, 5.5vw, 4.25rem)",
              lineHeight: 1.05,
            }}
          >
            {t("marketing.hero.headline")}
          </h1>

          <p
            className="text-marketing-muted mb-10 max-w-lg"
            style={{ fontSize: "clamp(1rem, 1.15vw, 1.125rem)", lineHeight: 1.7 }}
          >
            {t("marketing.hero.subline")}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/auth/signup"
              className="inline-flex items-center justify-center rounded-full bg-marketing-sage text-marketing-bg font-semibold px-7 py-3.5 text-base shadow-sm hover:brightness-[1.08] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-marketing-sage"
            >
              {t("marketing.hero.ctaCreate")}
            </Link>
            <Link
              to="/invite"
              className="inline-flex items-center justify-center rounded-full bg-marketing-bg border border-marketing-line text-marketing-ink font-semibold px-7 py-3.5 text-base hover:border-marketing-sage hover:text-marketing-sage transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketing-sage"
            >
              {t("marketing.hero.ctaInvite")}
            </Link>
          </div>
        </div>

        <div className="relative w-full">
          <div
            className="relative mx-auto max-w-[560px]"
            style={{
              transform: `rotate(-1.5deg) translateY(${offset}px)`,
              transition: "transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)",
            }}
          >
            <div className="relative rounded-[2.25rem] bg-marketing-ink p-3 md:p-4 shadow-[0_40px_80px_-30px_rgba(45,41,38,0.35)] ring-1 ring-black/5">
              <span className="absolute top-2 left-1/2 -translate-x-1/2 size-1.5 rounded-full bg-marketing-line/40" />
              <div className="bg-marketing-surface rounded-[1.5rem] overflow-hidden">
                <div className="h-11 border-b border-marketing-line px-5 flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-marketing-line" />
                    <span className="w-2 h-2 rounded-full bg-marketing-line" />
                    <span className="w-2 h-2 rounded-full bg-marketing-line" />
                  </div>
                  <div className="text-[11px] italic text-marketing-muted" style={serif}>
                    {t("marketing.hero.mockShift")}
                  </div>
                  <div className="size-5 rounded-full bg-marketing-sage-soft border border-marketing-sage-line" />
                </div>
                <div className="p-4 md:p-5 space-y-2.5">
                  <PreviewTask icon={<Pill className="size-4" />} title={t("marketing.inside.f3Title")} meta="08:00" done />
                  <PreviewTask icon={<Wind className="size-4" />} title={t("marketing.inside.f4Title")} meta="68 min" />
                  <PreviewTask icon={<Activity className="size-4" />} title={t("marketing.inside.f2Title")} meta="now" highlight />
                  <PreviewTask icon={<CalendarCheck className="size-4" />} title={t("marketing.inside.f5Title")} meta="15:00" />
                </div>
              </div>
            </div>

            <div
              className="hidden md:block absolute -left-14 top-10 w-[220px] rounded-2xl bg-marketing-bg border border-marketing-line shadow-lg p-4"
              style={{
                transform: `rotate(1.5deg) translateY(${offset * 0.6}px)`,
                transition: "transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="size-8 rounded-lg bg-marketing-sage-soft text-marketing-sage flex items-center justify-center">
                  <Wind className="size-4" />
                </span>
                <p className="text-[10px] uppercase tracking-[0.18em] text-marketing-muted font-semibold">
                  {t("marketing.hero.satOxygenLabel")}
                </p>
              </div>
              <p className="text-xl italic text-marketing-ink leading-tight" style={serif}>
                {t("marketing.hero.satOxygenValue")}
              </p>
              <div className="mt-2 h-1.5 rounded-full bg-marketing-faint overflow-hidden">
                <div className="h-full w-[67%] rounded-full bg-marketing-sage" />
              </div>
              <p className="mt-1.5 text-[11px] text-marketing-muted">
                {t("marketing.hero.satOxygenSub")}
              </p>
            </div>

            <div
              className="hidden md:block absolute -right-10 -bottom-6 w-[260px] rounded-2xl bg-marketing-bg border border-marketing-line shadow-lg p-4"
              style={{
                transform: `rotate(2deg) translateY(${offset * 0.4}px)`,
                transition: "transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="size-8 rounded-lg bg-marketing-sage text-marketing-bg flex items-center justify-center">
                  <MessageSquareText className="size-4" />
                </span>
                <p className="text-[10px] uppercase tracking-[0.18em] text-marketing-muted font-semibold">
                  {t("marketing.hero.satHandoverLabel")}
                </p>
              </div>
              <p className="text-sm text-marketing-ink leading-snug font-medium">
                {t("marketing.hero.satHandoverTitle")}
              </p>
              <p className="mt-1 text-xs text-marketing-sage font-semibold">
                {t("marketing.hero.satHandoverCta")} →
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PreviewTask({
  icon,
  title,
  meta,
  done,
  highlight,
}: {
  icon: ReactNode;
  title: string;
  meta: string;
  done?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
        highlight
          ? "border-marketing-sage-line bg-marketing-sage-soft/60"
          : "border-marketing-line bg-marketing-bg"
      }`}
    >
      <span
        className={`size-8 rounded-lg flex items-center justify-center ${
          done
            ? "bg-marketing-sage text-marketing-bg"
            : "bg-marketing-faint text-marketing-muted"
        }`}
      >
        {done ? <Check className="size-4" /> : icon}
      </span>
      <span className={`flex-1 text-sm font-medium ${done ? "text-marketing-muted line-through" : "text-marketing-ink"}`}>
        {title}
      </span>
      <span className="text-xs text-marketing-muted tabular-nums">{meta}</span>
    </div>
  );
}

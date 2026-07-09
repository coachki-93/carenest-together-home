import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Reveal } from "@/components/marketing/Reveal";
import { DayTimeline } from "@/components/marketing/DayTimeline";
import { OutcomeDeck } from "@/components/marketing/OutcomeDeck";
import { VitalsBand } from "@/components/marketing/VitalsBand";
import { HeroHeadline } from "@/components/marketing/HeroHeadline";
import { Kicker } from "@/components/marketing/Kicker";
import { usePlatform } from "@/lib/marketing/use-platform";
import { useFlashlight } from "@/lib/marketing/use-flashlight";
import {
  Pill,
  Wind,
  Bell,
  ShieldCheck,
  Languages,
  Tablet,
  Check,
  Plus,
  MessageSquareText,
  ListChecks,
  Calendar,
  BookOpen,
  Siren,
  Activity,
  Droplet,
  Wrench,
  RefreshCw,
  Users,
  Heart,
  Mail,
  type LucideIcon,
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
import { AppleGlyph, AndroidGlyph } from "@/components/carenest/BrandGlyphs";

const SITE = "https://carenest-together-home.lovable.app";
const OG_IMAGE = SITE + "/og-image.jpg";

import { resolveHeadLanguage, OG_LOCALE } from "@/lib/i18n/head";

const LANDING_META = {
  en: {
    title: "CareNest — A calm home base for your child's care team",
    description:
      "CareNest is the shared home base for families of children with special needs. Meds, vitals, oxygen, schedules and handovers — visible to every caregiver you trust.",
    ogTitle: "CareNest — Care, together",
    ogDescription:
      "Everything about your child's care — out of your head, into one calm place. Bilingual, tablet-friendly, built with families.",
  },
  sv: {
    title: "CareNest — En lugn hemmabas för ditt barns vårdteam",
    description:
      "CareNest är den gemensamma hemmabasen för familjer med barn med särskilda behov. Mediciner, vitala värden, syrgas, scheman och överlämningar — synligt för varje assistent du litar på.",
    ogTitle: "CareNest — Omsorg, tillsammans",
    ogDescription:
      "Allt om ditt barns vård — ut ur ditt huvud, in på ett lugnt ställe. Tvåspråkigt, surfplatte-vänligt, byggt med familjer.",
  },
} as const;

export const Route = createFileRoute("/")({
  head: () => {
    const lang = resolveHeadLanguage();
    const m = LANDING_META[lang];
    return {
      meta: [
        { title: m.title },
        { name: "description", content: m.description },
        { property: "og:title", content: m.ogTitle },
        { property: "og:description", content: m.ogDescription },
        { property: "og:url", content: SITE + "/" },
        { property: "og:type", content: "website" },
        { property: "og:locale", content: OG_LOCALE[lang] },
        { property: "og:image", content: OG_IMAGE },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: OG_IMAGE },
      ],
      links: [{ rel: "canonical", href: SITE + "/" }],
    };
  },
  component: Landing,
});


const display = { fontFamily: "var(--font-display)", fontWeight: 600 } as const;
const sansMk = { fontFamily: "var(--font-sans-marketing)" } as const;

function Landing() {
  const { t } = useTranslation();
  return (
    <main
      className="min-h-screen bg-marketing-bg text-marketing-ink antialiased pt-20 md:pt-24"
      style={sansMk}
    >
      <MarketingHeader />
      <Hero />

      {/* ── 2. The problem — two-card old/new comparison ── */}
      <section className="relative px-6 md:px-8 py-20 md:py-28 overflow-hidden">
        {/* Ambient section orb behind both cards */}
        <div
          aria-hidden
          className="mk-section-orb"
          style={{ width: "44rem", height: "44rem", top: "10%", left: "50%", transform: "translateX(-50%)" }}
        />
        <div className="relative max-w-6xl mx-auto">
          <Reveal className="max-w-2xl mx-auto text-center space-y-4 mb-12">
            <Kicker>{t("marketing.problem.kicker")}</Kicker>
            <h2 className="text-display-md text-marketing-ink" style={display}>
              {t("marketing.problem.title")}
            </h2>
            <p className="text-marketing-muted text-base md:text-lg leading-[1.7]">
              {t("marketing.problem.sub")}
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-stretch">
            <ProblemOldCard />
            <ProblemNewCard />
          </div>
        </div>
      </section>

      {/* ── 4. A day with CareNest — pinned timeline ── */}
      <DayTimeline />

      {/* ── 5. Outcomes — fanned deck ── */}
      <OutcomeDeck />

      {/* ── 5b. Vitals — deep-violet band ── */}
      <VitalsBand />




      {/* ── 6. Built for rotating teams (light) ── */}
      <section className="px-6 md:px-8 py-20 md:py-28 bg-marketing-surface border-y border-marketing-line">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-center">
              <div>
                <Kicker>{t("marketing.teams.kicker")}</Kicker>
                <h2 className="text-display-md text-marketing-ink mt-4 mb-6" style={display}>
                  {t("marketing.teams.title")}
                </h2>
                <div className="space-y-4 mb-6">
                  <p
                    className="mk-slide-in text-marketing-muted text-base md:text-lg leading-[1.7]"
                    style={{ ["--mk-delay" as string]: "0ms" }}
                  >
                    {t("marketing.teams.body1")}
                  </p>
                  <p
                    className="mk-slide-in text-marketing-muted text-base md:text-lg leading-[1.7]"
                    style={{ ["--mk-delay" as string]: "140ms" }}
                  >
                    {t("marketing.teams.body2")}
                  </p>
                  <p
                    className="mk-slide-in text-marketing-muted text-base md:text-lg leading-[1.7]"
                    style={{ ["--mk-delay" as string]: "280ms" }}
                  >
                    {t("marketing.teams.body3")}
                  </p>
                </div>
                <p
                  className="mk-slide-in text-marketing-ink/80 text-base md:text-lg italic leading-[1.7]"
                  style={{ ["--mk-delay" as string]: "450ms" }}
                >
                  {t("marketing.teams.closing")}
                </p>
              </div>

              {/* "First shift" sequence — invite → identity → first task */}
              <div className="relative">
                <div className="rounded-2xl bg-marketing-bg text-marketing-ink shadow-2xl border border-marketing-line p-5 rotate-[-1deg]">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-marketing-muted font-semibold mb-4">
                    {t("marketing.teamsMock.title")}
                  </p>
                  <ol className="relative space-y-4">
                    <span
                      aria-hidden
                      className="absolute left-[11px] top-6 bottom-6 w-px bg-marketing-line"
                    />
                    {/* Step 1 — invite accepted */}
                    <li
                      className="mk-slide-in relative pl-9"
                      style={{ ["--mk-delay" as string]: "0ms" }}
                    >
                      <span className="absolute left-0 top-0 size-6 rounded-full bg-marketing-sage-soft border border-marketing-sage-line text-marketing-sage flex items-center justify-center text-[11px] font-bold">
                        1
                      </span>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-marketing-muted font-semibold mb-1.5">
                        {t("marketing.teamsMock.step1Label")}
                      </p>
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-marketing-surface border border-marketing-line">
                        <div className="size-8 rounded-lg bg-marketing-sage-soft text-marketing-sage flex items-center justify-center flex-none">
                          <Mail className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-marketing-ink truncate">
                            {t("marketing.teamsMock.step1Email")}
                          </p>
                          <p className="text-[10px] text-marketing-muted">
                            <span className="font-mono">
                              {t("marketing.teamsMock.step1Code")}
                            </span>
                            {" · "}
                            {t("marketing.teamsMock.step1Status")}
                          </p>
                        </div>
                        <span
                          className="mk-check-pop flex-none"
                          style={{ ["--mk-delay" as string]: "200ms" }}
                        >
                          <Check className="size-4 text-marketing-sage" />
                        </span>
                      </div>
                    </li>

                    {/* Step 2 — identity chip row */}
                    <li
                      className="mk-slide-in relative pl-9"
                      style={{ ["--mk-delay" as string]: "150ms" }}
                    >
                      <span className="absolute left-0 top-0 size-6 rounded-full bg-marketing-sage-soft border border-marketing-sage-line text-marketing-sage flex items-center justify-center text-[11px] font-bold">
                        2
                      </span>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-marketing-muted font-semibold mb-1.5">
                        {t("marketing.teamsMock.step2Label")}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <IdentityChip name="Maria" color="#E4A15A" />
                        <span
                          className="mk-check-pop inline-flex"
                          style={{ ["--mk-delay" as string]: "350ms" }}
                        >
                          <IdentityChip name="Ryan" color="#6C63FF" selected />
                        </span>
                        <IdentityChip name="Anna" color="#5DA490" />
                      </div>
                    </li>

                    {/* Step 3 — first task */}
                    <li
                      className="mk-slide-in relative pl-9"
                      style={{ ["--mk-delay" as string]: "300ms" }}
                    >
                      <span className="absolute left-0 top-0 size-6 rounded-full bg-marketing-sage-soft border border-marketing-sage-line text-marketing-sage flex items-center justify-center text-[11px] font-bold">
                        3
                      </span>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-marketing-muted font-semibold mb-1.5">
                        {t("marketing.teamsMock.step3Label")}
                      </p>
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-marketing-surface border border-marketing-line">
                        <div
                          className="size-8 rounded-lg flex items-center justify-center flex-none"
                          style={{
                            background:
                              "color-mix(in oklab, var(--primary) 14%, transparent)",
                            color: "var(--primary)",
                          }}
                        >
                          <Pill className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-marketing-ink">
                            <span className="tabular-nums text-marketing-muted mr-1.5">
                              {t("marketing.teamsMock.step3Time")}
                            </span>
                            {t("marketing.teamsMock.step3Title")}
                          </p>
                          <p className="text-[10px] text-marketing-muted">
                            {t("marketing.teamsMock.step3Note")}
                          </p>
                        </div>
                        <span className="text-[11px] font-semibold text-marketing-sage border border-marketing-sage-line rounded-full px-2.5 py-1 flex-none">
                          {t("marketing.teamsMock.step3MarkDone")}
                        </span>
                      </div>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>


      {/* ── 8. Trust strip ── */}
      <section className="px-6 md:px-8 py-8 md:py-10 border-y border-marketing-line bg-marketing-surface">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x md:divide-marketing-line/60">
          {[
            { n: 1, Icon: Languages },
            { n: 2, Icon: Users },
            { n: 3, Icon: ShieldCheck },
            { n: 4, Icon: Heart },
          ].map(({ n, Icon }) => (
            <Reveal
              key={n}
              delayMs={n * 60}
              className="text-center md:px-5 flex flex-col items-center"
            >
              <Icon className="size-4 text-marketing-muted mb-2" aria-hidden />
              <p
                className="text-xl md:text-2xl text-marketing-ink xl:whitespace-nowrap"
                style={display}
              >
                {t(`marketing.trust.s${n}Value`)}
              </p>
              <p className="mt-1.5 text-sm text-marketing-muted leading-snug">
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
            className="text-display-md text-marketing-ink"
            style={display}
          >
            {t("marketing.tablet.title")}
          </h2>
          <p className="text-marketing-muted text-base md:text-lg leading-[1.7]">
            {t("marketing.tablet.body")}
          </p>
          <p className="text-marketing-muted text-base md:text-lg leading-[1.7]">
            {t("marketing.tablet.bodyExtra")}
          </p>
          <div className="flex flex-wrap gap-2 justify-center pt-4">
            <PillTag icon={<Tablet className="size-3.5" />}>{t("marketing.tablet.t1")}</PillTag>
            <PillTag icon={<Languages className="size-3.5" />}>{t("marketing.tablet.t2")}</PillTag>
            <PillTag icon={<ShieldCheck className="size-3.5" />}>{t("marketing.tablet.t3")}</PillTag>
          </div>
        </Reveal>
      </section>

      {/* ── 10. Essentials vs complex care ── */}
      <section className="px-6 md:px-8 py-20 md:py-28 bg-marketing-surface border-y border-marketing-line">
        <div className="max-w-6xl mx-auto">
          <Reveal className="max-w-2xl mx-auto text-center space-y-4 mb-14">
            <Kicker>{t("marketing.inside.kicker")}</Kicker>
            <h2
              className="text-display-md text-marketing-ink"
              style={display}
            >
              {t("marketing.inside.title")}
            </h2>
            <p className="text-marketing-muted text-base md:text-lg leading-[1.7]">
              {t("marketing.inside.sub")}
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            <ComparisonCard
              title={t("marketing.essentials.title")}
              intro={t("marketing.essentials.intro")}
              rows={[
                { icon: ListChecks, key: "i1" },
                { icon: Pill, key: "i2" },
                { icon: Calendar, key: "i3" },
                { icon: BookOpen, key: "i4" },
                { icon: Siren, key: "i5" },
              ].map((r) => ({ icon: r.icon, label: t(`marketing.essentials.${r.key}`) }))}
            />
            <ComparisonCard
              accent
              title={t("marketing.complex.title")}
              intro={t("marketing.complex.intro")}
              rows={[
                { icon: Activity, key: "i1" },
                { icon: Droplet, key: "i2" },
                { icon: Wrench, key: "i3" },
                { icon: ShieldCheck, key: "i4" },
                { icon: RefreshCw, key: "i5" },
              ].map((r) => ({ icon: r.icon, label: t(`marketing.complex.${r.key}`) }))}
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


      {/* ── 11. Pricing ── */}
      <section id="pricing" className="px-6 md:px-8 py-20 md:py-28 bg-marketing-surface border-b border-marketing-line">
        <div className="max-w-4xl mx-auto">
          <Reveal className="max-w-2xl mx-auto text-center space-y-4 mb-14">
            <Kicker>{t("marketing.pricing.kicker")}</Kicker>
            <h2
              className="text-display-md text-marketing-ink"
              style={display}
            >
              {t("marketing.pricing.title")}
            </h2>
            <p className="text-marketing-muted text-base md:text-lg leading-[1.7]">
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
              className="text-display-md text-marketing-ink"
              style={display}
            >
              {t("marketing.faq.title")}
            </h2>
          </Reveal>
          <Accordion
            type="single"
            collapsible
            defaultValue="q1"
            className="mk-glass rounded-3xl px-5 md:px-7 divide-y divide-marketing-line/60"
          >
            {["q1", "q2", "q4", "q5", "q6", "q7", "q8", "q9", "q10"].map((k) => (
              <AccordionItem key={k} value={k} className="border-0">
                <AccordionTrigger
                  className="text-left text-lg py-5 hover:no-underline [&[data-state=open]>svg]:hidden text-marketing-ink"
                  style={display}
                >
                  <span className="flex-1 pr-4">{t(`marketing.faq.${k}Q`)}</span>
                  <span className="text-marketing-sage shrink-0">
                    <Plus className="size-5 transition-transform [[data-state=open]_&]:rotate-45" />
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-marketing-muted text-base md:text-lg leading-[1.7]">
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
            className="text-display-lg text-marketing-ink"
            style={display}
          >
            {t("marketing.cta.title")}
          </h2>
          <p className="text-marketing-muted text-base md:text-lg max-w-xl mx-auto leading-[1.7]">
            {t("marketing.cta.body")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              to="/auth/signup"
              className="mk-cta-glass mk-cta-glass--primary inline-flex items-center justify-center rounded-full font-semibold px-7 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
            >
              {t("marketing.hero.ctaCreate")}
            </Link>
            <Link
              to="/invite"
              className="mk-cta-glass mk-cta-glass--clear inline-flex items-center justify-center rounded-full text-marketing-ink font-semibold px-7 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-marketing-sage"
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


function PillTag({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="mk-glass-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-marketing-ink">
      <span className="text-marketing-sage">{icon}</span>
      {children}
    </span>
  );
}

function IdentityChip({
  name,
  color,
  selected = false,
}: {
  name: string;
  color: string;
  selected?: boolean;
}) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border " +
        (selected
          ? "bg-marketing-sage-soft border-marketing-sage-line text-marketing-sage"
          : "bg-marketing-surface border-marketing-line text-marketing-muted")
      }
    >
      <span
        className="inline-block size-2 rounded-full"
        style={{ background: color }}
        aria-hidden
      />
      {name}
    </span>
  );
}








/* ─── Problem section — old-way / CareNest-way cards ─────────────────────── */

function ProblemOldCard() {
  const { t } = useTranslation();
  return (
    <Reveal>
      <div className="relative h-full rounded-3xl p-6 md:p-7 bg-marketing-surface border border-marketing-line overflow-hidden">
        <div aria-hidden className="mk-grain" />
        <p className="relative text-[10px] font-semibold uppercase tracking-[0.22em] text-marketing-muted mb-3">
          {t("marketing.problem.oldEyebrow")}
        </p>
        <h3
          className="relative text-display-xs text-marketing-ink mb-5"
          style={display}
        >
          {t("marketing.problem.oldHeadline")}
        </h3>

        {/* Thread header */}
        <div className="relative flex items-center gap-2 pb-3 mb-3 border-b border-marketing-line/70">
          <AvatarDot letter="R" />
          <p className="text-xs font-semibold text-marketing-ink">
            {t("marketing.problem.oldChatPeer")}
          </p>
        </div>

        {/* Conversation */}
        <div className="relative space-y-2.5 mb-4">
          {/* Outgoing — 07:38 */}
          <ChatBubble
            side="out"
            text={t("marketing.problem.oldChat1")}
            time={t("marketing.problem.oldChat1Time")}
            delay={0}
          />

          {/* Typing indicator + incoming reply share one grid cell so the
              reply replaces the typing bubble in place — no double bubble
              during handoff, no ghost gap after fade-out, no gap under
              reduced motion (where typing stays hidden). */}
          <div className="grid">
            <div
              className="mk-typing [grid-area:1/1] justify-self-start max-w-[85%] rounded-2xl rounded-bl-md bg-marketing-bg border border-marketing-line px-3.5 py-2.5 inline-flex items-center gap-1"
              style={{
                ["--mk-delay" as string]: "600ms",
                animationDuration: "1300ms",
              } as React.CSSProperties}
              aria-hidden
            >
              <span
                className="mk-typing-dot size-1.5 rounded-full bg-marketing-muted"
                style={{ ["--mk-delay" as string]: "0ms" } as React.CSSProperties}
              />
              <span
                className="mk-typing-dot size-1.5 rounded-full bg-marketing-muted"
                style={{ ["--mk-delay" as string]: "150ms" } as React.CSSProperties}
              />
              <span
                className="mk-typing-dot size-1.5 rounded-full bg-marketing-muted"
                style={{ ["--mk-delay" as string]: "300ms" } as React.CSSProperties}
              />
            </div>
            {/* Incoming — 07:41 */}
            <div className="[grid-area:1/1] justify-self-start w-full">
              <ChatBubble
                side="in"
                text={t("marketing.problem.oldChat2")}
                time={t("marketing.problem.oldChat2Time")}
                delay={1900}
              />
            </div>
          </div>


          {/* Outgoing — 07:55 */}
          <ChatBubble
            side="out"
            text={t("marketing.problem.oldChat3")}
            time={t("marketing.problem.oldChat3Time")}
            delay={3000}
          />

          {/* Typing 2 + incoming emoji reply — same grid-stack pattern */}
          <div className="grid">
            <div
              className="mk-typing [grid-area:1/1] justify-self-start max-w-[85%] rounded-2xl rounded-bl-md bg-marketing-bg border border-marketing-line px-3.5 py-2.5 inline-flex items-center gap-1"
              style={{
                ["--mk-delay" as string]: "3400ms",
                animationDuration: "1300ms",
              } as React.CSSProperties}
              aria-hidden
            >
              <span
                className="mk-typing-dot size-1.5 rounded-full bg-marketing-muted"
                style={{ ["--mk-delay" as string]: "0ms" } as React.CSSProperties}
              />
              <span
                className="mk-typing-dot size-1.5 rounded-full bg-marketing-muted"
                style={{ ["--mk-delay" as string]: "150ms" } as React.CSSProperties}
              />
              <span
                className="mk-typing-dot size-1.5 rounded-full bg-marketing-muted"
                style={{ ["--mk-delay" as string]: "300ms" } as React.CSSProperties}
              />
            </div>
            <div className="[grid-area:1/1] justify-self-start w-full">
              <ChatBubble
                side="in"
                text={t("marketing.problem.oldChat4")}
                time={t("marketing.problem.oldChat4Time")}
                delay={4700}
              />
            </div>
          </div>
        </div>

        <p
          className="mk-slide-in relative text-sm text-marketing-muted leading-relaxed"
          style={{ ["--mk-delay" as string]: "5300ms" } as React.CSSProperties}
        >
          {t("marketing.problem.oldCaption")}
        </p>

      </div>
    </Reveal>
  );
}

function ChatBubble({
  side,
  text,
  time,
  delay,
}: {
  side: "in" | "out";
  text: string;
  time: string;
  delay: number;
}) {
  const isOut = side === "out";
  return (
    <div className={`flex flex-col ${isOut ? "items-end" : "items-start"}`}>
      <div
        className={
          isOut
            ? "mk-slide-in max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2 text-sm text-white shadow-sm"
            : "mk-slide-in max-w-[85%] rounded-2xl rounded-bl-md px-3.5 py-2 text-sm text-marketing-ink bg-marketing-bg border border-marketing-line"
        }
        style={
          isOut
            ? ({
                ["--mk-delay" as string]: `${delay}ms`,
                background:
                  "linear-gradient(180deg, color-mix(in oklab, var(--primary) 96%, white) 0%, var(--primary) 100%)",
              } as React.CSSProperties)
            : ({ ["--mk-delay" as string]: `${delay}ms` } as React.CSSProperties)
        }
      >
        {text}
      </div>
      <p
        className="mk-slide-in mt-1 text-[10px] tabular-nums text-marketing-muted/80"
        style={{ ["--mk-delay" as string]: `${delay + 80}ms` } as React.CSSProperties}
      >
        {time}
      </p>
    </div>
  );
}

function ProblemNewCard() {
  const { t } = useTranslation();
  const flashRef = useFlashlight<HTMLDivElement>();
  const rows = [
    {
      key: "r1",
      time: t("marketing.problem.newRow1Time"),
      name: t("marketing.problem.newRow1Name"),
      by: null as string | null,
      slideDelay: 0,
      missed: true,
      missedDelay: 2400,
      icon: Pill,
    },
    {
      key: "r2",
      time: t("marketing.problem.newRow2Time"),
      name: t("marketing.problem.newRow2Name"),
      by: t("marketing.problem.newRow2By"),
      slideDelay: 200,
      chipDelay: 500,
      icon: Wind,
      missed: false,
    },
    {
      key: "r3",
      time: t("marketing.problem.newRow3Time"),
      name: t("marketing.problem.newRow3Name"),
      by: t("marketing.problem.newRow3By"),
      slideDelay: 400,
      chipDelay: 700,
      icon: Droplet,
      missed: false,
    },
    {
      key: "r4",
      time: t("marketing.problem.newRow4Time"),
      name: t("marketing.problem.newRow4Name"),
      by: t("marketing.problem.newRow4By"),
      slideDelay: 600,
      chipDelay: 900,
      icon: Activity,
      missed: false,
    },
  ];

  return (
    <Reveal>
      <div
        ref={flashRef}
        className="relative h-full mk-glass mk-glass-border mk-flashlight rounded-3xl p-6 md:p-7"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-marketing-sage mb-3">
          {t("marketing.problem.newEyebrow")}
        </p>
        <h3
          className="text-display-xs text-marketing-ink mb-5"
          style={display}
        >
          {t("marketing.problem.newHeadline")}
        </h3>

        <ul className="space-y-2.5 mb-4">
          {rows.map((r) => {
            const Icon = r.icon;
            return (
              <li
                key={r.key}
                className="mk-slide-in rounded-2xl bg-marketing-bg border border-marketing-line p-3 flex items-center gap-3"
                style={{ ["--mk-delay" as string]: `${r.slideDelay}ms` } as React.CSSProperties}
              >
                <span className="text-xs font-bold text-marketing-muted tabular-nums shrink-0 w-11">
                  {r.time}
                </span>
                <div
                  className={
                    r.missed
                      ? "size-9 rounded-xl flex items-center justify-center shrink-0"
                      : "size-9 rounded-xl bg-marketing-sage-soft border border-marketing-sage-line text-marketing-sage flex items-center justify-center shrink-0"
                  }
                  style={
                    r.missed
                      ? {
                          background:
                            "color-mix(in oklab, var(--destructive) 12%, transparent)",
                          border:
                            "1px solid color-mix(in oklab, var(--destructive) 35%, transparent)",
                          color: "var(--destructive)",
                        }
                      : undefined
                  }
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-marketing-ink truncate">
                    {r.name}
                  </p>
                  {r.by ? (
                    <p className="text-[11px] text-marketing-muted tabular-nums truncate">
                      {t("marketing.problem.newStatusGiven")} · {r.by}
                    </p>
                  ) : null}
                </div>
                {r.missed ? (
                  <span
                    className="mk-slide-in inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide shrink-0"
                    style={
                      {
                        ["--mk-delay" as string]: `${r.missedDelay}ms`,
                        background:
                          "color-mix(in oklab, var(--destructive) 12%, transparent)",
                        border:
                          "1px solid color-mix(in oklab, var(--destructive) 35%, transparent)",
                        color: "var(--destructive)",
                      } as React.CSSProperties
                    }
                  >
                    <span
                      className="mk-check-pop inline-flex"
                      style={{ ["--mk-delay" as string]: `${r.missedDelay}ms` } as React.CSSProperties}
                    >
                      {t("marketing.problem.newRow1Missed")}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-marketing-sage-soft border border-marketing-sage-line text-marketing-sage px-2.5 py-1 text-[11px] font-semibold shrink-0">
                    <span
                      className="mk-check-pop"
                      style={{ ["--mk-delay" as string]: `${r.chipDelay}ms` } as React.CSSProperties}
                    >
                      <Check className="size-3" />
                    </span>
                    {t("marketing.problem.newStatusGiven")}
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <p
          className="mk-slide-in text-sm text-marketing-muted leading-relaxed"
          style={{ ["--mk-delay" as string]: "2900ms" } as React.CSSProperties}
        >
          {t("marketing.problem.newCaption")}
        </p>
      </div>
    </Reveal>
  );
}

function ClipboardIcon() {
  return (
    <span className="inline-flex size-5 rounded-md bg-primary-soft/60 text-primary items-center justify-center">
      <MessageSquareText className="size-3" />
    </span>
  );
}

function AvatarDot({ letter }: { letter: string }) {
  return (
    <span
      className="size-6 rounded-full flex items-center justify-center text-[10px] font-bold text-marketing-bg ring-2 ring-marketing-bg"
      style={{ background: "var(--primary)" }}
    >
      {letter}
    </span>
  );
}





function ComparisonCard({
  title,
  intro,
  rows,
  accent,
}: {
  title: string;
  intro: string;
  rows: { icon: LucideIcon; label: string }[];
  accent?: boolean;
}) {
  const flashRef = useFlashlight<HTMLDivElement>();
  return (
    <Reveal>
      <div
        ref={flashRef}
        className={`mk-glass mk-flashlight rounded-3xl p-7 md:p-9 transition-all hover:-translate-y-0.5 ${
          accent ? "ring-2 ring-marketing-sage" : ""
        }`}
      >
        <h3 className="text-display-xs text-marketing-ink mb-2" style={display}>
          {title}
        </h3>
        <p className="text-sm text-marketing-muted leading-relaxed mb-6">{intro}</p>
        <ul className="space-y-3">
          {rows.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-center gap-3 text-[0.95rem] text-marketing-ink"
            >
              <span className="inline-flex size-8 rounded-xl bg-marketing-sage-soft border border-marketing-sage-line text-marketing-sage items-center justify-center shrink-0">
                <Icon className="size-4" />
              </span>
              <span className="font-medium">{label}</span>
            </li>
          ))}
        </ul>
      </div>
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
      className={`relative rounded-3xl bg-marketing-bg p-7 md:p-8 flex flex-col items-start ${
        accent
          ? "mk-price-glow border-2 border-marketing-sage"
          : "border border-marketing-line shadow-sm"
      }`}
    >
      {badge && (
        <span className="absolute -top-3 left-6 inline-flex items-center rounded-full bg-marketing-sage text-marketing-bg px-3 py-1 text-xs font-semibold tracking-wide">
          {badge}
        </span>
      )}
      <p className="text-sm font-medium text-marketing-muted mb-4">{label}</p>
      <p className="text-4xl md:text-5xl text-marketing-ink mb-2" style={display}>
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







/* Hero H1: word-by-word fade-up on mount, violet gradient text. */
// HeroHeadline is imported from src/components/marketing/HeroHeadline.tsx

/* ─────────── Hero (Aave-style centered) ─────────── */
function Hero() {
  const { t } = useTranslation();
  const detected = usePlatform();
  // Preserve landing's existing behavior: show both glyphs until we know.
  const platform: "ios" | "android" | "desktop" = detected ?? "desktop";

  return (
    <section
      className="mk-hero-wash relative px-6 md:px-8 pt-[7.5rem] md:pt-[10rem] pb-0 overflow-hidden"
      style={{ marginTop: "calc(var(--mk-header-offset, 5rem) * -1)" }}
    >
      {/* Layered lavender bloom — near-white top, violet radials below. */}
      <div aria-hidden className="mk-hero-bloom pointer-events-none absolute inset-0 -z-10" />

      {/* Kicker + headline — wider column so line 1 doesn't fill the box
       *  (that's what proves centering: line 1 is shorter than line 2). */}
      <div className="max-w-6xl mx-auto text-center relative z-10">
        <Reveal immediate delayMs={0}>
          <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.22em] text-marketing-sage mb-7">
            {t("marketing.hero.kicker")}
          </span>
        </Reveal>

        <HeroHeadline
          line1={t("marketing.hero.headline1")}
          line2={t("marketing.hero.headline2")}
        />
      </div>

      {/* Subline + CTAs — original narrower column. */}
      <div className="max-w-3xl mx-auto text-center relative z-10">
        <Reveal immediate delayMs={180}>
          <p className="text-marketing-muted mt-6 mx-auto max-w-xl text-base md:text-lg leading-[1.7]">
            {t("marketing.hero.subline")}
          </p>
        </Reveal>

        <Reveal immediate delayMs={270}>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              to="/auth/signup"
              className="mk-cta-glass mk-cta-glass--primary inline-flex items-center justify-center rounded-full font-semibold px-7 py-3.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-marketing-bg focus-visible:ring-primary"
            >
              {t("marketing.hero.ctaCreate")}
            </Link>
            <Link
              to="/install"
              className="mk-cta-glass mk-cta-glass--clear inline-flex items-center justify-center gap-2.5 rounded-full text-marketing-ink font-semibold px-6 py-3.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-marketing-bg focus-visible:ring-marketing-sage"
            >
              <span className="inline-flex items-center gap-1.5">
                {(platform === "desktop" || platform === "ios") && (
                  <AppleGlyph className="size-[18px]" />
                )}
                {(platform === "desktop" || platform === "android") && (
                  <AndroidGlyph className="size-[18px]" />
                )}
              </span>
              {t("marketing.hero.ctaInstall")}
            </Link>
          </div>
          <div className="mt-5">
            <Link
              to="/invite"
              className="text-sm text-marketing-muted hover:text-marketing-sage transition-colors"
            >
              {t("marketing.hero.inviteLink")} →
            </Link>
          </div>
        </Reveal>
      </div>

      {/* Device — single centered iPad, clips into fold via mk-hero-device margin. */}
      <Reveal immediate delayMs={480} className="relative mt-6 md:mt-8">
        <HeroDevice />
      </Reveal>

      {/* Fold fade — dissolves the device edge into the next section. */}
      <div aria-hidden className="mk-hero-fold pointer-events-none absolute inset-x-0 bottom-0 z-10" />
    </section>
  );
}

function HeroDevice() {
  const { t } = useTranslation();
  return (
    <div className="mk-hero-device relative mx-auto w-full max-w-[1080px]">
      {/* Faint violet glow behind the device for separation */}
      <div aria-hidden className="mk-hero-glow mk-hero-glow--violet" />
      {/* Soft elliptical ground shadow */}
      <div aria-hidden className="mk-hero-glow mk-hero-glow--shadow" />
      <img
        src="/landing/hero-dashboard.webp"
        alt={t("marketing.hero.dashboardAlt")}
        width={1920}
        height={1806}
        fetchPriority="high"
        decoding="async"
        className="relative block w-full h-auto select-none"
        draggable={false}
      />
    </div>
  );
}


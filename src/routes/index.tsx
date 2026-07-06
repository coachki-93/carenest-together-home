import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Heart,
  Users,
  ShieldCheck,
  CalendarCheck,
  Activity,
  Pill,
  Wind,
  ClipboardList,
  Siren,
  BellRing,
  Languages,
  Tablet,
  ArrowRight,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Plus,
  Check,
  MessageSquareText,
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
          "CareNest helps families of medically complex children coordinate medications, vitals, oxygen, schedules and handovers with every caregiver — warm, calm, bilingual, tablet-friendly.",
      },
      { property: "og:title", content: "CareNest — Care, together" },
      {
        property: "og:description",
        content:
          "Coordinate every part of your child's care with the people you trust — in one warm, tablet-friendly space.",
      },
      { property: "og:url", content: SITE + "/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: SITE + "/" }],
  }),
  component: Landing,
});

const serif = { fontFamily: "var(--font-serif)" } as const;
const sansMk = { fontFamily: "var(--font-sans-marketing)" } as const;

function Landing() {
  const { t } = useTranslation();
  return (
    <main
      className="min-h-screen bg-marketing-bg text-marketing-ink antialiased"
      style={sansMk}
    >
      <MarketingHeader />

      {/* ───────── Hero ───────── */}
      <Hero />


      {/* ───────── Who it's for ───────── */}
      <section className="px-6 md:px-8 py-20 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <Kicker>{t("marketing.who.kicker")}</Kicker>
          <h2 className="text-3xl md:text-5xl leading-tight tracking-tight" style={serif}>
            {t("marketing.who.title")}
          </h2>
          <p className="text-marketing-muted text-lg leading-relaxed max-w-2xl mx-auto">
            {t("marketing.who.body")}
          </p>
          <div className="flex flex-wrap gap-2 justify-center pt-3">
            <Chip>{t("marketing.who.chip1")}</Chip>
            <Chip>{t("marketing.who.chip2")}</Chip>
            <Chip>{t("marketing.who.chip3")}</Chip>
          </div>

          <div className="mt-12 mx-auto max-w-2xl text-left rounded-2xl border border-marketing-line bg-marketing-surface px-6 py-5 flex gap-4 items-start">
            <div className="size-10 rounded-full bg-marketing-sage-soft border border-marketing-sage-line text-marketing-sage flex items-center justify-center shrink-0">
              <Users className="size-5" />
            </div>
            <div>
              <h3 className="text-lg italic text-marketing-ink mb-1" style={serif}>
                {t("marketing.who.caregiverTitle")}
              </h3>
              <p className="text-marketing-muted leading-relaxed text-sm">
                {t("marketing.who.caregiverBody")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── A day with CareNest ───────── */}
      <section id="day" className="px-6 md:px-8 py-20 md:py-24 bg-marketing-surface border-y border-marketing-line">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 space-y-4 max-w-2xl mx-auto">
            <Kicker>{t("marketing.day.kicker")}</Kicker>
            <h2 className="text-3xl md:text-5xl leading-tight tracking-tight" style={serif}>
              {t("marketing.day.title")}
            </h2>
            <p className="text-marketing-muted text-lg">{t("marketing.day.sub")}</p>
          </div>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-marketing-line rounded-2xl overflow-hidden border border-marketing-line">
            <DayStep n="01" icon={<Sunrise className="size-4" />} title={t("marketing.day.s1Title")} body={t("marketing.day.s1Body")} />
            <DayStep n="02" icon={<Sun className="size-4" />} title={t("marketing.day.s2Title")} body={t("marketing.day.s2Body")} />
            <DayStep n="03" icon={<Sunset className="size-4" />} title={t("marketing.day.s3Title")} body={t("marketing.day.s3Body")} />
            <DayStep n="04" icon={<Moon className="size-4" />} title={t("marketing.day.s4Title")} body={t("marketing.day.s4Body")} />
          </ol>
        </div>
      </section>

      {/* ───────── Features ───────── */}
      <section className="px-6 md:px-8 py-20 md:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-[1fr_1.4fr] gap-12 md:gap-16 items-end mb-14">
            <div className="space-y-4">
              <Kicker>{t("marketing.inside.kicker")}</Kicker>
              <h2 className="text-3xl md:text-5xl leading-tight tracking-tight" style={serif}>
                {t("marketing.inside.title")}
              </h2>
            </div>
            <p className="text-marketing-muted text-lg leading-relaxed md:pb-2">
              {t("marketing.inside.sub")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-12">
            <Feature icon={<CalendarCheck className="size-5" />} title={t("marketing.inside.f1Title")} body={t("marketing.inside.f1Body")} />
            <Feature icon={<Activity className="size-5" />} title={t("marketing.inside.f2Title")} body={t("marketing.inside.f2Body")} />
            <Feature icon={<Pill className="size-5" />} title={t("marketing.inside.f3Title")} body={t("marketing.inside.f3Body")} />
            <Feature icon={<Wind className="size-5" />} title={t("marketing.inside.f4Title")} body={t("marketing.inside.f4Body")} />
            <Feature icon={<ClipboardList className="size-5" />} title={t("marketing.inside.f5Title")} body={t("marketing.inside.f5Body")} />
            <Feature icon={<Siren className="size-5" />} title={t("marketing.inside.f6Title")} body={t("marketing.inside.f6Body")} />
          </div>

          <div className="mt-14 flex justify-center">
            <Link
              to="/features"
              className="inline-flex items-center gap-2 text-sm font-medium text-marketing-ink border-b border-marketing-ink/30 hover:border-marketing-sage hover:text-marketing-sage transition-colors py-1"
            >
              {t("marketing.inside.seeAll")} <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── Safety nets ───────── */}
      <section className="px-6 md:px-8 py-20 md:py-28 bg-marketing-surface border-y border-marketing-line">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-20 items-start">
          <div className="space-y-5 lg:sticky lg:top-10">
            <Kicker>{t("marketing.safety.kicker")}</Kicker>
            <h2 className="text-3xl md:text-5xl leading-tight tracking-tight" style={serif}>
              {t("marketing.safety.title")}
            </h2>
            <p className="text-marketing-muted text-lg leading-relaxed max-w-md">
              {t("marketing.safety.body")}
            </p>
          </div>
          <ul className="divide-y divide-marketing-line border-y border-marketing-line">
            <SafetyRow icon={<BellRing className="size-5" />} title={t("marketing.safety.r1Title")} body={t("marketing.safety.r1Body")} />
            <SafetyRow icon={<Wind className="size-5" />} title={t("marketing.safety.r2Title")} body={t("marketing.safety.r2Body")} />
            <SafetyRow icon={<Activity className="size-5" />} title={t("marketing.safety.r3Title")} body={t("marketing.safety.r3Body")} />
            <SafetyRow icon={<Siren className="size-5" />} title={t("marketing.safety.r4Title")} body={t("marketing.safety.r4Body")} />
          </ul>
        </div>
      </section>

      {/* ───────── Tablet / bilingual band ───────── */}
      <section className="px-6 md:px-8 py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <Kicker>{t("marketing.tablet.kicker")}</Kicker>
          <h2 className="text-3xl md:text-5xl leading-tight tracking-tight" style={serif}>
            {t("marketing.tablet.title")}
          </h2>
          <p className="text-marketing-muted text-lg leading-relaxed">
            {t("marketing.tablet.body")}
          </p>
          <div className="flex flex-wrap gap-2 justify-center pt-4">
            <PillTag icon={<Tablet className="size-3.5" />}>{t("marketing.tablet.t1")}</PillTag>
            <PillTag icon={<Languages className="size-3.5" />}>{t("marketing.tablet.t2")}</PillTag>
            <PillTag icon={<ShieldCheck className="size-3.5" />}>{t("marketing.tablet.t3")}</PillTag>
          </div>
        </div>
      </section>

      {/* ───────── Pricing ───────── */}
      <section className="px-6 md:px-8 py-20 md:py-28 bg-marketing-surface border-y border-marketing-line">
        <div className="max-w-3xl mx-auto text-center space-y-6 mb-14">
          <Kicker>{t("marketing.pricing.kicker")}</Kicker>
          <h2 className="text-3xl md:text-5xl leading-tight tracking-tight" style={serif}>
            {t("marketing.pricing.title")}
          </h2>
        </div>
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
          {/* Monthly */}
          <div className="rounded-2xl border border-marketing-line bg-marketing-bg p-6 md:p-8 flex flex-col items-start">
            <p className="text-sm font-medium text-marketing-muted mb-4">{t("marketing.pricing.monthlyLabel")}</p>
            <p className="text-4xl md:text-5xl italic text-marketing-ink mb-2" style={serif}>
              {t("marketing.pricing.monthlyPrice")}
            </p>
            <p className="text-sm text-marketing-muted mb-6">{t("marketing.pricing.monthlySub")}</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-marketing-muted mb-3">
              {t("marketing.pricing.featuresLabel")}
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
              className="mt-auto w-full text-center px-6 py-3.5 rounded-xl bg-marketing-bg border border-marketing-line text-marketing-ink font-medium hover:bg-marketing-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketing-sage"
            >
              {t("marketing.pricing.monthlyCta")}
            </Link>
          </div>

          {/* Annual — highlighted */}
          <div className="relative rounded-2xl border-2 border-marketing-sage bg-marketing-bg p-6 md:p-8 flex flex-col items-start">
            <span className="absolute -top-3 left-6 inline-flex items-center rounded-full bg-marketing-sage text-marketing-bg px-3 py-1 text-xs font-semibold tracking-wide">
              {t("marketing.pricing.annualBadge")}
            </span>
            <p className="text-sm font-medium text-marketing-muted mb-4">{t("marketing.pricing.annualLabel")}</p>
            <p className="text-4xl md:text-5xl italic text-marketing-ink mb-2" style={serif}>
              {t("marketing.pricing.annualPrice")}
            </p>
            <p className="text-sm text-marketing-muted mb-6">{t("marketing.pricing.annualSub")}</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-marketing-muted mb-3">
              {t("marketing.pricing.featuresLabel")}
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
              className="mt-auto w-full text-center px-6 py-3.5 rounded-xl bg-marketing-ink text-marketing-bg font-medium hover:bg-black transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-marketing-sage"
            >
              {t("marketing.pricing.annualCta")}
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── FAQ ───────── */}
      <section id="faq" className="px-6 md:px-8 py-20 md:py-28 bg-marketing-surface border-y border-marketing-line">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <Kicker>{t("marketing.faq.kicker")}</Kicker>
            <h2 className="text-3xl md:text-5xl leading-tight tracking-tight" style={serif}>
              {t("marketing.faq.title")}
            </h2>
          </div>
          <Accordion type="single" collapsible className="divide-y divide-marketing-line border-y border-marketing-line">
            {["q1", "q2", "q3", "q4", "q5", "q6"].map((k) => (
              <AccordionItem key={k} value={k} className="border-0">
                <AccordionTrigger className="text-left text-lg py-5 hover:no-underline [&[data-state=open]>svg]:hidden text-marketing-ink" style={serif}>
                  <span className="flex-1 pr-4">{t(`marketing.faq.${k}Q`)}</span>
                  <span className="text-marketing-sage shrink-0">
                    <Plus className="size-5 transition-transform [[data-state=open]_&]:rotate-45" />
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-marketing-muted leading-relaxed text-base">
                  {t(`marketing.faq.${k}A`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ───────── Final CTA ───────── */}
      <section className="px-6 md:px-8 py-24 md:py-32">
        <div className="max-w-3xl mx-auto text-center space-y-7">
          <h2 className="text-4xl md:text-6xl leading-[1.05] tracking-tight" style={serif}>
            {t("marketing.cta.title")}
          </h2>
          <p className="text-marketing-muted text-lg max-w-xl mx-auto leading-relaxed">
            {t("marketing.cta.body")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              to="/auth/signup"
              className="px-8 py-4 rounded-xl bg-marketing-ink text-marketing-bg font-medium hover:bg-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-marketing-sage"
            >
              {t("splash.ctaCreate")}
            </Link>
            <Link
              to="/invite"
              className="px-8 py-4 rounded-xl bg-marketing-bg border border-marketing-line text-marketing-ink font-medium hover:bg-marketing-surface transition-colors"
            >
              {t("splash.ctaInvite")}
            </Link>
          </div>
          <p className="text-sm text-marketing-muted pt-4">
            {t("splash.haveAccount")}{" "}
            <Link to="/auth/login" className="text-marketing-sage hover:underline font-medium">
              {t("splash.login")}
            </Link>
          </p>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}

/* ─────────────────────── building blocks ─────────────────────── */

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-marketing-sage">
      {children}
    </p>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-marketing-bg border border-marketing-line px-4 py-1.5 text-sm text-marketing-ink">
      {children}
    </span>
  );
}

function PillTag({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-marketing-bg border border-marketing-line px-3.5 py-1.5 text-xs font-medium text-marketing-ink">
      <span className="text-marketing-sage">{icon}</span>
      {children}
    </span>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="group space-y-3.5">
      <div className="size-11 rounded-2xl border border-marketing-line bg-marketing-bg text-marketing-sage flex items-center justify-center transition-transform group-hover:-translate-y-0.5">
        {icon}
      </div>
      <h3 className="text-2xl italic text-marketing-ink leading-tight" style={serif}>
        {title}
      </h3>
      <p className="text-marketing-muted leading-relaxed">{body}</p>
    </div>
  );
}

function DayStep({ n, icon, title, body }: { n: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <li className="bg-marketing-bg p-6 md:p-8 space-y-3">
      <div className="flex items-center justify-between text-marketing-muted">
        <span className="text-xs font-medium tracking-[0.2em]">{n}</span>
        <span className="text-marketing-sage">{icon}</span>
      </div>
      <h3 className="text-xl italic text-marketing-ink leading-snug" style={serif}>
        {title}
      </h3>
      <p className="text-sm text-marketing-muted leading-relaxed">{body}</p>
    </li>
  );
}

function SafetyRow({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <li className="flex gap-5 items-start py-6">
      <div className="size-10 rounded-full bg-marketing-sage-soft border border-marketing-sage-line text-marketing-sage flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="text-lg italic text-marketing-ink mb-1" style={serif}>
          {title}
        </h3>
        <p className="text-marketing-muted leading-relaxed">{body}</p>
      </div>
    </li>
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
        // 0 when hero top hits top of viewport; grows negative as page scrolls
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
      {/* Aurora — two large radial gradients on the lavender base */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60rem 40rem at 15% 20%, color-mix(in oklab, var(--primary) 10%, transparent), transparent 70%), radial-gradient(45rem 35rem at 90% 80%, color-mix(in oklab, oklch(0.85 0.09 55) 12%, transparent), transparent 70%)",
        }}
      />

      <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.05fr_1fr] gap-14 lg:gap-10 items-center">
        {/* Left: copy */}
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-marketing-sage-soft border border-marketing-sage-line text-[11px] font-medium uppercase tracking-[0.18em] text-marketing-sage mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-marketing-sage" />
            {t("marketing.hero.kicker")}
          </span>

          <h1
            className="tracking-tight text-marketing-ink mb-6"
            style={{
              ...serif,
              fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
              lineHeight: 1.05,
            }}
          >
            {t("marketing.hero.headline")}
          </h1>

          <p
            className="text-marketing-muted mb-10 max-w-lg"
            style={{
              fontSize: "clamp(1rem, 1.15vw, 1.125rem)",
              lineHeight: 1.7,
            }}
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

        {/* Right: tablet on the wall + satellites */}
        <div className="relative w-full">
          <div
            className="relative mx-auto max-w-[560px]"
            style={{
              transform: `rotate(-1.5deg) translateY(${offset}px)`,
              transition: "transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)",
            }}
          >
            {/* Tablet bezel */}
            <div className="relative rounded-[2.25rem] bg-marketing-ink p-3 md:p-4 shadow-[0_40px_80px_-30px_rgba(45,41,38,0.35)] ring-1 ring-black/5">
              {/* front camera dot */}
              <span className="absolute top-2 left-1/2 -translate-x-1/2 size-1.5 rounded-full bg-marketing-line/40" />

              {/* Screen */}
              <div className="bg-marketing-surface rounded-[1.5rem] overflow-hidden">
                {/* Top bar */}
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

                {/* Body — task list, screenshot-quality */}
                <div className="p-4 md:p-5 space-y-2.5">
                  <PreviewTask icon={<Pill className="size-4" />} title={t("marketing.inside.f3Title")} meta="08:00" done />
                  <PreviewTask icon={<Wind className="size-4" />} title={t("marketing.inside.f4Title")} meta="68 min" />
                  <PreviewTask icon={<Activity className="size-4" />} title={t("marketing.inside.f2Title")} meta="now" highlight />
                  <PreviewTask icon={<CalendarCheck className="size-4" />} title={t("marketing.day.s3Title")} meta="15:00" />
                </div>
              </div>
            </div>

            {/* Satellite: Oxygen — top-left overlap. Hidden on mobile. */}
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

            {/* Satellite: Handover — bottom-right overlap. Hidden on mobile. */}
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
  icon: React.ReactNode;
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-marketing-muted">{label}</p>
      <p className="text-2xl italic text-marketing-ink leading-tight" style={serif}>
        {value}
      </p>
    </div>
  );
}

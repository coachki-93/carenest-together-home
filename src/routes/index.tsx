import { createFileRoute, Link } from "@tanstack/react-router";
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
  CheckCircle2,
  Sunrise,
  Sun,
  Sunset,
  Moon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
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

function Landing() {
  const { t } = useTranslation();
  return (
    <main className="min-h-screen flex flex-col">
      <MarketingHeader />

      {/* Hero */}
      <section className="relative px-6 md:px-8 pt-10 md:pt-16 pb-16 md:pb-24">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-7 text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full bg-lavender px-4 py-1.5 text-xs font-semibold text-primary">
              <Heart className="size-3.5 fill-current" /> {t("splash.badge")}
            </span>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
              {t("marketing.hero.h1a")}{" "}
              <span className="text-primary">{t("marketing.hero.h1b")}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
              {t("marketing.hero.sub")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Button asChild size="lg" className="rounded-full px-8 h-14 text-base font-bold">
                <Link to="/auth/signup">
                  {t("splash.ctaCreate")} <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-8 h-14 text-base border-2">
                <Link to="/invite">{t("splash.ctaInvite")}</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{t("marketing.hero.trust")}</p>
          </div>

          <div className="relative">
            <div className="card-soft p-8 space-y-5 rotate-1">
              <HighlightRow icon={<Heart className="size-5" />} title={t("splash.feat1Title")} body={t("splash.feat1Body")} />
              <HighlightRow icon={<Users className="size-5" />} title={t("splash.feat2Title")} body={t("splash.feat2Body")} />
              <HighlightRow icon={<ShieldCheck className="size-5" />} title={t("splash.feat3Title")} body={t("splash.feat3Body")} />
            </div>
            <div className="absolute -z-10 -inset-8 bg-gradient-to-br from-lavender to-primary-soft rounded-[3rem] blur-3xl opacity-70" />
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <Section>
        <div className="text-center max-w-3xl mx-auto space-y-5">
          <Kicker>{t("marketing.who.kicker")}</Kicker>
          <h2 className="text-3xl md:text-4xl font-extrabold">{t("marketing.who.title")}</h2>
          <p className="text-muted-foreground text-lg leading-relaxed">{t("marketing.who.body")}</p>
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            <Chip>{t("marketing.who.chip1")}</Chip>
            <Chip>{t("marketing.who.chip2")}</Chip>
            <Chip>{t("marketing.who.chip3")}</Chip>
          </div>
        </div>
      </Section>

      {/* A day with CareNest */}
      <Section tinted>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <Kicker>{t("marketing.day.kicker")}</Kicker>
            <h2 className="text-3xl md:text-4xl font-extrabold">{t("marketing.day.title")}</h2>
            <p className="text-muted-foreground text-lg">{t("marketing.day.sub")}</p>
          </div>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DayStep n="1" icon={<Sunrise className="size-5" />} title={t("marketing.day.s1Title")} body={t("marketing.day.s1Body")} />
            <DayStep n="2" icon={<Sun className="size-5" />} title={t("marketing.day.s2Title")} body={t("marketing.day.s2Body")} />
            <DayStep n="3" icon={<Sunset className="size-5" />} title={t("marketing.day.s3Title")} body={t("marketing.day.s3Body")} />
            <DayStep n="4" icon={<Moon className="size-5" />} title={t("marketing.day.s4Title")} body={t("marketing.day.s4Body")} />
          </ol>
        </div>
      </Section>

      {/* What's inside */}
      <Section>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <Kicker>{t("marketing.inside.kicker")}</Kicker>
            <h2 className="text-3xl md:text-4xl font-extrabold">{t("marketing.inside.title")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t("marketing.inside.sub")}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard icon={<CalendarCheck className="size-5" />} title={t("marketing.inside.f1Title")} body={t("marketing.inside.f1Body")} />
            <FeatureCard icon={<Activity className="size-5" />} title={t("marketing.inside.f2Title")} body={t("marketing.inside.f2Body")} />
            <FeatureCard icon={<Pill className="size-5" />} title={t("marketing.inside.f3Title")} body={t("marketing.inside.f3Body")} />
            <FeatureCard icon={<Wind className="size-5" />} title={t("marketing.inside.f4Title")} body={t("marketing.inside.f4Body")} />
            <FeatureCard icon={<ClipboardList className="size-5" />} title={t("marketing.inside.f5Title")} body={t("marketing.inside.f5Body")} />
            <FeatureCard icon={<Siren className="size-5" />} title={t("marketing.inside.f6Title")} body={t("marketing.inside.f6Body")} />
          </div>
          <div className="text-center mt-10">
            <Button asChild variant="outline" className="rounded-full border-2">
              <Link to="/features">{t("marketing.inside.seeAll")} <ArrowRight className="size-4" /></Link>
            </Button>
          </div>
        </div>
      </Section>

      {/* Safety nets */}
      <Section tinted>
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <Kicker>{t("marketing.safety.kicker")}</Kicker>
            <h2 className="text-3xl md:text-4xl font-extrabold">{t("marketing.safety.title")}</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">{t("marketing.safety.body")}</p>
          </div>
          <ul className="space-y-3">
            <SafetyRow icon={<BellRing className="size-5" />} title={t("marketing.safety.r1Title")} body={t("marketing.safety.r1Body")} />
            <SafetyRow icon={<Wind className="size-5" />} title={t("marketing.safety.r2Title")} body={t("marketing.safety.r2Body")} />
            <SafetyRow icon={<Activity className="size-5" />} title={t("marketing.safety.r3Title")} body={t("marketing.safety.r3Body")} />
            <SafetyRow icon={<Siren className="size-5" />} title={t("marketing.safety.r4Title")} body={t("marketing.safety.r4Body")} />
          </ul>
        </div>
      </Section>

      {/* Built for the tablet */}
      <Section>
        <div className="max-w-4xl mx-auto text-center space-y-5">
          <Kicker>{t("marketing.tablet.kicker")}</Kicker>
          <h2 className="text-3xl md:text-4xl font-extrabold">{t("marketing.tablet.title")}</h2>
          <p className="text-muted-foreground text-lg leading-relaxed">{t("marketing.tablet.body")}</p>
          <div className="flex flex-wrap gap-3 justify-center pt-3">
            <PillTag icon={<Tablet className="size-4" />}>{t("marketing.tablet.t1")}</PillTag>
            <PillTag icon={<Languages className="size-4" />}>{t("marketing.tablet.t2")}</PillTag>
            <PillTag icon={<ShieldCheck className="size-4" />}>{t("marketing.tablet.t3")}</PillTag>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section tinted id="faq">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 space-y-3">
            <Kicker>{t("marketing.faq.kicker")}</Kicker>
            <h2 className="text-3xl md:text-4xl font-extrabold">{t("marketing.faq.title")}</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-2">
            {["q1", "q2", "q3", "q4", "q5", "q6"].map((k) => (
              <AccordionItem key={k} value={k} className="card-soft px-5 border-0">
                <AccordionTrigger className="text-left font-bold hover:no-underline">
                  {t(`marketing.faq.${k}Q`)}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {t(`marketing.faq.${k}A`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Section>

      {/* Final CTA */}
      <Section>
        <div className="max-w-3xl mx-auto text-center card-soft p-10 md:p-14 space-y-5 bg-gradient-to-br from-lavender to-primary-soft border-0">
          <h2 className="text-3xl md:text-4xl font-extrabold">{t("marketing.cta.title")}</h2>
          <p className="text-muted-foreground text-lg">{t("marketing.cta.body")}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button asChild size="lg" className="rounded-full px-8 h-14 text-base font-bold">
              <Link to="/auth/signup">{t("splash.ctaCreate")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-8 h-14 text-base border-2 bg-card">
              <Link to="/invite">{t("splash.ctaInvite")}</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground pt-2">
            {t("splash.haveAccount")}{" "}
            <Link to="/auth/login" className="text-primary font-semibold hover:underline">
              {t("splash.login")}
            </Link>
          </p>
        </div>
      </Section>

      <MarketingFooter />
    </main>
  );
}

/* ---------- small layout helpers (file-local) ---------- */

function Section({
  children,
  tinted,
  id,
}: {
  children: React.ReactNode;
  tinted?: boolean;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`px-6 md:px-8 py-16 md:py-24 ${tinted ? "bg-lavender/40" : ""}`}
    >
      {children}
    </section>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest text-primary">
      {children}
    </p>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-card border border-border px-4 py-1.5 text-sm font-semibold">
      {children}
    </span>
  );
}

function PillTag({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-4 py-2 text-sm font-semibold">
      <span className="text-primary">{icon}</span>
      {children}
    </span>
  );
}

function HighlightRow({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="rounded-2xl bg-primary-soft text-primary p-3 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-bold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">{body}</p>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="card-soft p-6 space-y-3 hover:shadow-md transition-shadow">
      <div className="size-11 rounded-2xl bg-primary-soft text-primary flex items-center justify-center">
        {icon}
      </div>
      <h3 className="font-bold text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

function DayStep({
  n,
  icon,
  title,
  body,
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="card-soft p-5 space-y-2 relative">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold text-primary">{n}</span>
        <span className="size-9 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
          {icon}
        </span>
      </div>
      <h3 className="font-bold">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </li>
  );
}

function SafetyRow({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-4 items-start card-soft p-5">
      <div className="size-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-bold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{body}</p>
      </div>
      <CheckCircle2 className="size-5 text-primary/70 shrink-0 mt-1.5" />
    </li>
  );
}

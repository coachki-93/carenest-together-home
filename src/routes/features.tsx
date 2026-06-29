import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarCheck,
  Activity,
  Pill,
  Wind,
  ClipboardList,
  Siren,
  Users,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { MarketingHeader } from "@/components/carenest/MarketingHeader";
import { MarketingFooter } from "@/components/carenest/MarketingFooter";

const SITE = "https://carenest-together-home.lovable.app";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — CareNest" },
      {
        name: "description",
        content:
          "A deeper look at every part of CareNest: today's tasks, vitals tracking, medications, oxygen, schedule, handovers, safety nets, family and roles.",
      },
      { property: "og:title", content: "Features — CareNest" },
      {
        property: "og:description",
        content:
          "Today's tasks, vitals with pediatric reference ranges, medications, oxygen tracking, schedule, handovers, safety nets — explained in detail.",
      },
      { property: "og:url", content: SITE + "/features" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: SITE + "/features" }],
  }),
  component: FeaturesPage,
});

function FeaturesPage() {
  const { t } = useTranslation();

  const sections = [
    {
      icon: <CalendarCheck className="size-5" />,
      title: t("features.today.title"),
      body: t("features.today.body"),
      bullets: ["today.b1", "today.b2", "today.b3", "today.b4"],
    },
    {
      icon: <Activity className="size-5" />,
      title: t("features.vitals.title"),
      body: t("features.vitals.body"),
      bullets: ["vitals.b1", "vitals.b2", "vitals.b3", "vitals.b4"],
    },
    {
      icon: <Pill className="size-5" />,
      title: t("features.meds.title"),
      body: t("features.meds.body"),
      bullets: ["meds.b1", "meds.b2", "meds.b3"],
    },
    {
      icon: <Wind className="size-5" />,
      title: t("features.oxygen.title"),
      body: t("features.oxygen.body"),
      bullets: ["oxygen.b1", "oxygen.b2", "oxygen.b3"],
    },
    {
      icon: <CalendarCheck className="size-5" />,
      title: t("features.schedule.title"),
      body: t("features.schedule.body"),
      bullets: ["schedule.b1", "schedule.b2", "schedule.b3"],
    },
    {
      icon: <ClipboardList className="size-5" />,
      title: t("features.handover.title"),
      body: t("features.handover.body"),
      bullets: ["handover.b1", "handover.b2", "handover.b3"],
    },
    {
      icon: <Siren className="size-5" />,
      title: t("features.safety.title"),
      body: t("features.safety.body"),
      bullets: ["safety.b1", "safety.b2", "safety.b3"],
    },
    {
      icon: <Users className="size-5" />,
      title: t("features.family.title"),
      body: t("features.family.body"),
      bullets: ["family.b1", "family.b2", "family.b3"],
    },
  ];

  return (
    <main className="min-h-screen flex flex-col">
      <MarketingHeader />

      <section className="px-6 md:px-8 pt-10 md:pt-16 pb-10 text-center">
        <div className="max-w-3xl mx-auto space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            {t("features.kicker")}
          </p>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
            {t("features.title")}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {t("features.sub")}
          </p>
        </div>
      </section>

      <section className="px-6 md:px-8 pb-10">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-5">
          {sections.map((s) => (
            <article key={s.title} className="card-soft p-7 space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-primary-soft text-primary flex items-center justify-center">
                  {s.icon}
                </div>
                <h2 className="text-xl font-extrabold">{s.title}</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              <ul className="space-y-2 pt-1">
                {s.bullets.map((b) => (
                  <li key={b} className="flex gap-2 items-start text-sm">
                    <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
                    <span>{t(`features.${b}`)}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-8 py-16">
        <div className="max-w-3xl mx-auto text-center card-soft p-10 bg-gradient-to-br from-lavender to-primary-soft border-0 space-y-4">
          <h2 className="text-2xl md:text-3xl font-extrabold">{t("features.cta.title")}</h2>
          <p className="text-muted-foreground">{t("features.cta.body")}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button asChild size="lg" className="rounded-full px-8 h-14 text-base font-bold">
              <Link to="/auth/signup">
                {t("splash.ctaCreate")} <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-8 h-14 text-base border-2 bg-card">
              <Link to="/">{t("features.cta.backHome")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Share,
  MoreVertical,
  Home,
  Bell,
  CheckCircle2,
  ChevronRight,
  Wind,
  ShieldAlert,
  BellRing,
} from "lucide-react";
import type { ReactNode } from "react";
import { MarketingHeader } from "@/components/carenest/MarketingHeader";
import { MarketingFooter } from "@/components/carenest/MarketingFooter";
import { AppleGlyph, AndroidGlyph } from "@/components/carenest/BrandGlyphs";
import { Kicker } from "@/components/marketing/Kicker";
import { HeroHeadline } from "@/components/marketing/HeroHeadline";
import { Reveal } from "@/components/marketing/Reveal";
import { usePlatform } from "@/lib/marketing/use-platform";
import { useFlashlight } from "@/lib/marketing/use-flashlight";

import { resolveHeadLanguage, OG_LOCALE } from "@/lib/i18n/head";

const SITE = "https://carenest-together-home.lovable.app";
const OG_IMAGE = SITE + "/og-image.jpg";

const INSTALL_META = {
  en: {
    title: "Install CareNest on your phone or tablet — CareNest",
    description:
      "Add CareNest to your home screen and it opens full-screen like an app. Step-by-step for iPhone/iPad (Safari) and Android (Chrome).",
    ogTitle: "Install CareNest on your device",
    ogDescription:
      "A quick guide to add CareNest to your home screen — no app store needed. Notifications work once installed.",
  },
  sv: {
    title: "Installera CareNest på din telefon eller surfplatta — CareNest",
    description:
      "Lägg till CareNest på hemskärmen så öppnas den i helskärm som en app. Steg för steg för iPhone/iPad (Safari) och Android (Chrome).",
    ogTitle: "Installera CareNest på din enhet",
    ogDescription:
      "En snabb guide för att lägga till CareNest på hemskärmen — ingen appbutik behövs. Aviseringar fungerar när den är installerad.",
  },
} as const;

export const Route = createFileRoute("/install")({
  head: () => {
    const lang = resolveHeadLanguage();
    const m = INSTALL_META[lang];
    return {
      meta: [
        { title: m.title },
        { name: "description", content: m.description },
        { property: "og:title", content: m.ogTitle },
        { property: "og:description", content: m.ogDescription },
        { property: "og:url", content: SITE + "/install" },
        { property: "og:type", content: "website" },
        { property: "og:locale", content: OG_LOCALE[lang] },
        { property: "og:image", content: OG_IMAGE },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: OG_IMAGE },
      ],
      links: [{ rel: "canonical", href: SITE + "/install" }],
    };
  },
  component: InstallPage,
});

function InstallPage() {
  const { t } = useTranslation();
  const platform = usePlatform();

  const iosBlock = (
    <PlatformBlock
      id="ios"
      glyph={<AppleGlyph className="size-5 text-marketing-ink" />}
      title={t("marketing.install.iosTitle")}
      browser={t("marketing.install.iosBrowser")}
      steps={[
        {
          icon: <Share className="size-5" />,
          title: t("marketing.install.iosS1Title"),
          body: t("marketing.install.iosS1Body"),
        },
        {
          icon: <Home className="size-5" />,
          title: t("marketing.install.iosS2Title"),
          body: t("marketing.install.iosS2Body"),
        },
        {
          icon: <CheckCircle2 className="size-5" />,
          title: t("marketing.install.iosS3Title"),
          body: t("marketing.install.iosS3Body"),
        },
      ]}
      armed={platform !== "android"}
    />
  );

  const androidBlock = (
    <PlatformBlock
      id="android"
      glyph={<AndroidGlyph className="size-5 text-marketing-ink" />}
      title={t("marketing.install.androidTitle")}
      browser={t("marketing.install.androidBrowser")}
      steps={[
        {
          icon: <MoreVertical className="size-5" />,
          title: t("marketing.install.andS1Title"),
          body: t("marketing.install.andS1Body"),
        },
        {
          icon: <Home className="size-5" />,
          title: t("marketing.install.andS2Title"),
          body: t("marketing.install.andS2Body"),
        },
        {
          icon: <CheckCircle2 className="size-5" />,
          title: t("marketing.install.andS3Title"),
          body: t("marketing.install.andS3Body"),
        },
      ]}
      armed={platform !== "ios"}
    />
  );

  let primary: ReactNode;
  let secondary: ReactNode = null;
  if (platform === "ios") {
    primary = iosBlock;
    secondary = (
      <OtherPlatformDisclosure
        label={t("marketing.install.otherPlatformAndroid")}
        glyph={<AndroidGlyph className="size-4" />}
      >
        {androidBlock}
      </OtherPlatformDisclosure>
    );
  } else if (platform === "android") {
    primary = androidBlock;
    secondary = (
      <OtherPlatformDisclosure
        label={t("marketing.install.otherPlatformIos")}
        glyph={<AppleGlyph className="size-4" />}
      >
        {iosBlock}
      </OtherPlatformDisclosure>
    );
  } else {
    primary = (
      <>
        {iosBlock}
        {androidBlock}
      </>
    );
  }

  return (
    <main
      className="min-h-screen bg-marketing-bg text-marketing-ink antialiased pt-20 md:pt-24"
      style={{ fontFamily: "var(--font-sans-marketing)" }}
    >
      <MarketingHeader />

      {/* Hero */}
      <section className="relative px-6 md:px-8 pt-10 md:pt-16 pb-14 md:pb-20 overflow-hidden">
        <div aria-hidden className="mk-hero-bloom pointer-events-none absolute inset-0 -z-10" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <Reveal immediate delayMs={0}>
            <Kicker>{t("marketing.install.kicker")}</Kicker>
          </Reveal>

          <div className="mt-6">
            <HeroHeadline
              line1={t("marketing.install.headline1")}
              line2={t("marketing.install.headline2")}
            />
          </div>

          <Reveal immediate delayMs={180}>
            <p className="text-marketing-muted mt-6 mx-auto max-w-xl text-base md:text-lg leading-[1.7]">
              {t("marketing.install.subtitle")}
            </p>
          </Reveal>

          <Reveal immediate delayMs={360} className="mt-10">
            <img
              src="/landing/install-tablet.webp"
              alt={t("marketing.install.tabletAlt")}
              width={1920}
              height={1806}
              draggable={false}
              className="mx-auto w-full max-w-[420px] md:max-w-[480px] h-auto"
            />
          </Reveal>
        </div>
      </section>

      {/* Platform section(s) */}
      <section className="px-6 md:px-8 pb-16 md:pb-20">
        <div className="max-w-5xl mx-auto space-y-16">{primary}</div>
      </section>

      {secondary && (
        <section className="px-6 md:px-8 pb-16 md:pb-20">
          <div className="max-w-5xl mx-auto">{secondary}</div>
        </section>
      )}

      {/* Notifications section — real-looking push mock + copy + chips */}
      <NotificationsSection />

      <MarketingFooter />
    </main>
  );
}

const serif = { fontFamily: "var(--font-display)", fontWeight: 700, letterSpacing: "-0.025em" } as const;

type StepData = { icon: ReactNode; title: string; body: string };

function PlatformBlock({
  id,
  glyph,
  title,
  browser,
  steps,
  armed,
}: {
  id: string;
  glyph: ReactNode;
  title: string;
  browser: string;
  steps: StepData[];
  armed: boolean;
}) {
  return (
    <div id={id} className="scroll-mt-24">
      <Reveal immediate={armed} className="mb-8 flex items-center gap-3">
        <span className="size-10 rounded-2xl mk-glass border border-marketing-line flex items-center justify-center">
          {glyph}
        </span>
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-marketing-muted">
            {browser}
          </p>
          <h2
            className="tracking-tight text-marketing-ink"
            style={{ ...serif, fontSize: "clamp(1.5rem, 2.8vw, 2rem)", lineHeight: 1.1 }}
          >
            {title}
          </h2>
        </div>
      </Reveal>

      <StepGrid steps={steps} armed={armed} />
    </div>
  );
}

function StepGrid({ steps, armed }: { steps: StepData[]; armed: boolean }) {
  return (
    <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      {steps.map((s, i) => (
        <div key={i} className="relative">
          <Reveal immediate={armed} delayMs={i * 120}>
            <StepCard n={i + 1} icon={s.icon} title={s.title} body={s.body} popDelayMs={150} />
          </Reveal>
          {/* Chevron connector between cards on md+ */}
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className="hidden md:flex absolute top-1/2 -right-4 -translate-y-1/2 text-marketing-muted/50"
            >
              <ChevronRight className="size-5" />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function StepCard({
  n,
  icon,
  title,
  body,
  popDelayMs,
}: {
  n: number;
  icon: ReactNode;
  title: string;
  body: string;
  popDelayMs: number;
}) {
  return (
    <div className="mk-glass rounded-3xl p-6 md:p-7 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <span
          className="mk-check-pop size-10 rounded-full flex items-center justify-center font-bold text-marketing-bg"
          style={{ background: "var(--primary)", ["--mk-delay" as string]: `${popDelayMs}ms` }}
        >
          {n}
        </span>
        <span className="text-marketing-muted">{icon}</span>
      </div>
      <h3 className="text-marketing-ink mb-1.5" style={{ ...serif, fontSize: "1.15rem" }}>
        {title}
      </h3>
      <p className="text-marketing-muted leading-[1.7] text-[0.98rem]">{body}</p>
    </div>
  );
}

function OtherPlatformDisclosure({
  label,
  glyph,
  children,
}: {
  label: string;
  glyph: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className="mk-glass rounded-3xl px-5 md:px-7 py-3 group open:pb-8">
      <summary className="cursor-pointer list-none flex items-center gap-3 py-3 text-marketing-muted hover:text-marketing-ink transition-colors">
        <span className="size-8 rounded-xl bg-marketing-bg border border-marketing-line flex items-center justify-center">
          {glyph}
        </span>
        <span className="text-sm font-medium">{label}</span>
        <span className="ml-auto text-xs opacity-70 group-open:rotate-180 transition-transform">▾</span>
      </summary>
      {/* Reveal inside details can miss the IO callback since the collapsed
       * children have zero layout; children below force immediate on all Reveals. */}
      <div className="pt-4 [&_[data-visible='false']]:!opacity-100 [&_[data-visible='false']]:!translate-y-0">
        <DisclosureContent>{children}</DisclosureContent>
      </div>
    </details>
  );
}

/**
 * Wraps disclosure children and injects `data-force-visible` — combined with
 * the parent's descendant selectors, all Reveals appear immediately when the
 * user opens the disclosure. mk-slide-in / mk-check-pop are also released via
 * `[data-visible="true"]` — we set that on a wrapper to trigger the animations
 * on open.
 */
function DisclosureContent({ children }: { children: ReactNode }) {
  return (
    <div data-visible="true">
      {children}
    </div>
  );
}

function NotificationsSection() {
  const { t } = useTranslation();
  const chips = [
    { Icon: Wind, label: t("marketing.install.notifChipOxygen") },
    { Icon: ShieldAlert, label: t("marketing.install.notifChipCritical") },
    { Icon: BellRing, label: t("marketing.install.notifChipMissed") },
  ];
  return (
    <section className="px-6 md:px-8 pb-24 md:pb-32">
      <div className="max-w-3xl mx-auto">
        <Reveal className="mk-glass rounded-3xl p-6 md:p-8">
          {/* Lock-screen style notification mock */}
          <div
            className="mk-slide-in mb-6 rounded-2xl bg-white/95 border border-marketing-line px-4 py-3 flex items-start gap-3 shadow-[0_10px_30px_-16px_rgba(60,50,120,0.35)]"
            style={{ ["--mk-delay" as string]: "80ms" }}
          >
            <img
              src="/landing/carenest-app-icon.webp"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-[8px] shrink-0"
              draggable={false}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-marketing-ink/70">
                  {t("marketing.install.notifMockAppName")}
                </span>
                <span className="text-[11px] text-marketing-muted">
                  {t("marketing.install.notifMockNow")}
                </span>
              </div>
              <p className="text-sm font-semibold text-marketing-ink mt-0.5">
                {t("marketing.install.notifMockTitle")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <span className="size-10 rounded-2xl mk-glass border border-marketing-line text-marketing-sage flex items-center justify-center shrink-0">
              <Bell className="size-5" />
            </span>
            <div className="min-w-0">
              <h3
                className="text-marketing-ink"
                style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.35rem" }}
              >
                {t("marketing.install.notifTitle")}
              </h3>
              <p className="text-marketing-muted leading-[1.75] mt-2">
                {t("marketing.install.notifBody")}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {chips.map(({ Icon, label }, i) => (
                  <span
                    key={i}
                    className="mk-slide-in inline-flex items-center gap-2 rounded-full border border-marketing-line bg-white/70 px-3 py-1.5 text-xs font-medium text-marketing-ink"
                    style={{ ["--mk-delay" as string]: `${240 + i * 90}ms` }}
                  >
                    <Icon className="size-3.5 text-marketing-sage" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Share, MoreVertical, Home, Bell, CheckCircle2 } from "lucide-react";
import { MarketingHeader } from "@/components/carenest/MarketingHeader";
import { MarketingFooter } from "@/components/carenest/MarketingFooter";
import { AppleGlyph, AndroidGlyph } from "@/components/carenest/BrandGlyphs";

const SITE = "https://carenest-together-home.lovable.app";

export const Route = createFileRoute("/install")({
  head: () => ({
    meta: [
      { title: "Install CareNest on your phone or tablet — CareNest" },
      {
        name: "description",
        content:
          "Add CareNest to your home screen and it opens full-screen like an app. Step-by-step for iPhone/iPad (Safari) and Android (Chrome).",
      },
      { property: "og:title", content: "Install CareNest on your device" },
      {
        property: "og:description",
        content:
          "A quick guide to add CareNest to your home screen — no app store needed. Notifications work once installed.",
      },
      { property: "og:url", content: SITE + "/install" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: SITE + "/install" }],
  }),
  component: InstallPage,
});

const serif = { fontFamily: "var(--font-display)", fontWeight: 800, letterSpacing: "-0.02em" } as const;

function InstallPage() {
  const { t } = useTranslation();
  const iosRef = useRef<HTMLElement>(null);
  const androidRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = window.navigator.userAgent || "";
    let target: HTMLElement | null = null;
    if (/android/i.test(ua)) target = androidRef.current;
    else if (
      /iPad|iPhone|iPod/.test(ua) ||
      (/Macintosh/.test(ua) && "ontouchend" in document)
    )
      target = iosRef.current;
    if (target) {
      // Wait a tick so layout is stable.
      window.requestAnimationFrame(() => {
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, []);

  return (
    <main className="min-h-screen bg-marketing-bg text-marketing-ink antialiased pt-20 md:pt-24" style={{ fontFamily: "var(--font-sans-marketing)" }}>
      <MarketingHeader />

      <section className="px-6 md:px-8 pt-10 md:pt-16 pb-14 md:pb-20">
        <div className="max-w-3xl mx-auto text-center">
          <p className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-marketing-sage">
            <span className="w-1.5 h-1.5 rounded-full bg-marketing-sage" />
            {t("marketing.install.kicker")}
          </p>
          <h1
            className="tracking-tight text-marketing-ink mt-5"
            style={{ ...serif, fontSize: "clamp(2rem, 4.5vw, 3.25rem)", lineHeight: 1.08 }}
          >
            {t("marketing.install.title")}
          </h1>
          <p className="text-marketing-muted mt-5 max-w-xl mx-auto text-[1.05rem] leading-[1.7]">
            {t("marketing.install.subtitle")}
          </p>
        </div>
      </section>

      {/* iOS */}
      <section ref={iosRef} id="ios" className="px-6 md:px-8 py-16 md:py-20 border-y border-marketing-line bg-marketing-surface scroll-mt-24">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <span className="size-10 rounded-2xl bg-marketing-bg border border-marketing-line flex items-center justify-center">
              <AppleGlyph className="size-5 text-marketing-ink" />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-marketing-muted">
                {t("marketing.install.iosBrowser")}
              </p>
              <h2 className="tracking-tight text-marketing-ink" style={{ ...serif, fontSize: "clamp(1.5rem, 2.8vw, 2rem)", lineHeight: 1.1 }}>
                {t("marketing.install.iosTitle")}
              </h2>
            </div>
          </div>

          <ol className="space-y-4">
            <Step n={1} icon={<Share className="size-5" />} title={t("marketing.install.iosS1Title")} body={t("marketing.install.iosS1Body")} />
            <Step n={2} icon={<Home className="size-5" />} title={t("marketing.install.iosS2Title")} body={t("marketing.install.iosS2Body")} />
            <Step n={3} icon={<CheckCircle2 className="size-5" />} title={t("marketing.install.iosS3Title")} body={t("marketing.install.iosS3Body")} />
          </ol>
        </div>
      </section>

      {/* Android */}
      <section ref={androidRef} id="android" className="px-6 md:px-8 py-16 md:py-20 scroll-mt-24">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <span className="size-10 rounded-2xl bg-marketing-surface border border-marketing-line flex items-center justify-center">
              <AndroidGlyph className="size-5 text-marketing-ink" />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-marketing-muted">
                {t("marketing.install.androidBrowser")}
              </p>
              <h2 className="tracking-tight text-marketing-ink" style={{ ...serif, fontSize: "clamp(1.5rem, 2.8vw, 2rem)", lineHeight: 1.1 }}>
                {t("marketing.install.androidTitle")}
              </h2>
            </div>
          </div>

          <ol className="space-y-4">
            <Step n={1} icon={<MoreVertical className="size-5" />} title={t("marketing.install.andS1Title")} body={t("marketing.install.andS1Body")} />
            <Step n={2} icon={<Home className="size-5" />} title={t("marketing.install.andS2Title")} body={t("marketing.install.andS2Body")} />
            <Step n={3} icon={<CheckCircle2 className="size-5" />} title={t("marketing.install.andS3Title")} body={t("marketing.install.andS3Body")} />
          </ol>
        </div>
      </section>

      {/* Notifications */}
      <section className="px-6 md:px-8 py-14 md:py-16 border-y border-marketing-line bg-marketing-surface">
        <div className="max-w-3xl mx-auto flex items-start gap-4">
          <span className="size-10 rounded-2xl bg-marketing-sage-soft border border-marketing-sage-line text-marketing-sage flex items-center justify-center shrink-0">
            <Bell className="size-5" />
          </span>
          <div>
            <h3 className="text-marketing-ink" style={{ ...serif, fontSize: "1.35rem" }}>
              {t("marketing.install.notifTitle")}
            </h3>
            <p className="text-marketing-muted leading-[1.75] mt-2">
              {t("marketing.install.notifBody")}
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-8 py-20 md:py-24">
        <div className="max-w-2xl mx-auto text-center space-y-5">
          <h2 className="tracking-tight text-marketing-ink" style={{ ...serif, fontSize: "clamp(1.5rem, 3vw, 2.25rem)", lineHeight: 1.1 }}>
            {t("marketing.install.readyTitle")}
          </h2>
          <p className="text-marketing-muted leading-[1.7]">
            {t("marketing.install.readyBody")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-3">
            <Link
              to="/auth/signup"
              className="inline-flex items-center justify-center rounded-full bg-marketing-sage text-marketing-bg font-semibold px-7 py-3.5 shadow-sm hover:brightness-[1.08] transition-all"
            >
              {t("marketing.hero.ctaCreate")}
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full bg-marketing-bg border border-marketing-line text-marketing-ink font-semibold px-7 py-3.5 hover:border-marketing-sage hover:text-marketing-sage transition-colors"
            >
              {t("marketing.install.backHome")}
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}

function Step({ n, icon, title, body }: { n: number; icon: React.ReactNode; title: string; body: string }) {
  return (
    <li className="rounded-2xl border border-marketing-line bg-marketing-bg p-6 md:p-7 flex gap-5 shadow-sm">
      <div className="shrink-0 flex flex-col items-center gap-2">
        <span
          className="size-10 rounded-full flex items-center justify-center font-bold text-marketing-bg"
          style={{ background: "var(--primary)" }}
        >
          {n}
        </span>
        <span className="text-marketing-muted">{icon}</span>
      </div>
      <div className="min-w-0">
        <h3 className="text-marketing-ink mb-1.5" style={{ ...serif, fontSize: "1.15rem" }}>
          {title}
        </h3>
        <p className="text-marketing-muted leading-[1.7] text-[0.98rem]">{body}</p>
      </div>
    </li>
  );
}

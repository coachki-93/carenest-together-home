import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Heart, CalendarDays, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/carenest/Logo";
import { LanguageToggle } from "@/components/carenest/LanguageToggle";

export const Route = createFileRoute("/auth")({
  component: AuthLayout,
});

function AuthLayout() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-muted/30 lg:p-6">
      <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col overflow-hidden bg-background lg:min-h-[calc(100vh-3rem)] lg:rounded-3xl lg:shadow-sm lg:flex-row">
        {/* Left: form column */}
        <div className="flex w-full flex-col lg:w-[46%] lg:max-w-[560px]">
          <header className="flex items-center justify-end px-6 pt-6 lg:px-10 lg:pt-8">
            <LanguageToggle />
          </header>
          <main className="flex flex-1 items-center justify-center px-6 py-10 lg:px-10">
            <div className="w-full max-w-md">
              <Outlet />
            </div>
          </main>
        </div>

        {/* Right: showcase */}
        <aside className="relative hidden overflow-hidden lg:flex lg:flex-1 lg:m-3 lg:ml-0 lg:rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-[oklch(0.42_0.22_285)]" />
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 15%, rgba(255,255,255,0.35), transparent 45%), radial-gradient(circle at 80% 85%, rgba(255,255,255,0.2), transparent 50%)",
            }}
          />
          {/* Decorative ribbons */}
          <div aria-hidden="true" className="absolute -right-32 -top-32 size-[520px] rounded-full border border-white/10" />
          <div aria-hidden="true" className="absolute -right-10 top-40 size-[360px] rounded-full border border-white/10" />
          <div aria-hidden="true" className="absolute -bottom-40 -left-20 size-[460px] rounded-full border border-white/10" />

          <div className="relative z-10 flex w-full flex-col justify-between p-12 text-white">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur">
              <Heart className="size-3.5 fill-white" />
              {t("auth.showcaseTag")}
            </span>

            {/* Floating feature cards */}
            <div className="relative my-12 h-[300px]">
              <FeatureCard
                className="absolute left-0 top-0 w-[78%] rotate-[-2deg]"
                icon={<Heart className="size-5 text-primary" />}
                title={t("auth.showcaseFeat1Title")}
                body={t("auth.showcaseFeat1Body")}
              />
              <FeatureCard
                className="absolute right-0 top-24 w-[78%] rotate-[2deg]"
                icon={<CalendarDays className="size-5 text-primary" />}
                title={t("auth.showcaseFeat2Title")}
                body={t("auth.showcaseFeat2Body")}
              />
              <FeatureCard
                className="absolute bottom-0 left-6 w-[78%] rotate-[-1deg]"
                icon={<ShieldCheck className="size-5 text-primary" />}
                title={t("auth.showcaseFeat3Title")}
                body={t("auth.showcaseFeat3Body")}
              />
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-extrabold leading-tight lg:text-4xl">
                {t("auth.showcaseHeading")}
              </h2>
              <p className="max-w-md text-base text-white/85">{t("auth.showcaseSub")}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function FeatureCard({
  className,
  icon,
  title,
  body,
}: {
  className?: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div
      className={
        "rounded-2xl bg-white/95 p-4 text-foreground shadow-xl ring-1 ring-black/5 backdrop-blur " +
        (className ?? "")
      }
    >
      <div className="flex items-start gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-primary/10">{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{title}</p>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{body}</p>
        </div>
      </div>
    </div>
  );
}

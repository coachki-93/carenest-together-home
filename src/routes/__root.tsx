import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import appleTouchIcon from "@/assets/apple-touch-icon.png.asset.json";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { createIsomorphicFn } from "@tanstack/react-start";
import {
  resolveClientLanguage,
  detectClientLanguage,
  setI18nLanguage,
} from "@/lib/i18n";
import { writeLangCookieClient, type Lang } from "@/lib/i18n/cookie";
import { resolveLanguageServer } from "@/lib/i18n/resolve.server";
import { useTranslation } from "react-i18next";

const resolveLanguageIso = createIsomorphicFn()
  .client((): Lang => resolveClientLanguage())
  .server((): Lang => resolveLanguageServer());

function NotFoundComponent() {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="card-soft max-w-md w-full text-center p-8 md:p-10">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {t("notFound.kicker")}
        </p>
        <h1 className="mt-2 text-7xl font-extrabold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">{t("notFound.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("notFound.body")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t("notFound.goDashboard")}
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full border border-input bg-card px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t("notFound.goHome")}
          </Link>
        </div>
      </div>
    </main>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const { t } = useTranslation();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card-soft max-w-md text-center p-10">
        <h1 className="text-xl font-semibold tracking-tight">{t("error.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("error.body")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {t("error.tryAgain")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-input bg-card px-5 py-2.5 text-sm font-semibold hover:bg-accent"
          >
            {t("error.goHome")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // beforeLoad runs on both server and client BEFORE the route renders.
  // We resolve the user's language here so SSR + first client paint match.
  // Awaiting changeLanguage ensures i18n is ready before any t() calls.
  beforeLoad: async () => {
    const lang: Lang = resolveLanguageIso();
    await setI18nLanguage(lang);
    return { lang };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#6C63FF" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "CareNest" },
      { title: "CareNest" },
      {
        name: "description",
        content:
          "CareNest helps families coordinate care for medically complex children with their caregivers — warm, calm, and built for the tablet.",
      },
      { name: "author", content: "CareNest" },
      { property: "og:title", content: "CareNest" },
      {
        property: "og:description",
        content: "A care coordination space for families and the caregivers who support them.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "CareNest" },
      { name: "description", content: "CareNest Connect is a web app for coordinating care for medically complex children." },
      { property: "og:description", content: "CareNest Connect is a web app for coordinating care for medically complex children." },
      { name: "twitter:description", content: "CareNest Connect is a web app for coordinating care for medically complex children." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/cBl2WZ7i79QvY3RvzaEMrSXg8Q12/social-images/social-1781400597271-CARE.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/cBl2WZ7i79QvY3RvzaEMrSXg8Q12/social-images/social-1781400597271-CARE.webp" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: appleTouchIcon.url },
      { rel: "apple-touch-icon", sizes: "180x180", href: appleTouchIcon.url },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const { lang } = Route.useRouteContext();
  return (
    <html lang={lang}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient, lang } = Route.useRouteContext();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    // After hydration, check if the user has a different language
    // preference in localStorage or navigator that we should honour.
    const detected = detectClientLanguage();
    if (detected && detected !== lang) {
      writeLangCookieClient(detected);
      void setI18nLanguage(detected);
    }
  }, [lang]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}

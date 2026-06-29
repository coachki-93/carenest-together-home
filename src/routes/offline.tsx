import { useEffect, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { WifiOff, RefreshCw, Home } from "lucide-react";

export const Route = createFileRoute("/offline")({
  head: () => ({ meta: [{ title: "Offline — CareNest" }] }),
  component: OfflinePage,
});

function OfflinePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="card-soft max-w-md w-full text-center p-8 md:p-10">
        <div className="mx-auto size-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
          <WifiOff className="size-8" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight">
          {t("offline.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {online ? t("offline.reconnected") : t("offline.body")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => router.invalidate()}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            {t("offline.retry")}
          </button>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-input bg-card px-5 py-2.5 text-sm font-semibold hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Home className="size-4" aria-hidden="true" />
            {t("offline.goHome")}
          </Link>
        </div>
      </div>
    </main>
  );
}

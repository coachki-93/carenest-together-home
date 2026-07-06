import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/carenest/Logo";
import { LanguageToggle } from "@/components/carenest/LanguageToggle";

export function MarketingHeader() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-colors ${
        scrolled
          ? "bg-marketing-bg/85 backdrop-blur-md border-b border-marketing-line"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-3 flex items-center justify-between gap-3">
        <Link
          to="/"
          className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketing-sage rounded-full"
        >
          <Logo size={32} />
          <span
            className="text-xl tracking-tight text-marketing-ink"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            CareNest
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-marketing-muted">
          <Link
            to="/features"
            className="hover:text-marketing-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketing-sage rounded-md"
            activeProps={{ className: "text-marketing-ink" }}
          >
            {t("marketing.nav.features")}
          </Link>
          <a
            href="#pricing"
            className="hover:text-marketing-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketing-sage rounded-md"
          >
            {t("marketing.nav.pricing")}
          </a>
          <a
            href="#faq"
            className="hover:text-marketing-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketing-sage rounded-md"
          >
            {t("marketing.nav.faq")}
          </a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageToggle compact />
          <Link
            to="/auth/login"
            className="hidden sm:inline-block text-sm text-marketing-muted hover:text-marketing-ink transition-colors px-2"
          >
            {t("splash.login")}
          </Link>
          <Link
            to="/auth/signup"
            className="inline-flex items-center rounded-full bg-marketing-sage px-4 sm:px-5 py-2 sm:py-2.5 text-sm font-medium text-marketing-bg hover:brightness-[1.08] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-marketing-sage shadow-sm"
          >
            {t("splash.getStarted")}
          </Link>
        </div>
      </div>
    </header>
  );
}

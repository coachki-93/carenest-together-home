import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/carenest/Logo";
import { LanguageToggle } from "@/components/carenest/LanguageToggle";

export function MarketingHeader() {
  const { t } = useTranslation();
  return (
    <header className="w-full">
      <div className="max-w-6xl mx-auto px-6 md:px-8 pt-7 pb-2 flex items-center justify-between gap-3">
        <Link
          to="/"
          className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketing-sage rounded-full"
        >
          <Logo size={36} />
          <span
            className="text-2xl tracking-tight text-marketing-ink"
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
            href="#faq"
            className="hover:text-marketing-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketing-sage rounded-md"
          >
            {t("marketing.nav.faq")}
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <LanguageToggle />
          <Link
            to="/auth/login"
            className="hidden sm:inline-block text-sm text-marketing-muted hover:text-marketing-ink transition-colors"
          >
            {t("splash.login")}
          </Link>
          <Link
            to="/auth/signup"
            className="inline-flex items-center rounded-full bg-marketing-ink px-5 py-2.5 text-sm font-medium text-marketing-bg hover:bg-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-marketing-sage"
          >
            {t("splash.getStarted")}
          </Link>
        </div>
      </div>
    </header>
  );
}

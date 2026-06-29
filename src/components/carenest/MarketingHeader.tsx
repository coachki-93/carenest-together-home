import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/carenest/Logo";
import { LanguageToggle } from "@/components/carenest/LanguageToggle";
import { Button } from "@/components/ui/button";

export function MarketingHeader() {
  const { t } = useTranslation();
  return (
    <header className="px-6 md:px-8 pt-6 md:pt-8 flex items-center justify-between gap-3">
      <Link to="/" className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full">
        <Logo size={40} />
      </Link>
      <nav className="hidden md:flex items-center gap-1 text-sm font-semibold">
        <Link
          to="/features"
          className="px-3 py-2 rounded-full text-foreground/80 hover:text-foreground hover:bg-lavender transition-colors"
          activeProps={{ className: "text-primary" }}
        >
          {t("marketing.nav.features")}
        </Link>
        <a
          href="#faq"
          className="px-3 py-2 rounded-full text-foreground/80 hover:text-foreground hover:bg-lavender transition-colors"
        >
          {t("marketing.nav.faq")}
        </a>
      </nav>
      <div className="flex items-center gap-2">
        <LanguageToggle />
        <Button asChild variant="ghost" className="rounded-full hidden sm:inline-flex">
          <Link to="/auth/login">{t("splash.login")}</Link>
        </Button>
        <Button asChild className="rounded-full px-5">
          <Link to="/auth/signup">{t("splash.getStarted")}</Link>
        </Button>
      </div>
    </header>
  );
}

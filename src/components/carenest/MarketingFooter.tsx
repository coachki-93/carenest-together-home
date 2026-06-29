import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/carenest/Logo";

export function MarketingFooter() {
  const { t } = useTranslation();
  return (
    <footer className="mt-20 border-t border-border/60 bg-card/40">
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-10 grid gap-6 md:grid-cols-3 items-start">
        <div className="space-y-2">
          <Logo size={36} />
          <p className="text-sm text-muted-foreground max-w-xs">
            {t("marketing.footer.tagline")}
          </p>
        </div>
        <div className="text-sm">
          <h4 className="font-bold mb-2">{t("marketing.footer.product")}</h4>
          <ul className="space-y-1.5 text-muted-foreground">
            <li><Link to="/features" className="hover:text-foreground">{t("marketing.nav.features")}</Link></li>
            <li><Link to="/auth/signup" className="hover:text-foreground">{t("splash.ctaCreate")}</Link></li>
            <li><Link to="/invite" className="hover:text-foreground">{t("splash.ctaInvite")}</Link></li>
            <li><Link to="/auth/login" className="hover:text-foreground">{t("splash.login")}</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <h4 className="font-bold mb-2">{t("marketing.footer.about")}</h4>
          <p className="text-muted-foreground">{t("marketing.footer.disclaimer")}</p>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} CareNest
      </div>
    </footer>
  );
}

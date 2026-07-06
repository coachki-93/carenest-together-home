import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/carenest/Logo";

export function MarketingFooter() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-marketing-line bg-marketing-bg">
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-14 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr] items-start">
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <Logo size={32} />
            <span
              className="text-xl tracking-tight text-marketing-ink"
              style={{ fontFamily: "var(--font-display)", fontWeight: 800, letterSpacing: "-0.02em" }}
            >
              CareNest
            </span>
          </div>
          <p className="text-sm text-marketing-muted max-w-sm leading-relaxed">
            {t("marketing.footer.tagline")}
          </p>
          <p className="text-xs text-marketing-muted italic">
            {t("marketing.footer.trustLine")}
          </p>
        </div>

        <div className="text-sm">
          <h4 className="text-xs uppercase tracking-[0.18em] text-marketing-muted/80 mb-4">
            {t("marketing.footer.product")}
          </h4>
          <ul className="space-y-2.5 text-marketing-ink">
            <li><Link to="/features" className="hover:text-marketing-sage transition-colors">{t("marketing.nav.features")}</Link></li>
            <li><a href="#pricing" className="hover:text-marketing-sage transition-colors">{t("marketing.nav.pricing")}</a></li>
            <li><a href="#faq" className="hover:text-marketing-sage transition-colors">{t("marketing.nav.faq")}</a></li>
          </ul>
        </div>

        <div className="text-sm">
          <h4 className="text-xs uppercase tracking-[0.18em] text-marketing-muted/80 mb-4">
            {t("marketing.footer.families")}
          </h4>
          <ul className="space-y-2.5 text-marketing-ink">
            <li><Link to="/auth/signup" className="hover:text-marketing-sage transition-colors">{t("splash.ctaCreate")}</Link></li>
            <li><Link to="/invite" className="hover:text-marketing-sage transition-colors">{t("splash.ctaInvite")}</Link></li>
            <li><Link to="/auth/login" className="hover:text-marketing-sage transition-colors">{t("splash.login")}</Link></li>
          </ul>
        </div>

        <div className="text-sm">
          <h4 className="text-xs uppercase tracking-[0.18em] text-marketing-muted/80 mb-4">
            {t("marketing.footer.about")}
          </h4>
          <p className="text-marketing-muted leading-relaxed text-xs">
            {t("marketing.footer.disclaimer")}
          </p>
        </div>
      </div>
      <div className="border-t border-marketing-line">
        <div className="max-w-6xl mx-auto px-6 md:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-marketing-muted">
          <p>© {new Date().getFullYear()} CareNest</p>
          <p className="italic">
            {t("marketing.footer.tagline")}
          </p>
        </div>
      </div>
    </footer>
  );
}

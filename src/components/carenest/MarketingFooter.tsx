import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/carenest/Logo";

const CONTACT_EMAIL = "hello@carenest.app";

const display = { fontFamily: "var(--font-display)", fontWeight: 600 } as const;

export function MarketingFooter() {
  const { t } = useTranslation();
  return (
    <footer
      className="mk-footer-panel relative overflow-hidden"
      role="contentinfo"
    >
      {/* Soft violet aurora behind the columns */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0"
        style={{
          background:
            "radial-gradient(50rem 20rem at 15% 0%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 65%), radial-gradient(45rem 18rem at 85% 100%, color-mix(in oklab, var(--primary) 10%, transparent), transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8 pt-16 pb-10">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          {/* Brand column */}
          <div className="space-y-5">
            <div className="flex items-center gap-2.5">
              <Logo size={32} />
              <span
                className="text-xl tracking-tight text-marketing-ink"
                style={{ ...display, letterSpacing: "-0.02em" }}
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
            <p className="text-xs text-marketing-muted">
              {t("marketing.footer.dataPrivacy")}
            </p>
          </div>

          {/* Product */}
          <FooterCol title={t("marketing.footer.product")}>
            <FooterLink to="/features">{t("marketing.nav.features")}</FooterLink>
            <FooterHash href="/#pricing">{t("marketing.nav.pricing")}</FooterHash>
            <FooterHash href="/#faq">{t("marketing.nav.faq")}</FooterHash>
            <FooterLink to="/install">{t("marketing.footer.install")}</FooterLink>
          </FooterCol>

          {/* Families */}
          <FooterCol title={t("marketing.footer.families")}>
            <FooterLink to="/auth/signup">{t("splash.ctaCreate")}</FooterLink>
            <FooterLink to="/invite">{t("splash.ctaInvite")}</FooterLink>
            <FooterLink to="/auth/login">{t("splash.login")}</FooterLink>
          </FooterCol>

          {/* About */}
          <FooterCol title={t("marketing.footer.about")}>
            <FooterLink to="/about">{t("marketing.nav.about")}</FooterLink>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="block text-sm text-marketing-ink/85 hover:text-marketing-sage transition-colors"
            >
              {t("marketing.footer.contact")}
            </a>
            <p className="mt-3 text-xs text-marketing-muted leading-relaxed">
              {t("marketing.footer.disclaimer")}
            </p>
          </FooterCol>
        </div>

        {/* Legal bar */}
        <div className="mt-14 pt-6 border-t border-marketing-line/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-marketing-muted">
          <p>© {new Date().getFullYear()} CareNest</p>
          <p className="italic">{t("marketing.footer.tagline")}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="mb-4 text-xs uppercase tracking-[0.2em] text-marketing-sage/85 font-semibold">
        {title}
      </h4>
      <nav className="space-y-2.5 text-sm">{children}</nav>
    </div>
  );
}

function FooterLink({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="block text-marketing-ink/85 hover:text-marketing-sage transition-colors"
    >
      {children}
    </Link>
  );
}

function FooterHash({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="block text-marketing-ink/85 hover:text-marketing-sage transition-colors"
    >
      {children}
    </a>
  );
}

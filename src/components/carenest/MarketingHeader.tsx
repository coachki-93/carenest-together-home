import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/carenest/LanguageToggle";
import { cn } from "@/lib/utils";


export function MarketingHeader() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      role="banner"
    >
      <div
        className={cn(
          "container mx-auto max-w-6xl px-3 md:px-6 transition-all duration-300",
          scrolled ? "pt-2 md:pt-3" : "pt-4",
        )}
      >
        <div className="flex items-center justify-center w-full">
          {/* Liquid glass pill */}
          <div
            className={cn(
              "flex items-center justify-between gap-3 md:gap-5 w-full md:w-auto rounded-full overflow-visible",
              "transition-[background-color,box-shadow,padding,transform] duration-200 ease-out",
              scrolled
                ? "px-3 py-1.5 md:px-4 md:py-2 scale-[0.99] md:scale-100"
                : "px-4 py-2 md:px-5 md:py-2.5",
            )}
            style={{
              backgroundColor: scrolled
                ? "rgba(255,255,255,0.70)"
                : "rgba(255,255,255,0.50)",
              WebkitBackdropFilter: "blur(20px) saturate(1.5)",
              backdropFilter: "blur(20px) saturate(1.5)",
              border: "1px solid rgba(255,255,255,0.6)",
              boxShadow: scrolled
                ? "0 12px 40px -18px color-mix(in oklab, var(--primary) 40%, transparent), 0 2px 8px -4px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.7)"
                : "0 8px 30px -20px color-mix(in oklab, var(--primary) 30%, transparent), inset 0 1px 0 rgba(255,255,255,0.6)",
            }}
          >
            {/* Logo (left) */}
            <Link
              to="/"
              className="flex items-center hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full -my-1"
              aria-label="CareNest"
            >
              <img
                src="/carenest-logo-nav.png"
                alt="CareNest"
                width={215}
                height={96}
                className="h-9 w-auto select-none"
                draggable={false}
              />
            </Link>

            {/* Divider */}
            <div
              className="hidden md:block h-5 w-px bg-marketing-line"
              aria-hidden="true"
            />

            {/* Middle nav */}
            <nav
              className="hidden md:flex items-center gap-1"
              aria-label="Main navigation"
            >
              <Link
                to="/features"
                className="px-3 py-1.5 text-sm font-medium text-marketing-muted hover:text-marketing-ink hover:bg-primary/10 rounded-full transition-all"
              >
                {t("marketing.nav.features")}
              </Link>
              <a
                href="/#pricing"
                className="px-3 py-1.5 text-sm font-medium text-marketing-muted hover:text-marketing-ink hover:bg-primary/10 rounded-full transition-all"
              >
                {t("marketing.nav.pricing")}
              </a>
              <a
                href="/#faq"
                className="px-3 py-1.5 text-sm font-medium text-marketing-muted hover:text-marketing-ink hover:bg-primary/10 rounded-full transition-all"
              >
                {t("marketing.nav.faq")}
              </a>
              <Link
                to="/about"
                className="px-3 py-1.5 text-sm font-medium text-marketing-muted hover:text-marketing-ink hover:bg-primary/10 rounded-full transition-all"
              >
                {t("marketing.nav.about")}
              </Link>
            </nav>

            {/* Divider */}
            <div
              className="hidden md:block h-5 w-px bg-marketing-line"
              aria-hidden="true"
            />

            {/* Right actions */}
            <div className="hidden md:flex items-center gap-2">
              <LanguageToggle compact />
              <Link
                to="/auth/login"
                className="text-sm rounded-full h-8 px-3 inline-flex items-center text-marketing-muted hover:text-marketing-ink hover:bg-primary/10 transition-colors"
              >
                {t("splash.login")}
              </Link>
              <Link
                to="/auth/signup"
                className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-[1.08] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary shadow-sm"
              >
                {t("splash.getStarted")}
              </Link>
            </div>

            {/* Mobile */}
            <div className="md:hidden flex items-center gap-1">
              <LanguageToggle compact />
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-marketing-ink hover:bg-primary/10 rounded-full h-9 w-9"
                    aria-label="Open menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-[85vw] max-w-[340px] bg-marketing-bg border-l border-marketing-line pt-14 px-6"
                >
                  <nav className="flex flex-col gap-3 mt-2" aria-label="Mobile navigation">
                    <Link
                      to="/features"
                      onClick={() => setMobileOpen(false)}
                      className="text-base font-medium text-marketing-ink hover:text-primary transition-colors"
                    >
                      {t("marketing.nav.features")}
                    </Link>
                    <a
                      href="/#pricing"
                      onClick={() => setMobileOpen(false)}
                      className="text-base font-medium text-marketing-ink hover:text-primary transition-colors"
                    >
                      {t("marketing.nav.pricing")}
                    </a>
                    <a
                      href="/#faq"
                      onClick={() => setMobileOpen(false)}
                      className="text-base font-medium text-marketing-ink hover:text-primary transition-colors"
                    >
                      {t("marketing.nav.faq")}
                    </a>
                    <Link
                      to="/about"
                      onClick={() => setMobileOpen(false)}
                      className="text-base font-medium text-marketing-ink hover:text-primary transition-colors"
                    >
                      {t("marketing.nav.about")}
                    </Link>
                    <Link
                      to="/install"
                      onClick={() => setMobileOpen(false)}
                      className="text-base font-medium text-marketing-ink hover:text-primary transition-colors"
                    >
                      {t("marketing.nav.install")}
                    </Link>
                    <div className="border-t border-marketing-line my-3" />
                    <Link
                      to="/auth/login"
                      onClick={() => setMobileOpen(false)}
                      className="inline-flex items-center justify-center rounded-full border border-marketing-line bg-marketing-surface px-4 py-2.5 text-sm font-semibold text-marketing-ink"
                    >
                      {t("splash.login")}
                    </Link>
                    <Link
                      to="/auth/signup"
                      onClick={() => setMobileOpen(false)}
                      className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm"
                    >
                      {t("splash.getStarted")}
                    </Link>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

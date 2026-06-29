import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { LanguageToggle } from "./LanguageToggle";
import { ProfileSelector } from "./ProfileSelector";
import { HospitalToggle } from "./HospitalToggle";

interface DashboardLayoutProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function DashboardLayout({ title, subtitle, actions, children }: DashboardLayoutProps) {
  const { t } = useTranslation();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-transparent">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-10 backdrop-blur-md bg-background/70 border-b border-border/60 safe-pt">
            <div className="flex items-center justify-between gap-2 px-3 md:px-8 py-2 md:py-3">
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <SidebarTrigger className="rounded-full tap" />
                <div className="min-w-0">
                  <h1 className="text-base md:text-2xl font-extrabold tracking-tight truncate">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="hidden md:block text-sm text-muted-foreground truncate">{subtitle}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 md:gap-2 shrink-0">
                {actions}
                <Link
                  to="/emergency"
                  aria-label={t("emergency.title")}
                  title={t("emergency.title")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-400 bg-red-50 text-red-900 px-3 py-1.5 text-sm font-bold hover:bg-red-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                >
                  <AlertTriangle className="size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{t("emergency.open")}</span>
                </Link>
                <HospitalToggle />
                <div className="hidden md:flex items-center gap-2">
                  <LanguageToggle />
                </div>
                <ProfileSelector />
              </div>
            </div>
          </header>
          <main className="flex-1 px-3 md:px-8 py-4 md:py-8 safe-pb">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

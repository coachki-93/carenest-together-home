import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LogOut, ShieldAlert } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { LanguageToggle } from "./LanguageToggle";
import { Button } from "@/components/ui/button";
import { useMyMembership, useSession } from "@/lib/auth/use-profile";
import { supabase } from "@/integrations/supabase/client";

interface AdminLayoutProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AdminLayout({ title, subtitle, actions, children }: AdminLayoutProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const membership = useMyMembership();
  const { user } = useSession();
  const hasFamily = !!membership.data;

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth/login", replace: true });
  }

  return (
    <SidebarProvider>
      <div className="min-h-dvh flex w-full bg-amber-50/30">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-10 backdrop-blur-md bg-amber-50/80 border-b-2 border-amber-300 safe-pt">
            {/* Top utility bar: identity + language + sign out */}
            <div className="flex items-center justify-between gap-2 px-3 md:px-8 py-1.5 border-b border-amber-200/70">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldAlert className="size-3.5 text-amber-800 shrink-0" aria-hidden />
                <span className="text-xs font-semibold text-amber-900 truncate">
                  {user?.email ?? "—"}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <LanguageToggle compact />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="rounded-full text-amber-900 hover:bg-amber-100 gap-1.5 h-8"
                >
                  <LogOut className="size-4" aria-hidden />
                  <span className="hidden sm:inline text-xs font-semibold">
                    {t("common.signOut")}
                  </span>
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 px-3 md:px-8 py-2 md:py-3">
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <SidebarTrigger className="rounded-full tap" />
                <div className="min-w-0">
                  <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-amber-800">
                    {t("admin.consoleTitle")}
                  </p>
                  <h1 className="text-base md:text-2xl font-extrabold tracking-tight truncate text-amber-950">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="hidden md:block text-sm text-amber-900/70 truncate">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 md:gap-2 shrink-0">
                {actions}
                {hasFamily && (
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-1.5 rounded-full border border-amber-400 bg-white text-amber-900 px-3 py-1.5 text-sm font-bold hover:bg-amber-100 transition-colors"
                  >
                    <LogOut className="size-4" aria-hidden />
                    <span className="hidden sm:inline">{t("admin.exit")}</span>
                  </Link>
                )}
              </div>
            </div>
          </header>
          <main className="flex-1 px-3 md:px-8 py-4 md:py-8 safe-pb">
            <div
              role="alert"
              className="mb-6 rounded-2xl border-2 border-amber-400 bg-amber-50 text-amber-950 p-4 flex items-start gap-3"
            >
              <ShieldAlert className="size-5 shrink-0 mt-0.5" aria-hidden />
              <div className="text-sm">
                <p className="font-bold">{t("admin.banner.title")}</p>
                <p>{t("admin.banner.body")}</p>
              </div>
            </div>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

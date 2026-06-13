import type { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { LanguageToggle } from "./LanguageToggle";
import { ProfileSelector } from "./ProfileSelector";

interface DashboardLayoutProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function DashboardLayout({ title, subtitle, actions, children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-transparent">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-10 backdrop-blur-md bg-background/70 border-b border-border/60">
            <div className="flex items-center justify-between gap-3 px-4 md:px-8 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <SidebarTrigger className="rounded-full" />
                <div className="min-w-0">
                  <h1 className="text-xl md:text-2xl font-extrabold tracking-tight truncate">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {actions}
                <LanguageToggle />
                <ProfileSelector />
              </div>
            </div>
          </header>
          <main className="flex-1 px-4 md:px-8 py-6 md:py-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

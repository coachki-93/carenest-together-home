import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Users2,
  UserCircle2,
  LogOut,
  ShieldAlert,
  Ticket,
  Bug,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { LanguageToggle } from "./LanguageToggle";
import { useMyMembership } from "@/lib/auth/use-profile";

// Future admin sections slot in here when their features ship:
// - Analytics → when the analytics integration is wired
// - Revenue → when billing is implemented
// No placeholder items — we don't advertise features that don't exist.

export function AdminSidebar() {
  const { t } = useTranslation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const search = useRouterState({ select: (s) => s.location.search }) as {
    tab?: string;
  };
  const activeTab: "accounts" | "families" | "coupons" | "bugs" =
    search.tab === "families" ||
    search.tab === "coupons" ||
    search.tab === "bugs"
      ? search.tab
      : "accounts";
  const membership = useMyMembership();
  const hasFamily = !!membership.data;
  const navigate = useNavigate();

  const items = [
    {
      key: "accounts",
      title: t("admin.nav.accounts"),
      icon: UserCircle2,
      tab: "accounts" as const,
    },
    {
      key: "families",
      title: t("admin.nav.families"),
      icon: Users2,
      tab: "families" as const,
    },
    {
      key: "coupons",
      title: t("admin.nav.coupons"),
      icon: Ticket,
      tab: "coupons" as const,
    },
    {
      key: "bugs",
      title: t("admin.nav.bugs"),
      icon: Bug,
      tab: "bugs" as const,
    },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-amber-300/50">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <ShieldAlert className="size-5" aria-hidden />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
                {t("admin.consoleTitle")}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {t("admin.navLabel")}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel>{t("admin.nav.sections")}</SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    asChild
                    isActive={activeTab === item.tab}
                    className="rounded-xl h-11"
                    tooltip={item.title}
                  >
                    <Link
                      to="/admin"
                      search={{ tab: item.tab }}
                      className="flex items-center gap-3"
                    >
                      <item.icon className="size-5" />
                      {!collapsed && (
                        <span className="font-semibold">{item.title}</span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-3 py-3 safe-pb space-y-2 border-t border-amber-300/50">
        {hasFamily && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="rounded-xl h-11"
                tooltip={t("admin.exit")}
                onClick={() => navigate({ to: "/dashboard" })}
              >
                <LogOut className="size-5" />
                {!collapsed && (
                  <span className="font-semibold">{t("admin.exit")}</span>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        {!collapsed && <LanguageToggle />}
      </SidebarFooter>
    </Sidebar>
  );
}

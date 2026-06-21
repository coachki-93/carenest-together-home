import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  CalendarClock,
  Pill,
  Activity,
  ClipboardList,
  Baby,
  Users,
  CalendarDays,
  Settings,
  Wind,
  BookOpen,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "./Logo";

export function AppSidebar() {
  const { t } = useTranslation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = [
    { title: t("nav.dashboard"), url: "/dashboard", icon: LayoutDashboard },
    { title: t("nav.schedule"), url: "/schedule", icon: CalendarClock },
    { title: t("nav.medications"), url: "/medications", icon: Pill },
    { title: t("nav.vitals"), url: "/vitals", icon: Activity },
    { title: t("nav.oxygen"), url: "/oxygen", icon: Wind },
    { title: t("nav.handover"), url: "/handover", icon: ClipboardList },
    { title: t("nav.instructions"), url: "/instructions", icon: BookOpen },
  ];

  const family = [
    { title: t("nav.child"), url: "/child", icon: Baby },
    { title: t("nav.caregivers"), url: "/caregivers", icon: Users },
    { title: t("nav.shifts"), url: "/shifts", icon: CalendarDays },
    { title: t("nav.settings"), url: "/settings", icon: Settings },
  ];

  const isActive = (url: string) =>
    pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="px-3 py-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <Logo size={32} />
          {!collapsed && (
            <span className="font-extrabold text-lg tracking-tight">CareNest</span>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent data-tour="sidebar">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>{t("nav.care")}</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="rounded-xl h-11"
                    tooltip={item.title}
                  >
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className="size-5" />
                      {!collapsed && <span className="font-semibold">{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>{t("nav.family")}</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {family.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="rounded-xl h-11"
                    tooltip={item.title}
                  >
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className="size-5" />
                      {!collapsed && <span className="font-semibold">{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

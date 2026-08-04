import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  CalendarClock,
  CalendarHeart,
  Pill,
  Activity,
  ActivitySquare,
  ClipboardList,
  Baby,
  Users,
  CalendarDays,
  Settings,
  Wind,
  BookOpen,
  Boxes,
  ShoppingCart,
  AlertTriangle,
  Wrench,
  CreditCard,
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
import { Logo } from "./Logo";
import { LanguageToggle } from "./LanguageToggle";
import { HospitalToggle } from "./HospitalToggle";
import { useMyMembership } from "@/lib/auth/use-profile";
import { useFamily } from "@/lib/data/family";




export function AppSidebar() {
  const { t } = useTranslation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const membership = useMyMembership();
  const { data: familyRow } = useFamily(membership.data?.family_id);

  // Undefined (loading) → treat as visible to avoid a flash-out.
  const showMaintenance = familyRow?.uses_equipment !== false;


  const items = [
    { title: t("nav.dashboard"), url: "/dashboard", icon: LayoutDashboard },
    { title: t("nav.schedule"), url: "/schedule", icon: CalendarClock },
    { title: t("nav.appointments"), url: "/appointments", icon: CalendarHeart },
    { title: t("nav.medications"), url: "/medications", icon: Pill },
    { title: t("nav.vitals"), url: "/vitals", icon: Activity },
    { title: t("nav.events"), url: "/events", icon: ActivitySquare },
    { title: t("nav.oxygen"), url: "/oxygen", icon: Wind },
    { title: t("nav.handover"), url: "/handover", icon: ClipboardList },
    { title: t("nav.instructions"), url: "/instructions", icon: BookOpen },
    { title: t("nav.inventory"), url: "/inventory", icon: Boxes },
    ...(showMaintenance
      ? [{ title: t("nav.maintenance"), url: "/maintenance", icon: Wrench }]
      : []),
    { title: t("nav.shopping"), url: "/shopping", icon: ShoppingCart },
    { title: t("nav.emergency"), url: "/emergency", icon: AlertTriangle },
  ];

  const caregiversGroup = [
    { title: t("nav.caregivers"), url: "/caregivers", icon: Users },
    { title: t("nav.shifts"), url: "/shifts", icon: CalendarDays },
  ];

  const family = [
    { title: t("nav.child"), url: "/child", icon: Baby },
  ];

  const isOwner = membership.data?.role === "owner";
  const settingsItem = { title: t("nav.settings"), url: "/settings", icon: Settings };
  const billingItem = { title: t("nav.billing"), url: "/billing", icon: CreditCard };
  const guidebookItem = { title: t("nav.guidebook"), url: "/guidebook", icon: BookOpen };
  const reportBugItem = { title: t("nav.reportBug"), url: "/report-bug", icon: Bug };

  const isActive = (url: string) =>
    pathname === url || pathname.startsWith(url + "/");

  const renderMenu = (list: { title: string; url: string; icon: typeof Baby }[]) => (
    <SidebarMenu>
      {list.map((item) => (
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
  );

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="px-3 py-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <Logo size={collapsed ? 28 : 32} iconOnly={collapsed} />
        </Link>
      </SidebarHeader>
      <SidebarContent data-tour="sidebar">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>{t("nav.care")}</SidebarGroupLabel>}
          <SidebarGroupContent>{renderMenu(items)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>{t("nav.caregiversGroup")}</SidebarGroupLabel>}
          <SidebarGroupContent>{renderMenu(caregiversGroup)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>{t("nav.family")}</SidebarGroupLabel>}
          <SidebarGroupContent>{renderMenu(family)}</SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-3 py-3 safe-pb space-y-2 border-t">
        <SidebarMenu>
          {isOwner && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive(billingItem.url)}
                className="rounded-xl h-11"
                tooltip={billingItem.title}
              >
                <Link to={billingItem.url} className="flex items-center gap-3">
                  <billingItem.icon className="size-5" />
                  {!collapsed && <span className="font-semibold">{billingItem.title}</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive(guidebookItem.url)}
              className="rounded-xl h-11"
              tooltip={guidebookItem.title}
            >
              <Link to={guidebookItem.url} className="flex items-center gap-3">
                <guidebookItem.icon className="size-5" />
                {!collapsed && <span className="font-semibold">{guidebookItem.title}</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive(settingsItem.url)}
              className="rounded-xl h-11"
              tooltip={settingsItem.title}
            >
              <Link to={settingsItem.url} className="flex items-center gap-3">
                <settingsItem.icon className="size-5" />
                {!collapsed && <span className="font-semibold">{settingsItem.title}</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive(reportBugItem.url)}
              className="rounded-xl h-11"
              tooltip={reportBugItem.title}
            >
              <Link to={reportBugItem.url} className="flex items-center gap-3">
                <reportBugItem.icon className="size-5" />
                {!collapsed && <span className="font-semibold">{reportBugItem.title}</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!collapsed && (
          <>
            <HospitalToggle />
            <LanguageToggle />
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ChevronDown, LogOut, UserCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useProfile, useMyMembership, useSession } from "@/lib/auth/use-profile";
import { supabase } from "@/integrations/supabase/client";
import { ActiveProfileSwitcher } from "@/components/carenest/ActiveProfileSwitcher";

function initials(name?: string | null) {
  if (!name) return "•";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}

export function ProfileSelector() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: membership } = useMyMembership();

  const role =
    profile?.account_type === "family"
      ? t("profile.familyRole")
      : t("profile.caregiverRole");
  const color = profile?.avatar_color ?? membership?.display_color ?? "#6C63FF";

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth/login" });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 rounded-full pl-1 pr-3 py-1 hover:bg-accent transition-colors cursor-pointer">
          <Avatar className="size-9 border-2 border-card shadow-sm">
            <AvatarFallback
              className="text-sm font-bold text-white"
              style={{ backgroundColor: color }}
            >
              {initials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="text-left hidden md:block">
            <div className="text-sm font-bold leading-tight">
              {profile?.full_name?.split(" ")[0] ?? "—"}
            </div>
            <div className="text-xs text-muted-foreground leading-tight">{role}</div>
          </div>
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl">
        <DropdownMenuLabel className="font-semibold">
          {profile?.full_name}
          <div className="text-xs font-normal text-muted-foreground">{role}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="rounded-lg cursor-pointer"
          onClick={() => navigate({ to: "/settings" })}
        >
          <UserCircle className="size-4" />
          {t("profile.viewProfile")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="rounded-lg cursor-pointer text-destructive focus:text-destructive"
          onClick={signOut}
        >
          <LogOut className="size-4" />
          {t("common.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

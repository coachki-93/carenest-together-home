import { useTranslation } from "react-i18next";
import { ChevronDown, UserCircle2, Check, Plus } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActiveCaregiverProfile } from "@/lib/data/active-profile";

interface Props {
  familyId: string;
  userId: string;
}

/**
 * Lets a caregiver account choose which of their profiles is "acting" right now.
 * Used by header (ProfileSelector) and as the default for task completion.
 */
export function ActiveProfileSwitcher({ familyId, userId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profiles, activeProfile, setActive } = useActiveCaregiverProfile(
    familyId,
    userId,
  );

  if (profiles.length === 0) {
    return (
      <button
        type="button"
        onClick={() => navigate({ to: "/caregivers" })}
        className="flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 px-3 py-1 text-xs font-semibold hover:bg-amber-200/70 transition"
      >
        <Plus className="size-3.5" />
        {t("activeProfile.addFirst")}
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full bg-muted/60 hover:bg-muted px-3 py-1.5 text-xs font-semibold transition"
          aria-label={t("activeProfile.switch")}
        >
          {activeProfile ? (
            <>
              <span
                className="inline-block size-2.5 rounded-full"
                style={{ background: activeProfile.color }}
              />
              <span className="text-muted-foreground font-normal">
                {t("activeProfile.actingAs")}
              </span>
              <span className="font-bold">{activeProfile.name}</span>
            </>
          ) : (
            <>
              <UserCircle2 className="size-4" />
              {t("activeProfile.pick")}
            </>
          )}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl">
        <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
          {t("activeProfile.dropdownLabel")}
        </DropdownMenuLabel>
        {profiles.map((p) => (
          <DropdownMenuItem
            key={p.id}
            className="rounded-lg cursor-pointer gap-2"
            onClick={() => setActive(p.id)}
          >
            <span
              className="inline-block size-3 rounded-full"
              style={{ background: p.color }}
            />
            <span className="flex-1">{p.name}</span>
            {activeProfile?.id === p.id && <Check className="size-4 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="rounded-lg cursor-pointer"
          onClick={() => navigate({ to: "/caregivers" })}
        >
          <Plus className="size-4" />
          {t("activeProfile.manage")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

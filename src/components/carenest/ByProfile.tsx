import { useTranslation } from "react-i18next";
import { useCaregiverProfiles } from "@/lib/data/caregiver-profiles";
import { useFamilyMembers } from "@/lib/data/family";

interface Props {
  familyId: string | undefined | null;
  /** Linked caregiver profile id, if any. Preferred display source. */
  caregiverProfileId?: string | null;
  /** User who created/logged the row (account-level). Fallback when no profile. */
  authorUserId?: string | null;
  /** Current viewer's user id — to render "(you)" when applicable. */
  viewerUserId?: string | null;
  /** Optional label prefix, e.g. "Logged by". Defaults to "By". */
  label?: string;
  className?: string;
}

/**
 * Renders "by {profile name}" with a color dot, preferring the linked
 * caregiver profile and falling back to the account name (organisation).
 */
export function ByProfile({
  familyId,
  caregiverProfileId,
  authorUserId,
  viewerUserId,
  label,
  className,
}: Props) {
  const { t } = useTranslation();
  const { data: profiles } = useCaregiverProfiles(familyId);
  const { data: members } = useFamilyMembers(familyId);

  const prefix = label ?? t("byProfile.by");
  const isYou = !!authorUserId && authorUserId === viewerUserId;

  const profile = caregiverProfileId
    ? (profiles ?? []).find((p) => p.id === caregiverProfileId)
    : null;

  if (profile) {
    const orgMember = (members ?? []).find((m) => m.user_id === profile.account_user_id);
    const orgName = orgMember?.profile?.full_name?.trim();
    return (
      <span className={className ?? "inline-flex items-center gap-1.5"}>
        <span
          className="inline-block size-2.5 rounded-full"
          style={{ background: profile.color }}
        />
        <span>
          {prefix} <span className="font-semibold">{profile.name}</span>
          {orgName && <span className="text-muted-foreground"> · {orgName}</span>}
          {isYou && <span className="text-muted-foreground"> ({t("byProfile.you")})</span>}
        </span>
      </span>
    );
  }

  // No profile — fall back to author account
  const member = (members ?? []).find((m) => m.user_id === authorUserId);
  const name =
    member?.profile?.full_name?.trim() || t("byProfile.unknown");
  return (
    <span className={className ?? "inline-flex items-center gap-1.5"}>
      <span>
        {prefix} <span className="font-semibold">{name}</span>
        {isYou && <span className="text-muted-foreground"> ({t("byProfile.you")})</span>}
      </span>
    </span>
  );
}

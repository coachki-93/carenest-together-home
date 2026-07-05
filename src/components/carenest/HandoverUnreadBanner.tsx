import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLatestHandover } from "@/lib/data/handovers";
import {
  isUnreadForViewer,
  useHandoverReadsBulk,
} from "@/lib/data/handover-reads";
import { useCaregiverProfiles } from "@/lib/data/caregiver-profiles";
import { useFamilyMembers } from "@/lib/data/family";

/** Show the "new handover" prompt only if the latest handover is fresh. */
const RECENCY_HOURS = 12;

interface Props {
  familyId: string | undefined | null;
  viewerUserId: string | undefined | null;
  /** Currently active caregiver profile for the viewer, if any. */
  viewerProfileId?: string | null;
}

/**
 * Prominent banner shown when the latest handover for the family:
 *  - was authored by someone else (identified by caregiver profile on shared
 *    accounts, else by auth user),
 *  - is recent (< 12h old),
 *  - and hasn't been read by the current viewer (or was only read before the
 *    handover was edited).
 * Clicking navigates to /handover; the actual "Mark as read" happens on the
 * card, not here — we never create false read receipts on click.
 */
export function HandoverUnreadBanner({
  familyId,
  viewerUserId,
  viewerProfileId = null,
}: Props) {
  const { t } = useTranslation();
  const { data: latest } = useLatestHandover(familyId);
  const { data: readsMap } = useHandoverReadsBulk(latest ? [latest.id] : []);
  const { data: profiles } = useCaregiverProfiles(familyId);
  const { data: members } = useFamilyMembers(familyId);

  if (!latest || !viewerUserId) return null;

  // Identity gate: on shared accounts, "authored by me" is determined by the
  // caregiver profile linked to the handover — not the auth user. Fall back to
  // author_id only for legacy handovers with no profile linked.
  const authoredByViewer = latest.caregiver_profile_id
    ? latest.caregiver_profile_id === viewerProfileId
    : latest.author_id === viewerUserId;
  if (authoredByViewer) return null;

  const ageHours =
    (Date.now() - new Date(latest.created_at).getTime()) / 3_600_000;
  if (ageHours > RECENCY_HOURS) return null;

  const reads = readsMap?.get(latest.id);
  const editedAt = (latest as { edited_at?: string | null }).edited_at ?? null;
  if (!isUnreadForViewer(reads, viewerUserId, viewerProfileId, editedAt)) return null;

  // Resolve author display name (prefer linked caregiver profile).
  const profile = latest.caregiver_profile_id
    ? (profiles ?? []).find((p) => p.id === latest.caregiver_profile_id)
    : null;
  const memberName = (members ?? []).find((m) => m.user_id === latest.author_id)
    ?.profile?.full_name?.trim();
  const authorName = profile?.name || memberName || t("byProfile.unknown");

  return (
    <div className="card-soft p-4 mb-4 flex items-center gap-4 border-2 border-primary/60 bg-primary-soft/40">
      <div className="size-12 rounded-2xl flex items-center justify-center shrink-0 bg-primary/20 text-primary">
        <ClipboardList className="size-6" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-extrabold truncate">
          {t("dashboard.handoverUnread.title", { name: authorName })}
        </h3>
        <p className="text-sm text-muted-foreground">
          {editedAt
            ? t("dashboard.handoverUnread.editedBody")
            : t("dashboard.handoverUnread.body")}
        </p>
      </div>
      <div className="shrink-0">
        <Button asChild size="sm" className="rounded-full font-semibold">
          <Link to="/handover">
            {t("dashboard.handoverUnread.action")}
          </Link>
        </Button>
      </div>
    </div>
  );
}

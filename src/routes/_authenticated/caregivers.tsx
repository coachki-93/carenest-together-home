import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Users,
  Plus,
  Copy,
  Check,
  Crown,
  Trash2,
  ShieldX,
  Link as LinkIcon,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/carenest/DashboardLayout";
import { StorageImage } from "@/components/carenest/StorageImage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMyMembership, useProfile } from "@/lib/auth/use-profile";
import {
  useCreateInvite,
  useFamilyMembers,
  useInvites,
  useRemoveMember,
  useRevokeInvite,
  type Invite,
  type MemberWithProfile,
} from "@/lib/data/family";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/caregivers")({
  head: () => ({ meta: [{ title: "Care team — CareNest" }] }),
  component: CareTeamPage,
});

function CareTeamPage() {
  const { t, i18n } = useTranslation();
  const { data: profile } = useProfile();
  const { data: membership } = useMyMembership();
  const familyId = membership?.family_id;
  const isOwner = membership?.role === "owner";

  const { data: members, isLoading: loadingMembers } = useFamilyMembers(familyId);
  const { data: invites, isLoading: loadingInvites } = useInvites(familyId);

  const createInvite = useCreateInvite();
  const revokeInvite = useRevokeInvite();
  const removeMember = useRemoveMember();

  const [newInvite, setNewInvite] = useState<Invite | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<Invite | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<MemberWithProfile | null>(null);

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language === "sv" ? "sv-SE" : "en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [i18n.language],
  );

  const pendingInvites = (invites ?? []).filter((i) => i.status === "pending");

  async function handleCreate() {
    if (!familyId || !profile?.id) return;
    try {
      const invite = await createInvite.mutateAsync({ familyId, createdBy: profile.id });
      setNewInvite(invite);
      setCopied(false);
      toast.success(t("caregiversPage.inviteCreated"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("caregiversPage.error"));
    }
  }

  function inviteLink(code: string) {
    if (typeof window === "undefined") return `/invite/${code}`;
    return `${window.location.origin}/invite/${code}`;
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(t("caregiversPage.copied"));
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error(t("caregiversPage.copyError"));
    }
  }

  async function handleRevoke() {
    if (!confirmRevoke) return;
    try {
      await revokeInvite.mutateAsync(confirmRevoke.id);
      toast.success(t("caregiversPage.inviteRevoked"));
      setConfirmRevoke(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("caregiversPage.error"));
    }
  }

  async function handleRemove() {
    if (!confirmRemove) return;
    try {
      await removeMember.mutateAsync(confirmRemove.id);
      toast.success(t("caregiversPage.memberRemoved"));
      setConfirmRemove(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("caregiversPage.error"));
    }
  }

  return (
    <DashboardLayout
      title={t("nav.caregivers")}
      subtitle={t("caregiversPage.subtitle")}
      actions={
        isOwner ? (
          <Button
            size="sm"
            className="rounded-full gap-1.5 font-semibold"
            onClick={handleCreate}
            disabled={createInvite.isPending}
          >
            <Plus className="size-4" /> {t("caregiversPage.newInvite")}
          </Button>
        ) : undefined
      }
    >
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Members */}
        <section className="card-soft p-6">
          <div className="flex items-center gap-2 mb-5">
            <Users className="size-5 text-primary" />
            <h2 className="text-lg font-extrabold">{t("caregiversPage.members")}</h2>
          </div>
          {loadingMembers ? (
            <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
          ) : !members || members.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("caregiversPage.noMembers")}</p>
          ) : (
            <ul className="space-y-2">
              {members.map((m) => {
                const isMe = m.user_id === profile?.id;
                const isOwnerRow = m.role === "owner";
                const name = m.profile?.full_name?.trim() || t("caregiversPage.unnamed");
                const initials = name
                  .split(/\s+/)
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                const bg = m.display_color || m.profile?.avatar_color || "var(--primary-soft)";
                return (
                  <li
                    key={m.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40"
                  >
                    <div
                      className="size-12 rounded-full flex items-center justify-center font-bold text-base overflow-hidden flex-none"
                      style={{ background: bg }}
                    >
                      {m.profile?.avatar_url ? (
                        <StorageImage
                          path={m.profile.avatar_url}
                          alt={name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="text-primary">{initials || "·"}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">{name}</span>
                        {isMe && (
                          <span className="text-xs text-muted-foreground">
                            ({t("caregiversPage.you")})
                          </span>
                        )}
                        {isOwnerRow && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary-soft px-2 py-0.5 rounded-full">
                            <Crown className="size-3" /> {t("caregiversPage.roleOwner")}
                          </span>
                        )}
                        {!isOwnerRow && (
                          <span className="text-xs font-semibold text-muted-foreground bg-background px-2 py-0.5 rounded-full">
                            {t("caregiversPage.roleCaregiver")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("caregiversPage.joined", { date: dateFmt.format(new Date(m.joined_at)) })}
                      </p>
                    </div>
                    {isOwner && !isOwnerRow && !isMe && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-muted-foreground hover:text-destructive"
                        onClick={() => setConfirmRemove(m)}
                        aria-label={t("caregiversPage.removeMember")}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Invites */}
        {isOwner && (
          <section className="card-soft p-6">
            <div className="flex items-center gap-2 mb-5">
              <Mail className="size-5 text-primary" />
              <h2 className="text-lg font-extrabold">{t("caregiversPage.invitesTitle")}</h2>
            </div>
            {loadingInvites ? (
              <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
            ) : pendingInvites.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm mb-4">
                  {t("caregiversPage.noPending")}
                </p>
                <Button
                  className="rounded-full font-semibold"
                  onClick={handleCreate}
                  disabled={createInvite.isPending}
                >
                  <Plus className="size-4" /> {t("caregiversPage.newInvite")}
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {pendingInvites.map((inv) => {
                  const expired = new Date(inv.expires_at) < new Date();
                  return (
                    <li
                      key={inv.id}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40"
                    >
                      <div className="size-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center flex-none">
                        <LinkIcon className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono font-bold tracking-wider text-base">
                          {inv.code}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {expired
                            ? t("caregiversPage.expired")
                            : t("caregiversPage.expires", {
                                date: dateFmt.format(new Date(inv.expires_at)),
                              })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={() => copy(inviteLink(inv.code))}
                        aria-label={t("caregiversPage.copyLink")}
                      >
                        <Copy className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-muted-foreground hover:text-destructive"
                        onClick={() => setConfirmRevoke(inv)}
                        aria-label={t("caregiversPage.revoke")}
                      >
                        <ShieldX className="size-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>

      {/* New invite dialog */}
      <Dialog open={!!newInvite} onOpenChange={(o) => !o && setNewInvite(null)}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>{t("caregiversPage.shareTitle")}</DialogTitle>
            <DialogDescription>{t("caregiversPage.shareBody")}</DialogDescription>
          </DialogHeader>
          {newInvite && (
            <div className="space-y-4 py-2">
              <div className="rounded-2xl bg-primary-soft p-5 text-center">
                <div className="text-xs font-bold uppercase tracking-wider text-primary mb-2">
                  {t("caregiversPage.code")}
                </div>
                <div className="font-mono text-3xl font-extrabold tracking-[0.3em] text-primary">
                  {newInvite.code}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("caregiversPage.shareLink")}
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-xl bg-muted px-3 py-2 text-xs">
                    {inviteLink(newInvite.code)}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn("rounded-full gap-1.5", copied && "text-success")}
                    onClick={() => copy(inviteLink(newInvite.code))}
                  >
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copied ? t("caregiversPage.copied") : t("caregiversPage.copy")}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("caregiversPage.expires", {
                  date: dateFmt.format(new Date(newInvite.expires_at)),
                })}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button className="rounded-full" onClick={() => setNewInvite(null)}>
              {t("common.continue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmRevoke} onOpenChange={(o) => !o && setConfirmRevoke(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("caregiversPage.confirmRevokeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("caregiversPage.confirmRevokeBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRevoke}
            >
              {t("caregiversPage.revoke")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmRemove} onOpenChange={(o) => !o && setConfirmRemove(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("caregiversPage.confirmRemoveTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("caregiversPage.confirmRemoveBody", {
                name: confirmRemove?.profile?.full_name || t("caregiversPage.unnamed"),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemove}
            >
              {t("caregiversPage.removeMember")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

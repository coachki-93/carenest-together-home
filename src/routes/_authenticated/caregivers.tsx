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
  Mail,
  Send,
  UserCircle2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { DashboardLayout } from "@/components/carenest/DashboardLayout";
import { StorageImage } from "@/components/carenest/StorageImage";
import { AvatarColorPicker, AVATAR_COLORS, initials } from "@/components/carenest/AvatarColorPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useMyMembership, useProfile, useSession } from "@/lib/auth/use-profile";
import {
  useCreateInvite,
  useFamilyMembers,
  useInvites,
  useRemoveMember,
  useRevokeInvite,
  type Invite,
  type MemberWithProfile,
} from "@/lib/data/family";
import {
  useCaregiverProfiles,
  useSaveCaregiverProfile,
  useDeleteCaregiverProfile,
  type CaregiverProfile,
} from "@/lib/data/caregiver-profiles";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/caregivers")({
  head: () => ({ meta: [{ title: "Care team — CareNest" }] }),
  component: CareTeamPage,
});

function CareTeamPage() {
  const { t, i18n } = useTranslation();
  const { user } = useSession();
  const { data: profile } = useProfile();
  const { data: membership } = useMyMembership();
  const familyId = membership?.family_id;
  const familyName = membership?.families?.name ?? "";
  const isOwner = membership?.role === "owner";

  const { data: members, isLoading: loadingMembers } = useFamilyMembers(familyId);
  const { data: invites, isLoading: loadingInvites } = useInvites(familyId);
  const { data: profiles, isLoading: loadingProfiles } = useCaregiverProfiles(familyId);

  const revokeInvite = useRevokeInvite();
  const removeMember = useRemoveMember();

  const [creatingInvite, setCreatingInvite] = useState(false);
  const [sentInvite, setSentInvite] = useState<Invite | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<Invite | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<MemberWithProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState<CaregiverProfile | null>(null);
  const [creatingProfileFor, setCreatingProfileFor] = useState<string | null>(null);
  const [deletingProfile, setDeletingProfile] = useState<CaregiverProfile | null>(null);

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

  function inviteLink(code: string) {
    if (typeof window === "undefined") return `/invite/${code}`;
    return `${window.location.origin}/invite/${code}`;
  }

  function openMailto(invite: Invite) {
    const link = inviteLink(invite.code);
    const subject = t("caregiversPage.mailSubject", { family: familyName });
    const body = t("caregiversPage.mailBody", { family: familyName, link });
    const to = invite.invited_email ?? "";
    const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    if (typeof window !== "undefined") window.location.href = href;
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
            onClick={() => setCreatingInvite(true)}
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
                const ini = name
                  .split(/\s+/)
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                const bg = m.display_color || m.profile?.avatar_color || "var(--primary-soft)";
                return (
                  <li key={m.id} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40">
                    <div
                      className="size-12 rounded-full flex items-center justify-center font-bold text-base overflow-hidden flex-none"
                      style={{ background: bg }}
                    >
                      {m.profile?.avatar_url ? (
                        <StorageImage path={m.profile.avatar_url} alt={name} className="size-full object-cover" />
                      ) : (
                        <span className="text-primary">{ini || "·"}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">{name}</span>
                        {isMe && <span className="text-xs text-muted-foreground">({t("caregiversPage.you")})</span>}
                        {isOwnerRow ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary-soft px-2 py-0.5 rounded-full">
                            <Crown className="size-3" /> {t("caregiversPage.roleOwner")}
                          </span>
                        ) : (
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

        {/* Caregiver profiles */}
        <section className="card-soft p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <UserCircle2 className="size-5 text-primary" />
              <h2 className="text-lg font-extrabold">{t("caregiverProfiles.title")}</h2>
            </div>
            {!isOwner && user?.id && (
              <Button
                size="sm"
                className="rounded-full gap-1.5 font-semibold"
                onClick={() => setCreatingProfileFor(user.id)}
              >
                <Plus className="size-4" /> {t("caregiverProfiles.add")}
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {isOwner ? t("caregiverProfiles.ownerHelp") : t("caregiverProfiles.caregiverHelp")}
          </p>
          {loadingProfiles ? (
            <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
          ) : !profiles || profiles.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("caregiverProfiles.empty")}</p>
          ) : (
            <ul className="grid sm:grid-cols-2 gap-2">
              {profiles.map((p) => {
                const mine = p.account_user_id === user?.id;
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40"
                  >
                    <div
                      className="size-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ background: p.color }}
                    >
                      {initials(p.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{p.name}</div>
                      {!p.is_active && (
                        <span className="text-xs text-muted-foreground">
                          {t("caregiverProfiles.inactive")}
                        </span>
                      )}
                    </div>
                    {mine && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                          onClick={() => setEditingProfile(p)}
                          aria-label={t("common.save")}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full text-muted-foreground hover:text-destructive"
                          onClick={() => setDeletingProfile(p)}
                          aria-label={t("common.remove")}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
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
                  onClick={() => setCreatingInvite(true)}
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
                        <Mail className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">
                          {inv.invited_email ?? t("caregiversPage.noEmail")}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {expired
                            ? t("caregiversPage.expired")
                            : t("caregiversPage.expires", {
                                date: dateFmt.format(new Date(inv.expires_at)),
                              })}
                          {" · "}
                          <span className="font-mono">{inv.code}</span>
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full gap-1.5"
                        onClick={() => openMailto(inv)}
                      >
                        <Send className="size-4" /> {t("caregiversPage.resend")}
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

      {/* Create invite dialog (email-first) */}
      {creatingInvite && familyId && profile?.id && (
        <CreateInviteDialog
          familyId={familyId}
          createdBy={profile.id}
          familyName={familyName}
          onClose={() => setCreatingInvite(false)}
          onSent={(inv) => {
            setCreatingInvite(false);
            setSentInvite(inv);
            openMailto(inv);
          }}
        />
      )}

      {/* Confirm sent dialog (after mailto opens) */}
      <Dialog open={!!sentInvite} onOpenChange={(o) => !o && setSentInvite(null)}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>{t("caregiversPage.sentTitle")}</DialogTitle>
            <DialogDescription>
              {t("caregiversPage.sentBody", { email: sentInvite?.invited_email ?? "" })}
            </DialogDescription>
          </DialogHeader>
          {sentInvite && (
            <div className="space-y-3 py-2">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("caregiversPage.shareLink")}
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-xl bg-muted px-3 py-2 text-xs">
                  {inviteLink(sentInvite.code)}
                </code>
                <CopyButton value={inviteLink(sentInvite.code)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button className="rounded-full" onClick={() => setSentInvite(null)}>
              {t("common.continue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Caregiver profile dialog */}
      {(creatingProfile || editingProfile) && familyId && user?.id && (
        <CaregiverProfileDialog
          familyId={familyId}
          accountUserId={user.id}
          profile={editingProfile ?? undefined}
          onClose={() => {
            setCreatingProfile(false);
            setEditingProfile(null);
          }}
        />
      )}

      <AlertDialog open={!!deletingProfile} onOpenChange={(o) => !o && setDeletingProfile(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("caregiverProfiles.confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("caregiverProfiles.confirmDeleteBody", { name: deletingProfile?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">{t("common.cancel")}</AlertDialogCancel>
            <DeleteProfileButton
              profile={deletingProfile}
              onDone={() => setDeletingProfile(null)}
            />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmRevoke} onOpenChange={(o) => !o && setConfirmRevoke(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("caregiversPage.confirmRevokeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("caregiversPage.confirmRevokeBody")}</AlertDialogDescription>
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

function CopyButton({ value }: { value: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("rounded-full gap-1.5", copied && "text-success")}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast.success(t("caregiversPage.copied"));
          setTimeout(() => setCopied(false), 1600);
        } catch {
          toast.error(t("caregiversPage.copyError"));
        }
      }}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? t("caregiversPage.copied") : t("caregiversPage.copy")}
    </Button>
  );
}

function CreateInviteDialog({
  familyId,
  createdBy,
  familyName,
  onClose,
  onSent,
}: {
  familyId: string;
  createdBy: string;
  familyName: string;
  onClose: () => void;
  onSent: (inv: Invite) => void;
}) {
  const { t } = useTranslation();
  const createInvite = useCreateInvite();
  const [email, setEmail] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z.string().trim().email().safeParse(email);
    if (!parsed.success) {
      toast.error(t("auth.invalidEmail"));
      return;
    }
    try {
      const inv = await createInvite.mutateAsync({
        familyId,
        createdBy,
        invitedEmail: parsed.data,
      });
      toast.success(t("caregiversPage.inviteCreated"));
      onSent(inv);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("caregiversPage.error"));
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle>{t("caregiversPage.newInvite")}</DialogTitle>
          <DialogDescription>
            {t("caregiversPage.inviteBody", { family: familyName })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">{t("caregiversPage.email")}</Label>
            <Input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="caregiver@example.com"
              className="h-12 rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" className="rounded-full" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={createInvite.isPending} className="rounded-full gap-1.5">
              <Send className="size-4" />
              {createInvite.isPending ? t("auth.sending") : t("caregiversPage.sendInvite")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CaregiverProfileDialog({
  familyId,
  accountUserId,
  profile,
  onClose,
}: {
  familyId: string;
  accountUserId: string;
  profile?: CaregiverProfile;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const save = useSaveCaregiverProfile();
  const [name, setName] = useState(profile?.name ?? "");
  const [color, setColor] = useState(profile?.color ?? AVATAR_COLORS[0]);
  const [active, setActive] = useState(profile?.is_active ?? true);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t("caregiverProfiles.nameRequired"));
      return;
    }
    try {
      await save.mutateAsync({
        id: profile?.id,
        family_id: familyId,
        account_user_id: accountUserId,
        name: name.trim(),
        color,
        is_active: active,
      });
      toast.success(t("caregiverProfiles.saved"));
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle>{profile ? t("caregiverProfiles.edit") : t("caregiverProfiles.add")}</DialogTitle>
          <DialogDescription>{t("caregiverProfiles.dialogHelp")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="flex flex-col items-center gap-3">
            <div
              className="size-20 rounded-full flex items-center justify-center text-white text-2xl font-bold"
              style={{ backgroundColor: color }}
            >
              {initials(name || "?")}
            </div>
            <AvatarColorPicker value={color} onChange={setColor} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">{t("caregiverProfiles.name")}</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("caregiverProfiles.namePh")}
              className="h-12 rounded-xl"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="size-4"
            />
            {t("caregiverProfiles.activeToggle")}
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" className="rounded-full" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={save.isPending} className="rounded-full">
              {save.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteProfileButton({
  profile,
  onDone,
}: {
  profile: CaregiverProfile | null;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const del = useDeleteCaregiverProfile();
  return (
    <AlertDialogAction
      className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
      onClick={async () => {
        if (!profile) return;
        try {
          await del.mutateAsync(profile.id);
          toast.success(t("caregiverProfiles.deleted"));
        } catch (e) {
          toast.error((e as Error).message);
        }
        onDone();
      }}
    >
      {t("common.remove")}
    </AlertDialogAction>
  );
}

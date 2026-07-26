import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Copy,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Users2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/lib/notify";
import {
  createTeamAccount,
  getTeamAccountCredentials,
  resetTeamAccountPassword,
} from "@/lib/data/team-account.functions";

/**
 * Owner-only card that displays / creates / rotates the family's shared
 * team-account credentials. The password is only ever visible right after
 * mint or reset — never fetched or stored again after the reveal.
 */
export function TeamAccountCard({
  familyId,
  isOwner,
  variant = "settings",
}: {
  familyId: string;
  isOwner: boolean;
  /** "onboarding" removes the outer <section> chrome for use inside the wizard step. */
  variant?: "settings" | "onboarding";
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const create = useServerFn(createTeamAccount);
  const reset = useServerFn(resetTeamAccountPassword);
  const get = useServerFn(getTeamAccountCredentials);

  const credQ = useQuery({
    queryKey: ["team-account", familyId],
    enabled: !!familyId && isOwner,
    queryFn: () => get({ data: { familyId } }),
    staleTime: 30_000,
  });

  const [freshPassword, setFreshPassword] = useState<string | null>(null);
  const [freshUsername, setFreshUsername] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(true);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const createMut = useMutation({
    mutationFn: () => create({ data: { familyId } }),
    onSuccess: (r) => {
      setFreshPassword(r.password);
      setFreshUsername(r.username);
      setShowPw(true);
      qc.invalidateQueries({ queryKey: ["team-account", familyId] });
      toast.success(t("teamAccount.created"));
    },
    onError: (e) => toast.error((e as Error).message),
    meta: { suppressGlobalError: true },
  });

  const resetMut = useMutation({
    mutationFn: () => reset({ data: { familyId } }),
    onSuccess: (r) => {
      setFreshPassword(r.password);
      setFreshUsername(r.username);
      setShowPw(true);
      setConfirmResetOpen(false);
      toast.success(t("teamAccount.reset"));
    },
    onError: (e) => toast.error((e as Error).message),
    meta: { suppressGlobalError: true },
  });

  // Clear the revealed password when navigating away (component unmount).
  useEffect(() => () => setFreshPassword(null), []);

  if (!isOwner) return null;

  const exists = credQ.data?.exists;
  const username = freshUsername ?? credQ.data?.username ?? null;

  const inner = (
    <>
      <header className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
          <Users2 className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold">{t("teamAccount.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("teamAccount.subtitle")}
          </p>
        </div>
      </header>

      {credQ.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t("common.loading")}
        </div>
      ) : !exists ? (
        <div className="rounded-2xl border border-dashed border-primary/40 bg-primary-soft/30 p-5 space-y-3">
          <p className="text-sm">{t("teamAccount.emptyBody")}</p>
          <Button
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending}
            className="rounded-full font-bold"
          >
            {createMut.isPending && (
              <Loader2 className="size-4 animate-spin" />
            )}
            <ShieldCheck className="size-4" />
            {t("teamAccount.generate")}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-primary/40 bg-primary-soft/40 p-5 space-y-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                {t("teamAccount.usernameLabel")}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-lg font-mono font-bold break-all">
                  {username}
                </code>
                {username && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => {
                      void navigator.clipboard?.writeText(username);
                      toast.success(t("wizard.copied"));
                    }}
                  >
                    <Copy className="size-3.5" /> {t("wizard.copy")}
                  </Button>
                )}
              </div>
            </div>

            {freshPassword ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {t("teamAccount.passwordLabel")}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-lg font-mono font-bold break-all">
                    {showPw ? freshPassword : "••••••••••••••••••••"}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={
                      showPw
                        ? t("auth.hidePassword")
                        : t("auth.showPassword")
                    }
                  >
                    {showPw ? (
                      <EyeOff className="size-3.5" />
                    ) : (
                      <Eye className="size-3.5" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => {
                      void navigator.clipboard?.writeText(freshPassword);
                      toast.success(t("wizard.copied"));
                    }}
                  >
                    <Copy className="size-3.5" /> {t("wizard.copy")}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("teamAccount.shownOnce")}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("teamAccount.passwordHidden")}
              </p>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => setConfirmResetOpen(true)}
          >
            <RefreshCw className="size-4" /> {t("teamAccount.resetBtn")}
          </Button>
        </div>
      )}

      <Dialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" />
              {t("teamAccount.resetConfirmTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("teamAccount.resetConfirmBody")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmResetOpen(false)}
              disabled={resetMut.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => resetMut.mutate()}
              disabled={resetMut.isPending}
            >
              {resetMut.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {t("teamAccount.resetConfirmCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (variant === "onboarding") return <div className="space-y-4">{inner}</div>;
  return <section className="card-soft p-6 md:p-8 space-y-4">{inner}</section>;
}

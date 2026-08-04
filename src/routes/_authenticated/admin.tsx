import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import {
  Loader2,
  Search,
  Users2,
  UserCircle2,
  KeyRound,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";
import { AdminLayout } from "@/components/carenest/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsAdmin } from "@/lib/auth/use-is-admin";
import {
  adminListFamilies,
  adminListAccounts,
  adminGetAccount,
  adminTriggerPasswordReset,
} from "@/lib/data/admin.functions";
import { AdminCoupons } from "@/components/carenest/AdminCoupons";
import { AdminBugReports } from "@/components/carenest/AdminBugReports";
import { toast } from "@/lib/notify";

type AdminTab = "accounts" | "families" | "coupons" | "bugs";
type AdminSearch = { tab?: AdminTab };

export const Route = createFileRoute("/_authenticated/admin")({
  validateSearch: (s: Record<string, unknown>): AdminSearch => {
    const tab: AdminTab =
      s.tab === "families" || s.tab === "coupons" || s.tab === "bugs"
        ? s.tab
        : "accounts";
    return { tab };
  },
  head: () => ({
    meta: [
      { title: "Platform admin — Tillsa" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const search = useSearch({ from: "/_authenticated/admin" });
  const tab: AdminTab = search.tab ?? "accounts";

  useEffect(() => {
    if (isAdmin.isSuccess && isAdmin.data === false) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [isAdmin.isSuccess, isAdmin.data, navigate]);

  if (isAdmin.isLoading || isAdmin.data !== true) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const titleKey =
    tab === "families"
      ? "admin.families.title"
      : tab === "coupons"
        ? "admin.coupons.title"
        : tab === "bugs"
          ? "admin.bugs.title"
          : "admin.accounts.title";

  return (
    <AdminLayout title={t(titleKey)} subtitle={t("admin.subtitle")}>
      {tab === "families" ? (
        <FamiliesSection />
      ) : tab === "coupons" ? (
        <AdminCoupons />
      ) : tab === "bugs" ? (
        <AdminBugReports />
      ) : (
        <AccountsSection />
      )}
    </AdminLayout>
  );
}



// ---------------------------------------------------------------------------
// Families
// ---------------------------------------------------------------------------

function FamiliesSection() {
  const { t } = useTranslation();
  const list = useServerFn(adminListFamilies);
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["admin", "families", search],
    queryFn: () => list({ data: { search, limit: 50, offset: 0 } }),
  });

  return (
    <section className="card-soft p-5 md:p-6 space-y-4">
      <header className="flex items-center gap-3">
        <Users2 className="size-5 text-primary" />
        <h2 className="text-lg font-bold">{t("admin.families.title")}</h2>
      </header>
      <div className="flex items-center gap-2">
        <Search className="size-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("admin.families.searchPlaceholder")}
          className="max-w-sm"
        />
      </div>
      {q.isLoading ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      ) : q.isError ? (
        <p className="text-sm text-red-700">{(q.error as Error).message}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">{t("admin.families.colName")}</th>
                <th className="py-2 pr-4">{t("admin.families.colMembers")}</th>
                <th className="py-2 pr-4">{t("admin.families.colCreated")}</th>
                <th className="py-2 pr-4">{t("admin.families.colHospital")}</th>
              </tr>
            </thead>
            <tbody>
              {q.data?.families.map((f) => (
                <tr key={f.id} className="border-t">
                  <td className="py-2 pr-4 font-medium">{f.name}</td>
                  <td className="py-2 pr-4">{f.member_count}</td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {new Date(f.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-4">
                    {f.at_hospital_since ? t("common.yes") : "—"}
                  </td>
                </tr>
              ))}
              {q.data && q.data.families.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-muted-foreground">
                    {t("admin.families.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {q.data && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("admin.families.total", { count: q.data.total })}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

function AccountsSection() {
  const { t } = useTranslation();
  const list = useServerFn(adminListAccounts);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["admin", "accounts", search],
    queryFn: () => list({ data: { search, limit: 50, offset: 0 } }),
  });

  return (
    <section className="card-soft p-5 md:p-6 space-y-4">
      <header className="flex items-center gap-3">
        <UserCircle2 className="size-5 text-primary" />
        <h2 className="text-lg font-bold">{t("admin.accounts.title")}</h2>
      </header>
      <div className="flex items-center gap-2">
        <Search className="size-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("admin.accounts.searchPlaceholder")}
          className="max-w-sm"
        />
      </div>
      {q.isLoading ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      ) : q.isError ? (
        <p className="text-sm text-red-700">{(q.error as Error).message}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">{t("admin.accounts.colName")}</th>
                <th className="py-2 pr-4">{t("admin.accounts.colType")}</th>
                <th className="py-2 pr-4">{t("admin.accounts.colOnboarded")}</th>
                <th className="py-2 pr-4">{t("admin.accounts.colCreated")}</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {q.data?.accounts.map((a) => (
                <tr key={a.user_id} className="border-t">
                  <td className="py-2 pr-4 font-medium">
                    {a.full_name ?? "—"}
                  </td>
                  <td className="py-2 pr-4">
                    {a.is_team_account
                      ? t("admin.accounts.typeTeam")
                      : (a.account_type ?? "—")}
                  </td>
                  <td className="py-2 pr-4">
                    {a.onboarded ? t("common.yes") : t("common.no")}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {a.created_at
                      ? new Date(a.created_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => setSelectedUserId(a.user_id)}
                    >
                      {t("admin.accounts.open")}
                    </Button>
                  </td>
                </tr>
              ))}
              {q.data && q.data.accounts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-muted-foreground">
                    {t("admin.accounts.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <AccountDetailDialog
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Account detail + reset password
// ---------------------------------------------------------------------------

function AccountDetailDialog({
  userId,
  onClose,
}: {
  userId: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const get = useServerFn(adminGetAccount);
  const reset = useServerFn(adminTriggerPasswordReset);

  const detailQ = useQuery({
    queryKey: ["admin", "account", userId],
    enabled: !!userId,
    queryFn: () => get({ data: { userId: userId! } }),
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [issued, setIssued] = useState<
    | null
    | {
        kind: "recovery_link" | "team_password";
        recoveryLink?: string;
        username?: string;
        password?: string;
      }
  >(null);
  const [showPw, setShowPw] = useState(true);

  const resetMut = useMutation({
    mutationFn: () => reset({ data: { userId: userId! } }),
    onSuccess: (r) => {
      setIssued(r);
      setConfirmOpen(false);
      toast.success(t("admin.reset.issued"));
    },
    onError: (e) => toast.error((e as Error).message),
    meta: { suppressGlobalError: true },
  });

  const handleClose = () => {
    setIssued(null);
    setConfirmOpen(false);
    onClose();
  };

  const isTeam = detailQ.data?.is_team_account === true;

  return (
    <Dialog open={!!userId} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("admin.detail.title")}</DialogTitle>
          <DialogDescription>{t("admin.detail.subtitle")}</DialogDescription>
        </DialogHeader>

        {detailQ.isLoading ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : detailQ.isError ? (
          <p className="text-sm text-red-700">
            {(detailQ.error as Error).message}
          </p>
        ) : detailQ.data ? (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-3 gap-y-2">
              <dt className="text-muted-foreground">
                {t("admin.detail.name")}
              </dt>
              <dd className="col-span-2 font-medium">
                {detailQ.data.full_name ?? "—"}
              </dd>
              <dt className="text-muted-foreground">
                {t("admin.detail.email")}
              </dt>
              <dd className="col-span-2 font-medium break-all">
                {detailQ.data.email ?? "—"}
              </dd>
              <dt className="text-muted-foreground">
                {t("admin.detail.type")}
              </dt>
              <dd className="col-span-2">
                {isTeam
                  ? t("admin.accounts.typeTeam")
                  : (detailQ.data.account_type ?? "—")}
              </dd>
              {isTeam && (
                <>
                  <dt className="text-muted-foreground">
                    {t("admin.detail.teamUsername")}
                  </dt>
                  <dd className="col-span-2 font-mono">
                    {detailQ.data.team_account_username ?? "—"}
                  </dd>
                </>
              )}
              <dt className="text-muted-foreground">
                {t("admin.detail.lastSignIn")}
              </dt>
              <dd className="col-span-2">
                {detailQ.data.last_sign_in_at
                  ? new Date(detailQ.data.last_sign_in_at).toLocaleString()
                  : "—"}
              </dd>
              <dt className="text-muted-foreground">
                {t("admin.detail.emailConfirmed")}
              </dt>
              <dd className="col-span-2">
                {detailQ.data.email_confirmed_at
                  ? t("common.yes")
                  : t("common.no")}
              </dd>
              <dt className="text-muted-foreground">
                {t("admin.detail.memberships")}
              </dt>
              <dd className="col-span-2">
                {detailQ.data.memberships.length === 0
                  ? "—"
                  : detailQ.data.memberships
                      .map(
                        (m) =>
                          `${m.family_name}${m.is_owner ? " (owner)" : ""}`,
                      )
                      .join(", ")}
              </dd>
            </dl>

            {issued ? (
              issued.kind === "recovery_link" ? (
                <div className="rounded-2xl border-2 border-primary/40 bg-primary-soft/40 p-4 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {t("admin.reset.linkLabel")}
                  </p>
                  {issued.recoveryLink ? (
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs font-mono break-all">
                        {issued.recoveryLink}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => {
                          void navigator.clipboard?.writeText(
                            issued.recoveryLink!,
                          );
                          toast.success(t("wizard.copied"));
                        }}
                      >
                        <Copy className="size-3.5" />
                      </Button>
                      <a
                        href={issued.recoveryLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-full border px-2 py-1 text-xs"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t("admin.reset.linkMissing")}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t("admin.reset.linkHint")}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 space-y-3">
                  <p className="text-sm font-bold text-amber-950">
                    {t("admin.reset.teamRotated")}
                  </p>
                  <p className="text-xs text-amber-900">
                    {t("admin.reset.teamLogoutWarning")}
                  </p>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      {t("teamAccount.usernameLabel")}
                    </p>
                    <code className="text-sm font-mono font-bold break-all">
                      {issued.username}
                    </code>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      {t("teamAccount.passwordLabel")}
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm font-mono font-bold break-all">
                        {showPw
                          ? issued.password
                          : "••••••••••••••••••••"}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => setShowPw((v) => !v)}
                      >
                        {showPw ? (
                          <EyeOff className="size-3.5" />
                        ) : (
                          <Eye className="size-3.5" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => {
                          void navigator.clipboard?.writeText(
                            issued.password ?? "",
                          );
                          toast.success(t("wizard.copied"));
                        }}
                      >
                        <Copy className="size-3.5" />
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("teamAccount.shownOnce")}
                    </p>
                  </div>
                </div>
              )
            ) : (
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => setConfirmOpen(true)}
              >
                <KeyRound className="size-4" />
                {t("admin.reset.trigger")}
              </Button>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            {t("common.close")}
          </Button>
        </DialogFooter>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="size-5 text-primary" />
                {t("admin.reset.confirmTitle")}
              </DialogTitle>
              <DialogDescription>
                {isTeam
                  ? t("admin.reset.confirmBodyTeam")
                  : t("admin.reset.confirmBodyPersonal")}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setConfirmOpen(false)}
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
                {t("admin.reset.confirmCta")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

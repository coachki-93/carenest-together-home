import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Loader2, Bug, CheckCircle2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminListBugReports,
  adminUpdateBugReportStatus,
  type AdminBugReportDTO,
  type BugReportStatus,
} from "@/lib/data/bug-admin.functions";
import { toast } from "@/lib/notify";

type Filter = "all" | BugReportStatus;

export function AdminBugReports() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const list = useServerFn(adminListBugReports);
  const update = useServerFn(adminUpdateBugReportStatus);
  const [filter, setFilter] = useState<Filter>("all");

  const q = useQuery({
    queryKey: ["admin", "bugs", filter],
    queryFn: () => list({ data: { status: filter, limit: 100 } }),
  });

  const mut = useMutation({
    mutationFn: (p: { id: string; status: BugReportStatus }) =>
      update({ data: p }),
    onSuccess: () => {
      toast.success(t("admin.bugs.updated"));
      void qc.invalidateQueries({ queryKey: ["admin", "bugs"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function fmt(iso: string) {
    return new Date(iso).toLocaleString(
      i18n.language?.startsWith("sv") ? "sv-SE" : "en-GB",
    );
  }

  function statusLabel(s: BugReportStatus) {
    return t(`admin.bugs.status.${s}`);
  }

  const rows: AdminBugReportDTO[] = q.data ?? [];

  return (
    <section className="card-soft p-5 md:p-6 space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <Bug className="size-5 text-amber-700" />
        <h2 className="text-lg font-bold">{t("admin.bugs.title")}</h2>
        <div className="ml-auto w-44">
          <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <SelectTrigger aria-label={t("admin.bugs.filter")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.bugs.filterAll")}</SelectItem>
              <SelectItem value="new">{t("admin.bugs.status.new")}</SelectItem>
              <SelectItem value="read">{t("admin.bugs.status.read")}</SelectItem>
              <SelectItem value="resolved">
                {t("admin.bugs.status.resolved")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {q.isLoading ? (
        <div className="py-10 flex justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6">
          {t("admin.bugs.empty")}
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-muted px-2 py-0.5 font-semibold">
                  {statusLabel(r.status)}
                </span>
                <span>{fmt(r.createdAt)}</span>
                {r.submitterEmail && <span>· {r.submitterEmail}</span>}
                {r.pageContext && <span>· {r.pageContext}</span>}
              </div>
              <p className="text-sm whitespace-pre-wrap">{r.body}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  disabled={mut.isPending || r.status === "read"}
                  onClick={() => mut.mutate({ id: r.id, status: "read" })}
                >
                  <Eye className="size-4" />
                  {t("admin.bugs.markRead")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  disabled={mut.isPending || r.status === "resolved"}
                  onClick={() => mut.mutate({ id: r.id, status: "resolved" })}
                >
                  <CheckCircle2 className="size-4" />
                  {t("admin.bugs.markResolved")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

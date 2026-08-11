import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Loader2, BarChart3 } from "lucide-react";
import { adminGetSubscriptionAnalytics } from "@/lib/data/analytics-admin.functions";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export function AdminAnalytics() {
  const { t } = useTranslation();
  const get = useServerFn(adminGetSubscriptionAnalytics);
  const q = useQuery({
    queryKey: ["admin", "analytics", "subscriptions"],
    queryFn: () => get(),
  });

  if (q.isLoading) {
    return <Loader2 className="size-5 animate-spin text-muted-foreground" />;
  }
  if (q.isError) {
    return <p className="text-sm text-red-700">{(q.error as Error).message}</p>;
  }
  const d = q.data;
  if (!d) return null;

  const kr = (n: number) => `${n.toLocaleString("sv-SE")} kr`;

  return (
    <div className="space-y-6">
      <section className="card-soft p-5 md:p-6 space-y-4">
        <header className="flex items-center gap-3">
          <BarChart3 className="size-5 text-primary" />
          <h2 className="text-lg font-bold">{t("admin.analytics.title")}</h2>
        </header>
        <p className="text-sm text-muted-foreground">
          {t("admin.analytics.subtitle")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={t("admin.analytics.mrr")} value={kr(d.mrrSek)} />
          <Stat label={t("admin.analytics.arr")} value={kr(d.arrSek)} />
          <Stat
            label={t("admin.analytics.activeFounding")}
            value={d.activeFounding}
          />
          <Stat
            label={t("admin.analytics.activeStandard")}
            value={d.activeStandard}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat
            label={t("admin.analytics.statusActive")}
            value={d.statusCounts.active}
          />
          <Stat
            label={t("admin.analytics.statusTrialing")}
            value={d.statusCounts.trialing}
          />
          <Stat
            label={t("admin.analytics.statusPastDue")}
            value={d.statusCounts.past_due}
          />
          <Stat
            label={t("admin.analytics.statusCanceled")}
            value={d.statusCounts.canceled}
          />
          <Stat
            label={t("admin.analytics.statusNone")}
            value={d.statusCounts.none}
          />
          <Stat
            label={t("admin.analytics.signups30d")}
            value={d.signups30d}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {t("admin.analytics.mrrNote")}
        </p>
      </section>

      <section className="card-soft p-5 md:p-6 space-y-3">
        <h3 className="text-base font-bold">
          {t("admin.analytics.trialsEnding")}{" "}
          <span className="text-muted-foreground font-normal">
            ({d.trialsEndingSoonCount})
          </span>
        </h3>
        {d.trialsEndingSoon.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("admin.analytics.emptyTrials")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">{t("admin.analytics.colFamily")}</th>
                  <th className="py-2 pr-4">
                    {t("admin.analytics.colTrialEnds")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {d.trialsEndingSoon.map((r) => (
                  <tr key={r.familyId} className="border-t">
                    <td className="py-2 pr-4 font-medium">{r.familyName}</td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {new Date(r.trialEndsAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card-soft p-5 md:p-6 space-y-3">
        <h3 className="text-base font-bold">
          {t("admin.analytics.scheduledCancels")}{" "}
          <span className="text-muted-foreground font-normal">
            ({d.scheduledCancelsCount})
          </span>
        </h3>
        {d.scheduledCancels.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("admin.analytics.emptyCancels")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">{t("admin.analytics.colFamily")}</th>
                  <th className="py-2 pr-4">
                    {t("admin.analytics.colPeriodEnd")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {d.scheduledCancels.map((r) => (
                  <tr key={r.familyId} className="border-t">
                    <td className="py-2 pr-4 font-medium">{r.familyName}</td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {r.currentPeriodEnd
                        ? new Date(r.currentPeriodEnd).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { DashboardLayout } from "@/components/carenest/DashboardLayout";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyMembership } from "@/lib/auth/use-profile";
import {
  useInsights,
  type InsightsRange,
  type VitalSeries,
} from "@/lib/data/insights";
import { z } from "zod";

const searchSchema = z.object({
  range: z.enum(["7d", "30d", "90d"]).catch("7d"),
});

export const Route = createFileRoute("/_authenticated/insights")({
  validateSearch: searchSchema,
  component: InsightsPage,
});

function shortDate(d: string) {
  try {
    return format(parseISO(d), "MMM d");
  } catch {
    return d;
  }
}

function InsightsPage() {
  const { t } = useTranslation();
  const { range } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: membership } = useMyMembership();
  const familyId = membership?.family_id ?? null;
  const insights = useInsights(familyId, range);

  const setRange = (r: InsightsRange) =>
    navigate({ search: { range: r }, replace: true });

  return (
    <DashboardLayout title={t("insights.title")} subtitle={t("insights.subtitle")}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-2">
          <Tabs value={range} onValueChange={(v) => setRange(v as InsightsRange)}>
            <TabsList>
              <TabsTrigger value="7d">{t("insights.range7")}</TabsTrigger>
              <TabsTrigger value="30d">{t("insights.range30")}</TabsTrigger>
              <TabsTrigger value="90d">{t("insights.range90")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {!familyId ? (
          <Card title="">
            <p className="text-muted-foreground">{t("insights.noFamily")}</p>
          </Card>
        ) : insights.isLoading ? (
          <LoadingSkeleton />
        ) : insights.data ? (
          <>
            <OxygenSection data={insights.data} />
            <VitalsSection data={insights.data} />
            <CarePlaceSection data={insights.data} />
            <MedsSection data={insights.data} />
            <HeatmapSection data={insights.data} />
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}

function Card({
  title,
  subtitle,
  children,
  right,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="card-soft p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          {title && (
            <h2 className="text-lg md:text-xl font-bold tracking-tight">{title}</h2>
          )}
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-muted/50 px-3 py-2 min-w-[100px]">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card-soft p-6 space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-64" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      ))}
    </div>
  );
}

function OxygenSection({ data }: { data: NonNullable<ReturnType<typeof useInsights>["data"]> }) {
  const { t } = useTranslation();
  const hasData = data.totals.oxygenHours > 0 || data.totals.tanksReplaced > 0;
  return (
    <Card title={t("insights.oxygenTitle")} subtitle={t("insights.oxygenSubtitle")}>
      <div className="flex flex-wrap gap-2">
        <Stat label={t("insights.oxygenHours")} value={data.totals.oxygenHours} />
        <Stat label={t("insights.oxygenTanks")} value={data.totals.tanksReplaced} />
        <Stat label={t("insights.oxygenAvgFlow")} value={data.totals.avgFlow} />
      </div>
      {hasData ? (
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.oxygen}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={shortDate}
              />
              <Line
                type="monotone"
                dataKey="hours"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                name={t("insights.oxygenHours")}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyHint />
      )}
    </Card>
  );
}

function VitalsSection({ data }: { data: NonNullable<ReturnType<typeof useInsights>["data"]> }) {
  const { t } = useTranslation();
  const label: Record<VitalSeries["type"], string> = {
    spo2: t("insights.vitalSpo2"),
    heart_rate: t("insights.vitalHr"),
    temperature: t("insights.vitalTemp"),
    breathing: t("insights.vitalBreathing"),
  };
  const series = data.vitals.filter((s) =>
    s.points.some((p) => p.count > 0),
  );
  return (
    <Card title={t("insights.vitalsTitle")} subtitle={t("insights.vitalsSubtitle")}>
      {series.length === 0 ? (
        <EmptyHint />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {series.map((s) => (
            <div key={s.type} className="rounded-xl border border-border/60 p-3">
              <div className="flex items-baseline justify-between mb-1">
                <div className="font-semibold">{label[s.type]}</div>
                <div className="text-xs text-muted-foreground">{s.unit}</div>
              </div>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={s.points}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={shortDate}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      width={32}
                      domain={["dataMin", "dataMax"]}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelFormatter={shortDate}
                    />
                    <Line
                      type="monotone"
                      dataKey="max"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={1}
                      dot={false}
                      name={t("insights.vitalsMax")}
                    />
                    <Line
                      type="monotone"
                      dataKey="avg"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                      name={t("insights.vitalsAvg")}
                    />
                    <Line
                      type="monotone"
                      dataKey="min"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={1}
                      dot={false}
                      name={t("insights.vitalsMin")}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function CarePlaceSection({ data }: { data: NonNullable<ReturnType<typeof useInsights>["data"]> }) {
  const { t } = useTranslation();
  const hasData = data.carePlace.some(
    (p) => p.done + p.late + p.missed > 0,
  );
  return (
    <Card title={t("insights.carePlaceTitle")} subtitle={t("insights.carePlaceSubtitle")}>
      {hasData ? (
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.carePlace}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                width={28}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={shortDate}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="done"
                stackId="a"
                fill="hsl(var(--primary))"
                name={t("insights.carePlaceDone")}
              />
              <Bar
                dataKey="late"
                stackId="a"
                fill="hsl(38 92% 60%)"
                name={t("insights.carePlaceLate")}
              />
              <Bar
                dataKey="missed"
                stackId="a"
                fill="hsl(var(--destructive))"
                name={t("insights.carePlaceMissed")}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyHint />
      )}
    </Card>
  );
}

function MedsSection({ data }: { data: NonNullable<ReturnType<typeof useInsights>["data"]> }) {
  const { t } = useTranslation();
  const hasData = data.meds.some((p) => p.expected > 0);
  return (
    <Card
      title={t("insights.medsTitle")}
      subtitle={t("insights.medsSubtitle")}
      right={
        data.totals.medsOnTimePct !== null ? (
          <Stat
            label={t("insights.medsOnTime")}
            value={`${data.totals.medsOnTimePct}%`}
          />
        ) : null
      }
    >
      {hasData ? (
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.meds}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                width={32}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={shortDate}
                formatter={(v: number) => [`${v}%`, t("insights.medsOnTime")]}
              />
              <Line
                type="monotone"
                dataKey="percent"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyHint />
      )}
    </Card>
  );
}

function HeatmapSection({ data }: { data: NonNullable<ReturnType<typeof useInsights>["data"]> }) {
  const { t } = useTranslation();
  const days = t("insights.daysShort").split(",");
  const max = useMemo(
    () => data.heatmap.reduce((m, c) => Math.max(m, c.count), 0),
    [data.heatmap],
  );
  return (
    <Card title={t("insights.heatmapTitle")} subtitle={t("insights.heatmapSubtitle")}>
      {max === 0 ? (
        <p className="text-sm text-muted-foreground">{t("insights.heatmapNone")}</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-grid" style={{ gridTemplateColumns: `auto repeat(24, minmax(14px, 1fr))` }}>
            <div />
            {Array.from({ length: 24 }).map((_, h) => (
              <div
                key={h}
                className="text-[10px] text-muted-foreground text-center"
              >
                {h % 3 === 0 ? h : ""}
              </div>
            ))}
            {Array.from({ length: 7 }).map((_, dow) => (
              <div key={`row-${dow}`} className="contents">
                <div className="text-[10px] text-muted-foreground pr-1 flex items-center">
                  {days[dow] ?? ""}
                </div>
                {Array.from({ length: 24 }).map((_, hour) => {
                  const cell = data.heatmap.find(
                    (c) => c.dow === dow && c.hour === hour,
                  );
                  const count = cell?.count ?? 0;
                  const intensity = max > 0 ? count / max : 0;
                  return (
                    <div
                      key={`${dow}-${hour}`}
                      title={`${days[dow]} ${hour}:00 — ${count}`}
                      className="aspect-square m-[1px] rounded-sm"
                      style={{
                        background:
                          count === 0
                            ? "hsl(var(--muted) / 0.4)"
                            : `hsl(var(--destructive) / ${0.25 + intensity * 0.75})`,
                      }}
                    />
                  );
                })}
              </div>
            ))}

          </div>
        </div>
      )}
    </Card>
  );
}

function EmptyHint() {
  const { t } = useTranslation();
  return <p className="text-sm text-muted-foreground">{t("insights.empty")}</p>;
}

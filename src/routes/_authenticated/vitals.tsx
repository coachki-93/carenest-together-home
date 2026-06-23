import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Heart,
  Activity,
  Thermometer,
  Droplet,
  Scale,
  Zap,
  CircleDot,
  Wind,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  ReferenceArea,
} from "recharts";
import { DashboardLayout } from "@/components/carenest/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "@/lib/notify";
import { useMyMembership } from "@/lib/auth/use-profile";
import { useFamilyChild } from "@/lib/data/medications";
import {
  useVitals,
  useLatestVitals,
  useLogVital,
  useDeleteVital,
  DEFAULT_UNIT,
  VITAL_TYPES,
  getVitalRanges,
  ageMonthsFromDob,
  vitalStatus,
  type Vital,
  type VitalType,
} from "@/lib/data/vitals";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/vitals")({
  head: () => ({ meta: [{ title: "Vitals — CareNest" }] }),
  component: VitalsPage,
});

const TYPE_ICONS: Record<VitalType, typeof Heart> = {
  heart_rate: Heart,
  spo2: Activity,
  temperature: Thermometer,
  weight: Scale,
  seizure: Zap,
  fluids: Droplet,
  breathing: Wind,
  other: CircleDot,
};

const TYPE_TONES: Record<VitalType, { bg: string; fg: string; stroke: string }> = {
  heart_rate: { bg: "bg-primary-soft", fg: "text-primary", stroke: "var(--primary)" },
  spo2: { bg: "bg-success/20", fg: "text-success-foreground", stroke: "var(--success)" },
  temperature: { bg: "bg-warning/20", fg: "text-warning-foreground", stroke: "var(--warning)" },
  weight: { bg: "bg-lavender-deep/40", fg: "text-accent-foreground", stroke: "var(--lavender-deep)" },
  seizure: { bg: "bg-destructive/15", fg: "text-destructive", stroke: "var(--destructive)" },
  fluids: { bg: "bg-primary-soft", fg: "text-primary", stroke: "var(--primary)" },
  breathing: { bg: "bg-success/20", fg: "text-success-foreground", stroke: "var(--success)" },
  other: { bg: "bg-muted", fg: "text-muted-foreground", stroke: "var(--muted-foreground)" },
};

const HOURS: Record<"24h" | "7d" | "30d", number> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
};

function VitalsPage() {
  const { t, i18n } = useTranslation();
  const { data: membership } = useMyMembership();
  const familyId = membership?.family_id;
  const { data: child } = useFamilyChild(familyId);
  const [range, setRange] = useState<"24h" | "7d" | "30d">("24h");
  const [openLog, setOpenLog] = useState(false);
  const [presetType, setPresetType] = useState<VitalType | null>(null);
  const [confirmDel, setConfirmDel] = useState<Vital | null>(null);

  const sinceHours = HOURS[range];
  const { data: allVitals = [] } = useVitals(familyId, { sinceHours });
  const { data: latestMap } = useLatestVitals(familyId);
  const deleteVital = useDeleteVital();
  const now = useNow(60_000);
  const ageMonths = ageMonthsFromDob(child?.date_of_birth);

  // Vitals trimmed to the current range, used by trend charts + history.
  const rangeCutoff = now - sinceHours * 3_600_000;
  const vitals = useMemo(
    () => allVitals.filter((v) => new Date(v.logged_at).getTime() >= rangeCutoff),
    [allVitals, rangeCutoff],
  );

  const childName = child?.name ?? t("dashboard.yourChild");

  function openLogFor(type: VitalType | null) {
    setPresetType(type);
    setOpenLog(true);
  }

  if (!familyId) {
    return (
      <DashboardLayout title={t("vitals.title")}>
        <div className="card-soft p-8">{t("common.loading")}</div>
      </DashboardLayout>
    );
  }

  if (!child) {
    return (
      <DashboardLayout title={t("vitals.title")}>
        <div className="card-soft p-10 text-center max-w-xl mx-auto">
          <p className="text-muted-foreground mb-4">{t("vitals.noChildFirst")}</p>
          <Button asChild className="rounded-full">
            <Link to="/child">{t("vitals.goToChild")}</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Fluids today (sum)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const fluidsToday = vitals
    .filter((v) => v.vital_type === "fluids" && new Date(v.logged_at) >= todayStart)
    .reduce((sum, v) => sum + Number(v.value), 0);

  return (
    <DashboardLayout
      title={t("vitals.title")}
      subtitle={t("vitals.subtitle", { name: childName })}
      actions={
        <Button
          size="sm"
          className="rounded-full gap-1.5 font-bold"
          onClick={() => openLogFor(null)}
        >
          <Plus className="size-4" /> {t("vitals.logNew")}
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Overview tiles */}
        <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {(
            ["heart_rate", "spo2", "temperature", "breathing", "weight", "fluids"] as VitalType[]
          ).map((type) => {
            const latest = latestMap?.get(type);
            return (
              <VitalOverviewTile
                key={type}
                type={type}
                latest={latest}
                fluidsTodayTotal={type === "fluids" ? fluidsToday : undefined}
                onLog={() => openLogFor(type)}
                lang={i18n.language}
                ageMonths={ageMonths}
                now={now}
              />
            );
          })}
        </section>

        {/* Range selector */}
        <section className="flex items-center gap-2">
          <span className="text-sm font-semibold text-muted-foreground mr-2">
            {t("vitals.range")}:
          </span>
          {(["24h", "7d", "30d"] as const).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "outline"}
              className="rounded-full font-bold"
              onClick={() => setRange(r)}
            >
              {t(`vitals.range${r}` as const)}
            </Button>
          ))}
        </section>


        {/* Trend charts */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <TrendCard type="heart_rate" vitals={vitals} range={range} ageMonths={ageMonths} now={now} />
          <TrendCard type="spo2" vitals={vitals} range={range} ageMonths={ageMonths} now={now} />
          <TrendCard type="temperature" vitals={vitals} range={range} ageMonths={ageMonths} now={now} />
          <TrendCard type="breathing" vitals={vitals} range={range} ageMonths={ageMonths} now={now} />
          <FluidsChart vitals={vitals} range={range} />
        </section>

        {/* History */}
        <section className="card-soft p-6">
          <h3 className="text-lg font-extrabold mb-4">{t("vitals.history")}</h3>
          {vitals.length === 0 ? (
            <div className="text-center py-10">
              <p className="font-bold mb-1">{t("vitals.noReadings")}</p>
              <p className="text-sm text-muted-foreground mb-4">
                {t("vitals.noReadingsBody")}
              </p>
              <Button className="rounded-full" onClick={() => openLogFor(null)}>
                <Plus className="size-4 mr-1.5" /> {t("vitals.logNew")}
              </Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {vitals.slice(0, 50).map((v) => (
                <HistoryRow
                  key={v.id}
                  vital={v}
                  onDelete={() => setConfirmDel(v)}
                  lang={i18n.language}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      <LogReadingDialog
        open={openLog}
        onOpenChange={setOpenLog}
        familyId={familyId}
        childId={child.id}
        loggedBy={membership!.user_id}
        presetType={presetType}
      />

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("vitals.confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDel &&
                t("vitals.confirmDeleteBody", {
                  type: t(`vitals.${vitalI18nKey(confirmDel.vital_type)}`),
                  when: new Date(confirmDel.logged_at).toLocaleString(
                    i18n.language === "sv" ? "sv-SE" : "en-US",
                  ),
                })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-destructive hover:bg-destructive/90"
              onClick={async () => {
                if (!confirmDel) return;
                await deleteVital.mutateAsync(confirmDel.id);
                toast.success(t("vitals.deleted"));
                setConfirmDel(null);
              }}
            >
              {t("vitals.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

function vitalI18nKey(t: VitalType): string {
  switch (t) {
    case "heart_rate":
      return "heartRate";
    case "temperature":
      return "temp";
    default:
      return t;
  }
}

// Stale thresholds (in hours) — after this gap the tile shows "Due for check".
const STALE_HOURS: Partial<Record<VitalType, number>> = {
  heart_rate: 6,
  spo2: 6,
  temperature: 12,
};

// Precision per type when displaying numeric value.
function fmtVal(type: VitalType, n: number): string {
  if (type === "temperature") return n.toFixed(1);
  return Math.round(n).toString();
}

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function useRelativeTime(ts: number | null | undefined, now: number): string {
  const { t } = useTranslation();
  if (!ts) return t("vitals.noReadings");
  const diffMs = Math.max(0, now - ts);
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return t("vitals.relJustNow");
  if (mins < 60) return t("vitals.relMinutes", { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 48) return t("vitals.relHours", { count: hours });
  return t("vitals.relDays", { count: Math.floor(hours / 24) });
}

function VitalOverviewTile({
  type,
  latest,
  fluidsTodayTotal,
  onLog,
  lang,
  ageMonths,
  now,
}: {
  type: VitalType;
  latest?: Vital;
  fluidsTodayTotal?: number;
  onLog: () => void;
  lang: string;
  ageMonths: number | null;
  now: number;
}) {
  const { t } = useTranslation();
  const Icon = TYPE_ICONS[type];
  const tone = TYPE_TONES[type];
  const status = latest ? vitalStatus(type, Number(latest.value), ageMonths) : "neutral";
  const statusLabel = t(`vitals.status${capitalize(status)}` as const);
  const latestTs = latest ? new Date(latest.logged_at).getTime() : null;
  const rel = useRelativeTime(latestTs, now);
  const staleHours = STALE_HOURS[type];
  const isStale =
    type !== "fluids" &&
    latestTs != null &&
    staleHours != null &&
    now - latestTs > staleHours * 3_600_000;

  return (
    <button
      type="button"
      onClick={onLog}
      className={cn(
        "card-soft p-4 text-left hover:shadow-soft transition-shadow group",
        isStale && "ring-2 ring-warning/60",
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("size-10 rounded-2xl flex items-center justify-center", tone.bg)}>
          <Icon className={cn("size-5", tone.fg)} />
        </div>
        <span
          className={cn(
            "text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5",
            status === "ok" && "bg-success/20 text-success-foreground",
            status === "low" && "bg-warning/20 text-warning-foreground",
            status === "high" && "bg-destructive/15 text-destructive",
            status === "neutral" && "bg-muted text-muted-foreground",
          )}
        >
          {statusLabel}
        </span>
      </div>
      <div className="mt-3 text-xs font-semibold text-muted-foreground">
        {t(`vitals.${vitalI18nKey(type)}` as const)}
      </div>
      <div className="flex items-baseline gap-1 mt-0.5">
        {type === "fluids" ? (
          <>
            <span className="text-2xl font-extrabold">{fluidsTodayTotal ?? 0}</span>
            <span className="text-xs text-muted-foreground font-semibold">ml</span>
          </>
        ) : latest ? (
          <>
            <span className="text-2xl font-extrabold">{fmtVal(type, Number(latest.value))}</span>
            <span className="text-xs text-muted-foreground font-semibold">{latest.unit}</span>
          </>
        ) : (
          <span className="text-2xl font-extrabold text-muted-foreground">—</span>
        )}
      </div>
      <div className="text-[11px] text-muted-foreground mt-1 truncate">
        {type === "fluids" ? t("vitals.fluidsToday") : latest ? rel : t("vitals.noReadings")}
      </div>
      {isStale && (
        <div className="text-[10px] font-bold uppercase tracking-wider text-warning-foreground mt-1">
          {t("vitals.dueForCheck")}
        </div>
      )}
    </button>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function TrendCard({
  type,
  vitals,
  range,
  ageMonths,
  now,
}: {
  type: VitalType;
  vitals: Vital[];
  range: "24h" | "7d" | "30d";
  ageMonths: number | null;
  now: number;
}) {
  const { t, i18n } = useTranslation();
  const Icon = TYPE_ICONS[type];
  const tone = TYPE_TONES[type];
  const points = useMemo(
    () =>
      vitals
        .filter((v) => v.vital_type === type)
        .map((v) => ({
          ts: new Date(v.logged_at).getTime(),
          value: Number(v.value),
        }))
        .sort((a, b) => a.ts - b.ts),
    [vitals, type],
  );
  const ranges = useMemo(() => getVitalRanges(ageMonths), [ageMonths]);
  const r = ranges[type];
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const delta = last && prev ? last.value - prev.value : 0;
  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

  const stats = useMemo(() => {
    if (points.length === 0) return null;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    let abnormal = 0;
    let inRange = 0;
    for (const p of points) {
      sum += p.value;
      if (p.value < min) min = p.value;
      if (p.value > max) max = p.value;
      if (r) {
        if (p.value < r.low || p.value > r.high) abnormal += 1;
        else inRange += 1;
      }
    }
    return {
      avg: sum / points.length,
      min,
      max,
      abnormal,
      pctInRange: r ? Math.round((inRange / points.length) * 100) : null,
    };
  }, [points, r]);

  const relLast = useRelativeTime(last?.ts ?? null, now);

  return (
    <div className="card-soft p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn("size-9 rounded-xl flex items-center justify-center shrink-0", tone.bg)}>
            <Icon className={cn("size-4.5", tone.fg)} />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold flex items-center gap-2">
              {t(`vitals.${vitalI18nKey(type)}` as const)}
              {r && (
                <TooltipProvider delayDuration={150}>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        {fmtVal(type, r.low)}–{fmtVal(type, r.high)}
                        <Info className="size-3" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[220px] text-xs">
                      {t("vitals.rangeInfoTooltip")}
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {t("vitals.trendLast", { count: HOURS[range] })}
              {stats && (
                <>
                  {" · "}
                  {t("vitals.avg")} {fmtVal(type, stats.avg)}
                  {` ${DEFAULT_UNIT[type]}`}
                </>
              )}
            </div>
            {stats && (
              <div className="text-[11px] text-muted-foreground">
                {t("vitals.minMax", {
                  min: fmtVal(type, stats.min),
                  max: fmtVal(type, stats.max),
                })}
                {type === "spo2" && stats.pctInRange != null && (
                  <> {" · "} {t("vitals.timeInRange", { pct: stats.pctInRange })}</>
                )}
                {stats.abnormal > 0 && (
                  <>
                    {" · "}
                    <span className="text-destructive font-bold">
                      {t("vitals.abnormalCount", { count: stats.abnormal })}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        {last && (
          <div className="text-right shrink-0">
            <div className="text-xl font-extrabold flex items-center gap-1 justify-end">
              <TrendIcon
                className={cn(
                  "size-4",
                  delta > 0 && "text-destructive",
                  delta < 0 && "text-primary",
                  delta === 0 && "text-muted-foreground",
                )}
              />
              {fmtVal(type, last.value)}
            </div>
            <div className="text-[10px] text-muted-foreground">{relLast}</div>
          </div>
        )}
      </div>
      <div className="h-44">
        {points.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            {t("vitals.noReadings")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="ts"
                type="number"
                domain={["dataMin", "dataMax"]}
                scale="time"
                tickFormatter={(v) =>
                  new Date(v).toLocaleTimeString(i18n.language === "sv" ? "sv-SE" : "en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                }
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                stroke="var(--border)"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                stroke="var(--border)"
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
                labelFormatter={(v) =>
                  new Date(v as number).toLocaleString(
                    i18n.language === "sv" ? "sv-SE" : "en-US",
                  )
                }
              />
              {r && (
                <ReferenceArea
                  y1={r.low}
                  y2={r.high}
                  fill="var(--success)"
                  fillOpacity={0.08}
                />
              )}
              <Line
                type="monotone"
                dataKey="value"
                stroke={tone.stroke}
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}




function FluidsChart({
  vitals,
  range,
}: {
  vitals: Vital[];
  range: "24h" | "7d" | "30d";
}) {
  const { t, i18n } = useTranslation();
  const tone = TYPE_TONES.fluids;
  // Bucket fluids by day for 7/30d, by hour for 24h.
  const bucketed = useMemo(() => {
    const fluids = vitals.filter((v) => v.vital_type === "fluids");
    const buckets = new Map<string, number>();
    for (const v of fluids) {
      const d = new Date(v.logged_at);
      const key =
        range === "24h"
          ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`
          : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      buckets.set(key, (buckets.get(key) ?? 0) + Number(v.value));
    }
    return Array.from(buckets.entries())
      .map(([k, v]) => {
        const [y, m, day, h] = k.split("-").map(Number);
        const d = new Date(y, m, day, h ?? 0);
        return { ts: d.getTime(), value: v };
      })
      .sort((a, b) => a.ts - b.ts);
  }, [vitals, range]);

  return (
    <div className="card-soft p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={cn("size-9 rounded-xl flex items-center justify-center", tone.bg)}>
            <Droplet className={cn("size-4.5", tone.fg)} />
          </div>
          <div>
            <div className="font-extrabold">{t("vitals.fluids")}</div>
            <div className="text-xs text-muted-foreground">
              {t("vitals.trendLast", { count: HOURS[range] })}
            </div>
          </div>
        </div>
      </div>
      <div className="h-44">
        {bucketed.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            {t("vitals.noReadings")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bucketed} margin={{ top: 5, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="ts"
                type="number"
                domain={["dataMin", "dataMax"]}
                scale="time"
                tickFormatter={(v) =>
                  range === "24h"
                    ? new Date(v).toLocaleTimeString(i18n.language === "sv" ? "sv-SE" : "en-US", {
                        hour: "2-digit",
                      })
                    : new Date(v).toLocaleDateString(i18n.language === "sv" ? "sv-SE" : "en-US", {
                        month: "short",
                        day: "numeric",
                      })
                }
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                stroke="var(--border)"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                stroke="var(--border)"
                tickFormatter={(v) => `${v}ml`}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
                formatter={(v) => [`${v} ml`, t("vitals.fluids")]}
                labelFormatter={(v) =>
                  new Date(v as number).toLocaleString(
                    i18n.language === "sv" ? "sv-SE" : "en-US",
                  )
                }
              />
              <Bar dataKey="value" fill={tone.stroke} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function HistoryRow({
  vital,
  onDelete,
  lang,
}: {
  vital: Vital;
  onDelete: () => void;
  lang: string;
}) {
  const { t } = useTranslation();
  const Icon = TYPE_ICONS[vital.vital_type];
  const tone = TYPE_TONES[vital.vital_type];
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border/60 p-3 hover:bg-muted/30 transition-colors">
      <div className={cn("size-10 rounded-2xl flex items-center justify-center shrink-0", tone.bg)}>
        <Icon className={cn("size-4.5", tone.fg)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold">
          {Number(vital.value)} {vital.unit} ·{" "}
          <span className="text-muted-foreground font-semibold">
            {t(`vitals.${vitalI18nKey(vital.vital_type)}` as const)}
          </span>
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {new Date(vital.logged_at).toLocaleString(lang === "sv" ? "sv-SE" : "en-US")}
          {vital.notes ? ` · ${vital.notes}` : ""}
        </div>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="rounded-full text-muted-foreground hover:text-destructive"
        onClick={onDelete}
        aria-label={t("vitals.delete")}
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}

function LogReadingDialog({
  open,
  onOpenChange,
  familyId,
  childId,
  loggedBy,
  presetType,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  familyId: string;
  childId: string;
  loggedBy: string;
  presetType: VitalType | null;
}) {
  const { t } = useTranslation();
  const logVital = useLogVital();
  const [type, setType] = useState<VitalType>(presetType ?? "heart_rate");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState(DEFAULT_UNIT[presetType ?? "heart_rate"]);
  const [notes, setNotes] = useState("");

  // Reset when opening
  useMemo(() => {
    if (open) {
      const t0 = presetType ?? "heart_rate";
      setType(t0);
      setUnit(DEFAULT_UNIT[t0]);
      setValue("");
      setNotes("");
    }
  }, [open, presetType]);

  async function submit() {
    const num = Number(value);
    if (!value.trim() || Number.isNaN(num)) {
      toast.error(t("vitals.valueRequired"));
      return;
    }
    await logVital.mutateAsync({
      family_id: familyId,
      child_id: childId,
      logged_by: loggedBy,
      vital_type: type,
      value: num,
      unit: unit || DEFAULT_UNIT[type],
      notes: notes.trim() || null,
    });
    toast.success(t("vitals.saved"));
    onOpenChange(false);
  }

  function onTypeChange(v: VitalType) {
    setType(v);
    setUnit(DEFAULT_UNIT[v]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-md">
        <DialogHeader>
          <DialogTitle>{t("vitals.logTitle")}</DialogTitle>
          <DialogDescription>{t("vitals.logSubtitle")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("vitals.type")}
            </Label>
            <Select value={type} onValueChange={(v) => onTypeChange(v as VitalType)}>
              <SelectTrigger className="rounded-xl h-11 mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {VITAL_TYPES.map((vt) => (
                  <SelectItem key={vt} value={vt}>
                    {t(`vitals.${vitalI18nKey(vt)}` as const)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label
                htmlFor="vital-value"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                {t("vitals.value")}
              </Label>
              <Input
                id="vital-value"
                type="number"
                inputMode="decimal"
                step="0.1"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="rounded-xl h-11 mt-1.5"
              />
            </div>
            <div>
              <Label
                htmlFor="vital-unit"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                {t("vitals.unit")}
              </Label>
              <Input
                id="vital-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="rounded-xl h-11 mt-1.5"
              />
            </div>
          </div>
          <div>
            <Label
              htmlFor="vital-notes"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              {t("vitals.notes")}
            </Label>
            <Textarea
              id="vital-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-xl mt-1.5"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            className="rounded-full font-bold"
            onClick={submit}
            disabled={logVital.isPending}
          >
            {logVital.isPending ? t("vitals.saving") : t("vitals.saveReading")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
  ChevronDown,
  ChevronUp,
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
  VITAL_CONTEXTS,
  getVitalRanges,
  parseRangeOverrides,
  ageMonthsFromDob,
  vitalStatus,
  type Vital,
  type VitalType,
  type VitalContext,
  type VitalRangeOverrides,
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
  const [showAllHistory, setShowAllHistory] = useState(false);

  function scrollToPediatricTable() {
    const el = document.getElementById("pediatric-ranges-table");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }


  const sinceHours = HOURS[range];
  const { data: allVitals = [] } = useVitals(familyId, { sinceHours });
  const { data: latestMap } = useLatestVitals(familyId);
  const deleteVital = useDeleteVital();
  const now = useNow(60_000);
  const ageMonths = ageMonthsFromDob(child?.date_of_birth);
  const rangeOverrides = useMemo(
    () => parseRangeOverrides(child?.custom_vital_ranges),
    [child?.custom_vital_ranges],
  );


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
        {/* Screening disclaimer */}
        <div className="rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground flex flex-col sm:flex-row sm:items-start gap-2">
          <div className="flex gap-2 flex-1">
            <Info className="size-4 shrink-0 mt-0.5" />
            <span>{t("vitals.disclaimer")}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full text-xs font-bold shrink-0"
            onClick={scrollToPediatricTable}
          >
            {t("vitals.seePediatricTable")}
          </Button>
        </div>


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
                overrides={rangeOverrides}
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
          <TrendCard type="heart_rate" vitals={vitals} range={range} ageMonths={ageMonths} overrides={rangeOverrides} now={now} />
          <TrendCard type="spo2" vitals={vitals} range={range} ageMonths={ageMonths} overrides={rangeOverrides} now={now} />
          <TrendCard type="temperature" vitals={vitals} range={range} ageMonths={ageMonths} overrides={rangeOverrides} now={now} />
          <TrendCard type="breathing" vitals={vitals} range={range} ageMonths={ageMonths} overrides={rangeOverrides} now={now} />
          <FluidsChart vitals={vitals} range={range} />
        </section>

        <WeightChart familyId={familyId} onLog={() => openLogFor("weight")} />



        {/* Pediatric reference table */}
        <PediatricRangesTable />

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
            <>
              <ul className="space-y-2">
                {(showAllHistory ? vitals.slice(0, 50) : vitals.slice(0, 5)).map((v) => (
                  <HistoryRow
                    key={v.id}
                    vital={v}
                    onDelete={() => setConfirmDel(v)}
                    lang={i18n.language}
                  />
                ))}
              </ul>
              {vitals.length > 5 && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full font-bold gap-1.5"
                    onClick={() => setShowAllHistory((s) => !s)}
                  >
                    {showAllHistory ? (
                      <>
                        {t("vitals.showLess")} <ChevronUp className="size-4" />
                      </>
                    ) : (
                      <>
                        {t("vitals.showMore")} <ChevronDown className="size-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
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
  overrides,
  now,
}: {
  type: VitalType;
  latest?: Vital;
  fluidsTodayTotal?: number;
  onLog: () => void;
  lang: string;
  ageMonths: number | null;
  overrides?: VitalRangeOverrides | null;
  now: number;
}) {
  const { t } = useTranslation();
  const Icon = TYPE_ICONS[type];
  const tone = TYPE_TONES[type];
  const status = latest ? vitalStatus(type, Number(latest.value), ageMonths, overrides) : "neutral";
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
  overrides,
  now,
}: {
  type: VitalType;
  vitals: Vital[];
  range: "24h" | "7d" | "30d";
  ageMonths: number | null;
  overrides?: VitalRangeOverrides | null;
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
  const ranges = useMemo(() => getVitalRanges(ageMonths, overrides), [ageMonths, overrides]);

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
                domain={[
                  (dataMin: number) =>
                    Math.floor(Math.min(dataMin, r?.low ?? dataMin) - 2),
                  (dataMax: number) =>
                    Math.ceil(Math.max(dataMax, r?.high ?? dataMax) + 2),
                ]}
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


const WEIGHT_RANGE_HOURS: Record<"3m" | "6m" | "1y" | "all", number | undefined> = {
  "3m": 24 * 90,
  "6m": 24 * 180,
  "1y": 24 * 365,
  all: undefined,
};

function WeightChart({ familyId, onLog }: { familyId: string; onLog: () => void }) {
  const { t, i18n } = useTranslation();
  const tone = TYPE_TONES.weight;
  const [wRange, setWRange] = useState<"3m" | "6m" | "1y" | "all">("6m");
  const sinceHours = WEIGHT_RANGE_HOURS[wRange];
  const { data: rows = [] } = useVitals(familyId, {
    types: ["weight"],
    sinceHours,
    limit: 500,
  });

  // Normalize every row to grams so mixed 'g' / 'kg' data plots consistently.
  const points = useMemo(
    () =>
      rows
        .map((v) => {
          const raw = Number(v.value);
          const grams = v.unit === "kg" ? raw * 1000 : raw;
          return { ts: new Date(v.logged_at).getTime(), value: grams };
        })
        .sort((a, b) => a.ts - b.ts),
    [rows],
  );

  const last = points[points.length - 1];
  const prev = points[points.length - 2];

  // One unit per render, chosen from the latest normalized reading.
  const displayInKg = !!last && last.value >= 10_000;
  const unit = displayInKg ? "kg" : "g";
  const toDisplay = (grams: number) => (displayInKg ? grams / 1000 : grams);

  const nf = useMemo(
    () =>
      new Intl.NumberFormat(i18n.language === "sv" ? "sv-SE" : "en-US", {
        maximumFractionDigits: displayInKg ? 1 : 0,
        minimumFractionDigits: 0,
      }),
    [i18n.language, displayInKg],
  );
  const nfDelta = useMemo(
    () =>
      new Intl.NumberFormat(i18n.language === "sv" ? "sv-SE" : "en-US", {
        maximumFractionDigits: displayInKg ? 1 : 0,
        minimumFractionDigits: 0,
        signDisplay: "always",
      }),
    [i18n.language, displayInKg],
  );

  const dateFmt = (v: number) =>
    new Date(v).toLocaleDateString(i18n.language === "sv" ? "sv-SE" : "en-US", {
      month: "short",
      day: "numeric",
      year: wRange === "1y" || wRange === "all" ? "2-digit" : undefined,
    });

  const RANGE_KEYS: Array<"3m" | "6m" | "1y" | "all"> = ["3m", "6m", "1y", "all"];

  const delta = last && prev ? last.value - prev.value : null;

  return (
    <section className="card-soft p-5">
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn("size-9 rounded-xl flex items-center justify-center shrink-0", tone.bg)}>
            <Scale className={cn("size-4.5", tone.fg)} />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold">{t("vitals.weightChart.title")}</div>
            {last && (
              <div className="text-xs text-muted-foreground">
                {nf.format(toDisplay(last.value))} {unit}
                {delta != null && delta !== 0 && (
                  <>
                    {" · "}
                    <span className="text-muted-foreground">
                      {nfDelta.format(toDisplay(delta))} {unit} {t("vitals.weightChart.sinceLast")}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="inline-flex rounded-full bg-muted p-1 text-xs">
          {RANGE_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setWRange(k)}
              className={cn(
                "px-3 py-1 rounded-full font-bold transition-colors",
                wRange === k ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {t(`vitals.weightChart.range.${k}` as const)}
            </button>
          ))}
        </div>
      </div>

      <div className="h-56">
        {points.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-2">
            <p className="font-bold">{t("vitals.weightChart.emptyTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("vitals.weightChart.emptyBody")}</p>
            <Button size="sm" className="rounded-full mt-1" onClick={onLog}>
              <Plus className="size-4 mr-1.5" /> {t("vitals.weightChart.logWeight")}
            </Button>
          </div>
        ) : points.length === 1 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-2">
            <p className="text-sm text-muted-foreground">{t("vitals.weightChart.needMore")}</p>
            <Button size="sm" variant="outline" className="rounded-full" onClick={onLog}>
              <Plus className="size-4 mr-1.5" /> {t("vitals.weightChart.logWeight")}
            </Button>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="ts"
                type="number"
                domain={["dataMin", "dataMax"]}
                scale="time"
                tickFormatter={dateFmt}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                stroke="var(--border)"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                stroke="var(--border)"
                domain={[
                  (dataMin: number) => {
                    const vals = points.map((p) => p.value);
                    const min = Math.min(...vals);
                    const max = Math.max(...vals);
                    const pad = Math.max((max - min) * 0.1, 0.2);
                    return Number((dataMin - pad).toFixed(2));
                  },
                  (dataMax: number) => {
                    const vals = points.map((p) => p.value);
                    const min = Math.min(...vals);
                    const max = Math.max(...vals);
                    const pad = Math.max((max - min) * 0.1, 0.2);
                    return Number((dataMax + pad).toFixed(2));
                  },
                ]}
                tickFormatter={(v) => nf.format(toDisplay(v as number))}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
                labelFormatter={(v) =>
                  new Date(v as number).toLocaleDateString(
                    i18n.language === "sv" ? "sv-SE" : "en-US",
                    { year: "numeric", month: "short", day: "numeric" },
                  )
                }
                formatter={(v) => [`${nf.format(toDisplay(v as number))} ${unit}`, t("vitals.weight")]}
              />
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
    </section>
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
            <BarChart data={bucketed} margin={{ top: 8, right: 12, left: 4, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="ts"
                type="number"
                domain={["dataMin", "dataMax"]}
                scale="time"
                padding={{ left: 24, right: 24 }}
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
                tickMargin={6}
                stroke="var(--border)"
              />

              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                stroke="var(--border)"
                tickFormatter={(v) => `${v}ml`}
                width={52}
                tickMargin={4}
                allowDecimals={false}
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
        <div className="font-bold flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span>{Number(vital.value)} {vital.unit}</span>
          <span className="text-muted-foreground font-semibold">
            · {t(`vitals.${vitalI18nKey(vital.vital_type)}` as const)}
          </span>
          {vital.context && (VITAL_CONTEXTS as readonly string[]).includes(vital.context) && (
            <span className="text-[10px] font-bold uppercase tracking-wider rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
              {t(`vitals.context.${vital.context}` as const)}
            </span>
          )}
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
  const [context, setContext] = useState<VitalContext | null>(null);

  // Reset when opening
  useMemo(() => {
    if (open) {
      const t0 = presetType ?? "heart_rate";
      setType(t0);
      setUnit(DEFAULT_UNIT[t0]);
      setValue("");
      setNotes("");
      setContext(null);
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
      context: context,
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
              {type === "weight" ? (
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger id="vital-unit" className="rounded-xl h-11 mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="vital-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="rounded-xl h-11 mt-1.5"
                />
              )}
            </div>
          </div>
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("vitals.contextLabel")}
            </Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {VITAL_CONTEXTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setContext(context === c ? null : c)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold border transition-colors",
                    context === c
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border bg-background hover:bg-muted",
                  )}
                >
                  {t(`vitals.context.${c}` as const)}
                </button>
              ))}
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

function PediatricRangesTable() {
  const { t } = useTranslation();
  const age = (k: string) => t(`vitals.pediatricTable.ages.${k}` as const);

  const hrRows = [
    { k: "0_1m", awake: "100–165 bpm", asleep: "90–160 bpm" },
    { k: "1_3m", awake: "100–165 bpm", asleep: "90–160 bpm" },
    { k: "3_6m", awake: "90–160 bpm", asleep: "80–150 bpm" },
    { k: "6_12m", awake: "80–155 bpm", asleep: "75–135 bpm" },
    { k: "1_2y", awake: "80–140 bpm", asleep: "70–120 bpm" },
    { k: "2_3y", awake: "80–135 bpm", asleep: "60–115 bpm" },
    { k: "3_5y", awake: "75–130 bpm", asleep: "60–110 bpm" },
    { k: "6_9y", awake: "70–115 bpm", asleep: "58–100 bpm" },
    { k: "10_12y", awake: "60–110 bpm", asleep: "55–95 bpm" },
    { k: "12_18y", awake: "60–100 bpm", asleep: "50–90 bpm" },
  ];

  const brRows = [
    { k: "0_3m", normal: "34–57", tachy: "≥ 60" },
    { k: "3_6m", normal: "33–55", tachy: "≥ 60" },
    { k: "6_12m", normal: "30–50", tachy: "≥ 50" },
    { k: "1_2y", normal: "25–40", tachy: "≥ 40" },
    { k: "2_3y", normal: "22–34", tachy: "≥ 40" },
    { k: "3_5y", normal: "20–29", tachy: "≥ 40" },
    { k: "6_9y", normal: "18–24", tachy: "≥ 30" },
    { k: "10_12y", normal: "16–22", tachy: "≥ 30" },
    { k: "12_18y", normal: "14–20", tachy: "≥ 30" },
  ];

  const spo2Rows = [
    { k: "1w_3m", normal: "95–100%", advice: "Below 94%", emerg: "Below 90%" },
    { k: "3m_18y", normal: "96–100%", advice: "Below 95%", emerg: "Below 92%" },
  ];

  const tempRows = [
    { k: "u3m", normal: "36.3–37.5 °C", fever: "≥ 38.0 °C" },
    { k: "3_6m", normal: "36.3–37.5 °C", fever: "≥ 38.0 °C" },
    { k: "6m_2y", normal: "36.3–37.5 °C", fever: "≥ 38.0 °C" },
    { k: "2_18y", normal: "36.1–37.5 °C", fever: "≥ 38.0 °C" },
  ];

  const methodKeys = ["rectal", "temporal", "tympanic", "oral", "axillary"] as const;

  const tabs = [
    { id: "hr" as const, label: t("vitals.pediatricTable.hr.title"), accent: "sky" },
    { id: "br" as const, label: t("vitals.pediatricTable.br.title"), accent: "emerald" },
    { id: "spo2" as const, label: t("vitals.pediatricTable.spo2.title"), accent: "orange" },
    { id: "temp" as const, label: t("vitals.pediatricTable.temp.title"), accent: "rose" },
  ];
  type TabId = (typeof tabs)[number]["id"];
  const [active, setActive] = useState<TabId>("hr");
  const accentMap: Record<string, { border: string; text: string; btn: string }> = {
    sky: {
      border: "border-l-sky-500",
      text: "text-sky-700 dark:text-sky-300",
      btn: "bg-sky-500 text-white hover:bg-sky-500 border-sky-500",
    },
    emerald: {
      border: "border-l-emerald-500",
      text: "text-emerald-700 dark:text-emerald-300",
      btn: "bg-emerald-500 text-white hover:bg-emerald-500 border-emerald-500",
    },
    orange: {
      border: "border-l-orange-500",
      text: "text-orange-700 dark:text-orange-300",
      btn: "bg-orange-500 text-white hover:bg-orange-500 border-orange-500",
    },
    rose: {
      border: "border-l-rose-500",
      text: "text-rose-700 dark:text-rose-300",
      btn: "bg-rose-500 text-white hover:bg-rose-500 border-rose-500",
    },
  };
  const activeTab = tabs.find((tb) => tb.id === active)!;
  const accent = accentMap[activeTab.accent];

  return (
    <section
      id="pediatric-ranges-table"
      className={"card-soft p-4 sm:p-5 scroll-mt-24"}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold">{t("vitals.pediatricTable.title")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("vitals.pediatricTable.subtitle")}
          </p>
        </div>
      </div>

      {/* Tab selector */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tabs.map((tb) => {
          const isActive = tb.id === active;
          const acc = accentMap[tb.accent];
          return (
            <button
              key={tb.id}
              type="button"
              onClick={() => setActive(tb.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                isActive
                  ? acc.btn
                  : "bg-background text-foreground border-border hover:bg-muted"
              }`}
            >
              {tb.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <h4 className={`text-base font-extrabold ${accent.text}`}>{activeTab.label}</h4>

        {active === "hr" && (
          <>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              {t("vitals.pediatricTable.hr.note")}
            </p>
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full text-xs sm:text-sm border-separate border-spacing-0 min-w-[480px]">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="py-1.5 pr-2">{t("vitals.pediatricTable.colAge")}</th>
                    <th className="py-1.5 pr-2">{t("vitals.pediatricTable.hr.colAwake")}</th>
                    <th className="py-1.5 pr-2">{t("vitals.pediatricTable.hr.colAsleep")}</th>
                  </tr>
                </thead>
                <tbody>
                  {hrRows.map((r) => (
                    <tr key={r.k}>
                      <td className="py-1.5 pr-2 font-semibold border-t border-border/60">
                        {age(r.k)}
                      </td>
                      <td className="py-1.5 pr-2 tabular-nums border-t border-border/60">
                        {r.awake}
                      </td>
                      <td className="py-1.5 pr-2 tabular-nums border-t border-border/60">
                        {r.asleep}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs mt-2 rounded-md bg-destructive/10 text-destructive px-2.5 py-1.5">
              {t("vitals.pediatricTable.hr.warning")}
            </p>
          </>
        )}

        {active === "br" && (
          <>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              {t("vitals.pediatricTable.br.note")}
            </p>
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full text-xs sm:text-sm border-separate border-spacing-0 min-w-[480px]">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="py-1.5 pr-2">{t("vitals.pediatricTable.colAge")}</th>
                    <th className="py-1.5 pr-2">{t("vitals.pediatricTable.br.colNormal")}</th>
                    <th className="py-1.5 pr-2">{t("vitals.pediatricTable.br.colTachy")}</th>
                  </tr>
                </thead>
                <tbody>
                  {brRows.map((r) => (
                    <tr key={r.k}>
                      <td className="py-1.5 pr-2 font-semibold border-t border-border/60">
                        {age(r.k)}
                      </td>
                      <td className="py-1.5 pr-2 tabular-nums border-t border-border/60">
                        {r.normal}
                      </td>
                      <td className="py-1.5 pr-2 tabular-nums border-t border-border/60">
                        {r.tachy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t("vitals.pediatricTable.br.footnote")}
            </p>
          </>
        )}

        {active === "spo2" && (
          <>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              {t("vitals.pediatricTable.spo2.note")}
            </p>
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full text-xs sm:text-sm border-separate border-spacing-0 min-w-[520px]">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="py-1.5 pr-2">{t("vitals.pediatricTable.colAge")}</th>
                    <th className="py-1.5 pr-2">{t("vitals.pediatricTable.spo2.colNormal")}</th>
                    <th className="py-1.5 pr-2">{t("vitals.pediatricTable.spo2.colAdvice")}</th>
                    <th className="py-1.5 pr-2">{t("vitals.pediatricTable.spo2.colEmergency")}</th>
                  </tr>
                </thead>
                <tbody>
                  {spo2Rows.map((r) => (
                    <tr key={r.k}>
                      <td className="py-1.5 pr-2 font-semibold border-t border-border/60">
                        {age(r.k)}
                      </td>
                      <td className="py-1.5 pr-2 tabular-nums border-t border-border/60">
                        {r.normal}
                      </td>
                      <td className="py-1.5 pr-2 tabular-nums border-t border-border/60">
                        {r.advice}
                      </td>
                      <td className="py-1.5 pr-2 tabular-nums border-t border-border/60">
                        {r.emerg}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs mt-2 rounded-md bg-destructive/10 text-destructive px-2.5 py-1.5">
              {t("vitals.pediatricTable.spo2.warning")}
            </p>

          </>
        )}

        {active === "temp" && (
          <>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              {t("vitals.pediatricTable.temp.note")}
            </p>
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full text-xs sm:text-sm border-separate border-spacing-0 min-w-[760px]">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="py-1.5 pr-2">{t("vitals.pediatricTable.colAge")}</th>
                    <th className="py-1.5 pr-2">{t("vitals.pediatricTable.temp.colNormal")}</th>
                    <th className="py-1.5 pr-2">{t("vitals.pediatricTable.temp.colFever")}</th>
                    <th className="py-1.5 pr-2">{t("vitals.pediatricTable.temp.colEmergency")}</th>
                    <th className="py-1.5 pr-2">{t("vitals.pediatricTable.temp.colSafe")}</th>
                  </tr>
                </thead>
                <tbody>
                  {tempRows.map((r) => (
                    <tr key={r.k}>
                      <td className="py-1.5 pr-2 font-semibold border-t border-border/60 align-top">
                        {age(r.k)}
                      </td>
                      <td className="py-1.5 pr-2 tabular-nums border-t border-border/60 align-top">
                        {r.normal}
                      </td>
                      <td className="py-1.5 pr-2 tabular-nums border-t border-border/60 align-top">
                        {r.fever}
                      </td>
                      <td className="py-1.5 pr-2 border-t border-border/60 align-top">
                        {t(`vitals.pediatricTable.temp.emergency.${r.k}` as const)}
                      </td>
                      <td className="py-1.5 pr-2 border-t border-border/60 align-top">
                        {t(`vitals.pediatricTable.temp.safe.${r.k}` as const)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs mt-2 rounded-md bg-muted/40 text-muted-foreground px-2.5 py-1.5">
              {t("vitals.pediatricTable.temp.assessmentNote")}
            </p>


            <div className="mt-4">
              <h5 className="text-sm font-bold mb-2">
                {t("vitals.pediatricTable.temp.methodTitle")}
              </h5>
              <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full text-xs sm:text-sm border-separate border-spacing-0 min-w-[520px]">
                  <thead>
                    <tr className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="py-1.5 pr-2">
                        {t("vitals.pediatricTable.temp.colMethod")}
                      </th>
                      <th className="py-1.5 pr-2">
                        {t("vitals.pediatricTable.temp.colOffset")}
                      </th>
                      <th className="py-1.5 pr-2">
                        {t("vitals.pediatricTable.temp.colSuitable")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {methodKeys.map((m) => (
                      <tr key={m}>
                        <td className="py-1.5 pr-2 font-semibold border-t border-border/60">
                          {t(`vitals.pediatricTable.temp.methods.${m}.name` as const)}
                        </td>
                        <td className="py-1.5 pr-2 border-t border-border/60">
                          {t(`vitals.pediatricTable.temp.methods.${m}.offset` as const)}
                        </td>
                        <td className="py-1.5 pr-2 border-t border-border/60">
                          {t(`vitals.pediatricTable.temp.methods.${m}.from` as const)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        {t("vitals.pediatricTable.footer")}
      </p>
    </section>
  );
}




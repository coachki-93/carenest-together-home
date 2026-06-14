import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Pill,
  Activity,
  Heart,
  Thermometer,
  Droplet,
  CheckCircle2,
  Clock,
  Plus,
  Sun,
  ChevronRight,
  Calendar,
  Briefcase,
  Stethoscope,
  CalendarClock,
  Sparkles,
  X,
} from "lucide-react";
import { DashboardLayout } from "@/components/carenest/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile, useMyMembership, useSession } from "@/lib/auth/use-profile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLatestVitals, useVitals, vitalStatus, DEFAULT_UNIT } from "@/lib/data/vitals";
import { useLatestHandover } from "@/lib/data/handovers";
import {
  buildTodaysDoses,
  useMedications,
  useMedLogs,
  useLogDose,
  type ScheduledDose,
} from "@/lib/data/medications";
import { useAppointments, type Appointment } from "@/lib/data/appointments";
import { useFamilyMembers, useInvites } from "@/lib/data/family";
import { useCaregiverProfiles, useSuggestedCaregiverProfile } from "@/lib/data/caregiver-profiles";
import { useActiveCaregiverProfile } from "@/lib/data/active-profile";
import { useShifts, expandShifts, type ShiftOccurrence } from "@/lib/data/shifts";
import { GuidedTour, type TourStep } from "@/components/carenest/GuidedTour";
import { isTourDone, markTourDone, resetTour } from "@/lib/onboarding/tour-state";
import { Link } from "@tanstack/react-router";
import { z } from "zod";

const dashboardSearch = z.object({
  tour: z.coerce.number().int().optional(),
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CareNest" }] }),
  validateSearch: dashboardSearch,
  component: DashboardPage,
});

type TaskKind = "medication" | "appointment" | "therapy" | "task" | "other";
interface TaskItem {
  id: string;
  time: string;
  title: string;
  detail: string;
  type: TaskKind;
  done: boolean;
  source: { kind: "dose"; dose: ScheduledDose } | { kind: "appt"; appt: Appointment };
}

function useChild() {
  const { data: membership } = useMyMembership();
  return useQuery({
    queryKey: ["dashboard-child", membership?.family_id],
    enabled: !!membership?.family_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("children")
        .select("*")
        .eq("family_id", membership!.family_id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

const TYPE_STYLES: Record<TaskKind, { icon: typeof Pill; bg: string; fg: string }> = {
  medication: { icon: Pill, bg: "bg-primary-soft", fg: "text-primary" },
  appointment: { icon: Stethoscope, bg: "bg-warning/20", fg: "text-warning-foreground" },
  therapy: { icon: Activity, bg: "bg-success/20", fg: "text-success-foreground" },
  task: { icon: Briefcase, bg: "bg-lavender-deep/40", fg: "text-accent-foreground" },
  other: { icon: Calendar, bg: "bg-secondary", fg: "text-foreground" },
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = startOfDay(d);
  x.setDate(x.getDate() + 1);
  return x;
}

function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { user } = useSession();
  const { data: profile } = useProfile();
  const { data: membership } = useMyMembership();
  const familyId = membership?.family_id;
  const { data: child, isLoading: childLoading } = useChild();
  const { data: latestVitals, isLoading: vitalsLoading } = useLatestVitals(familyId);
  const { data: fluidsToday } = useVitals(familyId, { types: ["fluids"], sinceHours: 24 });
  const { data: latestHandover, isLoading: handoverLoading } = useLatestHandover(familyId);
  const { data: members = [], isLoading: membersLoading } = useFamilyMembers(familyId);
  const { data: invites = [] } = useInvites(familyId);
  const { data: shifts = [], isLoading: shiftsLoading } = useShifts(familyId);
  const { data: caregiverProfiles = [] } = useCaregiverProfiles(familyId);

  // Tick every minute so the current/next shift stays accurate.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const { currentShifts, nextShifts } = useMemo(() => {
    const now = new Date(nowTick);
    const horizon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const occs = expandShifts(shifts, now, horizon).sort(
      (a, b) => a.start.getTime() - b.start.getTime(),
    );
    const current = occs.filter((o) => o.start <= now && o.end > now);
    const upcoming = occs.filter((o) => o.start > now);
    // Group "next" by the earliest upcoming start time (everyone starting then).
    const firstStart = upcoming[0]?.start.getTime() ?? null;
    const next = firstStart
      ? upcoming.filter((o) => o.start.getTime() === firstStart)
      : [];
    return { currentShifts: current, nextShifts: next };
  }, [shifts, nowTick]);

  const todayStart = useMemo(() => startOfDay(new Date()), []);
  const todayEnd = useMemo(() => endOfDay(new Date()), []);
  const { data: meds = [], isLoading: medsLoading } = useMedications(familyId);
  const { data: logs = [], isLoading: logsLoading } = useMedLogs(familyId, todayStart, todayEnd);
  const { data: appointments = [], isLoading: apptsLoading } = useAppointments(familyId, todayStart, todayEnd);
  const scheduleLoading = !!familyId && (medsLoading || logsLoading || apptsLoading || childLoading);

  const logDose = useLogDose();
  const { data: suggestedCaregiverId } = useSuggestedCaregiverProfile(familyId);
  const { activeId: activeCaregiverId } = useActiveCaregiverProfile(familyId, user?.id);
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [confirmTask, setConfirmTask] = useState<TaskItem | null>(null);
  const dismissKey = user?.id ? `carenest.resume.dismissed.${user.id}` : null;
  const [resumeDismissed, setResumeDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined" || !dismissKey) return false;
    try {
      return window.localStorage.getItem(dismissKey) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (typeof window === "undefined" || !dismissKey) return;
    try {
      setResumeDismissed(window.localStorage.getItem(dismissKey) === "1");
    } catch {
      /* ignore */
    }
  }, [dismissKey]);
  function dismissResume() {
    if (dismissKey) {
      try {
        window.localStorage.setItem(dismissKey, "1");
      } catch {
        /* ignore */
      }
    }
    setResumeDismissed(true);
  }

  // Guided tour state
  const [tourOpen, setTourOpen] = useState(false);
  useEffect(() => {
    if (!user?.id) return;
    if (search.tour === 1) {
      resetTour(user.id);
      setTourOpen(true);
      // Clear the param so reloads don't re-open.
      navigate({ to: "/dashboard", search: {}, replace: true });
      return;
    }
    if (!isTourDone(user.id)) {
      const tm = window.setTimeout(() => setTourOpen(true), 400);
      return () => window.clearTimeout(tm);
    }
  }, [user?.id, search.tour, navigate]);

  const tourSteps: TourStep[] = useMemo(
    () => [
      {
        target: '[data-tour="today-schedule"]',
        titleKey: "tour.scheduleTitle",
        bodyKey: "tour.scheduleBody",
      },
      {
        target: '[data-tour="vitals"]',
        titleKey: "tour.vitalsTitle",
        bodyKey: "tour.vitalsBody",
      },
      {
        target: '[data-tour="handover"]',
        titleKey: "tour.handoverTitle",
        bodyKey: "tour.handoverBody",
      },
      {
        target: '[data-tour="care-team"]',
        titleKey: "tour.teamTitle",
        bodyKey: "tour.teamBody",
      },
      {
        target: '[data-tour="sidebar"]',
        titleKey: "tour.navTitle",
        bodyKey: "tour.navBody",
      },
    ],
    [],
  );

  function closeTour() {
    if (user?.id) markTourDone(user.id);
    setTourOpen(false);
  }

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return t("dashboard.morning");
    if (h < 18) return t("dashboard.afternoon");
    return t("dashboard.evening");
  }, [t, i18n.language]);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString(i18n.language === "sv" ? "sv-SE" : "en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    [i18n.language],
  );

  const tasks: TaskItem[] = useMemo(() => {
    const items: TaskItem[] = [];
    const doses = buildTodaysDoses(meds, logs);
    const fmtTime = (d: Date) =>
      d.toLocaleTimeString(i18n.language === "sv" ? "sv-SE" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

    for (const d of doses) {
      const dose = d.medication;
      const amount = dose.dose_amount ?? "";
      const unit = dose.dose_unit ?? "";
      const detail = [amount && unit ? `${amount} ${unit}` : amount || unit, dose.route]
        .filter(Boolean)
        .join(" • ");
      items.push({
        id: `dose-${d.key}`,
        time: d.time,
        title: dose.name,
        detail,
        type: "medication",
        done: d.log?.status === "given",
        source: { kind: "dose", dose: d },
      });
    }

    for (const a of appointments) {
      const at = new Date(a.starts_at);
      const time = a.all_day ? t("dashboard.allDay") : fmtTime(at);
      const detail = [a.location, a.notes].filter(Boolean).join(" • ");
      items.push({
        id: `appt-${a.id}`,
        time,
        title: a.title,
        detail,
        type: (a.kind as TaskKind) ?? "other",
        done: false,
        source: { kind: "appt", appt: a },
      });
    }

    return items.sort((a, b) => a.time.localeCompare(b.time));
  }, [meds, logs, appointments, i18n.language, t]);

  const doneCount = tasks.filter((tk) => tk.done).length;
  const totalCount = tasks.length;
  const nextTask = tasks.find((tk) => !tk.done);

  async function confirmDone() {
    if (!confirmTask || !familyId || !child) return;
    if (confirmTask.source.kind !== "dose") {
      setConfirmTask(null);
      return;
    }
    try {
      await logDose.mutateAsync({
        family_id: familyId,
        child_id: child.id,
        medication_id: confirmTask.source.dose.medication.id,
        scheduled_for: confirmTask.source.dose.scheduled_for.toISOString(),
        status: "given",
        given_by: user?.id ?? null,
        caregiver_profile_id: activeCaregiverId ?? suggestedCaregiverId ?? null,
      });
      toast.success(t("dashboard.taskLogged", { title: confirmTask.title }));
    } catch (e) {
      toast.error((e as Error).message);
    }
    setConfirmTask(null);
  }

  const childName = child?.name ?? t("dashboard.yourChild");
  const firstName = profile?.full_name?.split(" ")[0] ?? "";

  return (
    <DashboardLayout
      title={t("dashboard.today")}
      subtitle={today}
      actions={
        <Button
          size="sm"
          className="rounded-full gap-1.5 font-semibold"
          onClick={() => navigate({ to: "/schedule" })}
        >
          <Plus className="size-4" /> {t("dashboard.logEvent")}
        </Button>
      }
    >
      {(() => {
        const isOwner = profile?.account_type === "family";
        const hasChild = !!child;
        const hasMeds = meds.length > 0;
        const hasInviteOrTeam = members.length > 1 || invites.length > 0;
        const setupComplete = hasChild && hasMeds && hasInviteOrTeam;
        if (!isOwner || setupComplete || resumeDismissed) return null;
        return (
          <div className="card-soft mb-6 p-4 flex items-center gap-3 border border-primary/30 bg-primary-soft/30">
            <Link
              to="/onboarding/child"
              search={{ step: hasChild ? (hasMeds ? 4 : 3) : 2 }}
              className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-90 transition-opacity"
            >
              <div className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <Sparkles className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold">{t("dashboard.resumeTitle")}</div>
                <div className="text-sm text-muted-foreground">
                  {!hasChild
                    ? t("dashboard.resumeChild")
                    : !hasMeds
                      ? t("dashboard.resumeMed")
                      : t("dashboard.resumeInvite")}
                </div>
              </div>
              <ChevronRight className="size-5 text-muted-foreground shrink-0" />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full shrink-0"
              onClick={dismissResume}
              aria-label={t("dashboard.resumeDismiss")}
            >
              <X className="size-4" />
            </Button>
          </div>
        );
      })()}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* LEFT — main column */}
        <div className="xl:col-span-2 space-y-6">
          {/* Hero greeting card */}
          <section className="card-soft p-6 md:p-8 relative overflow-hidden">
            <div
              className="absolute -top-16 -right-16 size-48 rounded-full opacity-60"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in oklab, var(--primary) 35%, transparent), transparent 70%)",
              }}
            />
            <div className="relative flex items-center gap-2 text-primary font-bold text-sm mb-1">
              <Sun className="size-4" /> {greeting}{firstName ? `, ${firstName}` : ""}
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {t("dashboard.heroLine", { name: childName })}
            </h2>
            <div className="mt-5 flex items-center gap-6 flex-wrap">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("dashboard.progress")}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold">{doneCount}</span>
                  <span className="text-muted-foreground font-semibold">
                    / {totalCount} {t("dashboard.tasks")}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-[120px]">
                <div className="h-3 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-lavender-deep transition-all duration-500"
                    style={{ width: `${totalCount ? (doneCount / totalCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
              {nextTask && (
                <div className="text-right">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("dashboard.upNext")}
                  </div>
                  <div className="text-sm font-bold">
                    {nextTask.time} · {nextTask.title}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Today's schedule */}
          <section className="card-soft p-6" data-tour="today-schedule">

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold">{t("dashboard.todaysSchedule")}</h3>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-primary font-semibold"
                onClick={() => navigate({ to: "/schedule" })}
              >
                {t("dashboard.viewFull")} <ChevronRight className="size-4" />
              </Button>
            </div>
            {scheduleLoading ? (
              <ul className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 md:gap-4 rounded-2xl border border-border/60 p-3 md:p-4 bg-card"
                  >
                    <Skeleton className="h-4 w-12 rounded" />
                    <Skeleton className="size-11 rounded-2xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/2 rounded" />
                      <Skeleton className="h-3 w-1/3 rounded" />
                    </div>
                    <Skeleton className="h-8 w-20 rounded-full" />
                  </li>
                ))}
              </ul>
            ) : tasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                <CalendarClock className="size-8 mx-auto text-muted-foreground mb-2" />
                <p className="font-bold mb-1">{t("dashboard.emptyTitle")}</p>
                <p className="text-sm text-muted-foreground mb-4">{t("dashboard.emptyBody")}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => navigate({ to: "/medications" })}
                  >
                    {t("dashboard.addMedication")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => navigate({ to: "/schedule" })}
                  >
                    {t("dashboard.addEvent")}
                  </Button>
                </div>
              </div>
            ) : (
              <ul className="space-y-2">
                {tasks.map((task) => {
                  const style = TYPE_STYLES[task.type] ?? TYPE_STYLES.other;
                  const Icon = style.icon;
                  const isDose = task.source.kind === "dose";
                  return (
                    <li
                      key={task.id}
                      className={cn(
                        "group flex items-center gap-3 md:gap-4 rounded-2xl border border-border/60 p-3 md:p-4 transition-all",
                        task.done ? "bg-success/5 opacity-70" : "bg-card hover:shadow-soft",
                      )}
                    >
                      <div className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground w-14 shrink-0">
                        <Clock className="size-3.5" />
                        {task.time}
                      </div>
                      <div
                        className={cn(
                          "size-11 rounded-2xl flex items-center justify-center shrink-0",
                          style.bg,
                        )}
                      >
                        <Icon className={cn("size-5", style.fg)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={cn(
                            "font-bold truncate",
                            task.done && "line-through text-muted-foreground",
                          )}
                        >
                          {task.title}
                        </div>
                        {task.detail && (
                          <div className="text-sm text-muted-foreground truncate">
                            {task.detail}
                          </div>
                        )}
                      </div>
                      {task.done ? (
                        <div className="flex items-center gap-1.5 text-success-foreground bg-success/20 rounded-full px-3 py-1.5 text-sm font-bold">
                          <CheckCircle2 className="size-4" /> {t("dashboard.done")}
                        </div>
                      ) : isDose ? (
                        <Button
                          size="sm"
                          className="rounded-full font-bold"
                          onClick={() => setConfirmTask(task)}
                        >
                          {t("dashboard.markDone")}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full font-bold"
                          onClick={() => navigate({ to: "/schedule" })}
                        >
                          {t("dashboard.open")}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* RIGHT — sidebar column */}
        <div className="space-y-6">
          {/* Vitals snapshot */}
          <section className="card-soft p-6" data-tour="vitals">

            {vitalsLoading ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-5 w-32 rounded" />
                  <Skeleton className="h-4 w-16 rounded" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-2xl" />
                  ))}
                </div>
                <Skeleton className="w-full h-10 mt-4 rounded-full" />
              </>
            ) : (() => {
              const hr = latestVitals?.get("heart_rate");
              const spo2 = latestVitals?.get("spo2");
              const temp = latestVitals?.get("temperature");
              const fluidsTotal = (fluidsToday ?? []).reduce(
                (sum, v) => sum + Number(v.value ?? 0),
                0,
              );
              const mostRecent = [hr, spo2, temp]
                .filter((v): v is NonNullable<typeof v> => !!v)
                .sort((a, b) => +new Date(b.logged_at) - +new Date(a.logged_at))[0];
              const lastTime = mostRecent
                ? new Date(mostRecent.logged_at).toLocaleTimeString(
                    i18n.language === "sv" ? "sv-SE" : "en-US",
                    { hour: "2-digit", minute: "2-digit" },
                  )
                : "—";
              const fmt = (n: number) =>
                Number.isFinite(n) ? (Math.abs(n) >= 10 ? n.toFixed(0) : n.toFixed(1)) : "—";
              const toneFor = (
                type: "heart_rate" | "spo2" | "temperature",
                v: number | undefined,
                fallback: "primary" | "success" | "warning" | "lavender",
              ): "primary" | "success" | "warning" | "lavender" => {
                if (v === undefined) return fallback;
                const s = vitalStatus(type, v);
                if (s === "ok") return "success";
                if (s === "low" || s === "high") return "warning";
                return fallback;
              };
              return (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-extrabold">{t("dashboard.vitalsSnapshot")}</h3>
                    <span className="text-xs text-muted-foreground">
                      {t("dashboard.lastLogged", { time: lastTime })}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <VitalTile
                      icon={Heart}
                      label={t("vitals.heartRate")}
                      value={hr ? fmt(Number(hr.value)) : "—"}
                      unit={hr?.unit ?? DEFAULT_UNIT.heart_rate}
                      tone={toneFor("heart_rate", hr ? Number(hr.value) : undefined, "primary")}
                    />
                    <VitalTile
                      icon={Activity}
                      label={t("vitals.spo2")}
                      value={spo2 ? fmt(Number(spo2.value)) : "—"}
                      unit={spo2?.unit ?? DEFAULT_UNIT.spo2}
                      tone={toneFor("spo2", spo2 ? Number(spo2.value) : undefined, "success")}
                    />
                    <VitalTile
                      icon={Thermometer}
                      label={t("vitals.temp")}
                      value={temp ? fmt(Number(temp.value)) : "—"}
                      unit={temp?.unit ?? DEFAULT_UNIT.temperature}
                      tone={toneFor("temperature", temp ? Number(temp.value) : undefined, "warning")}
                    />
                    <VitalTile
                      icon={Droplet}
                      label={t("vitals.fluids")}
                      value={fluidsTotal > 0 ? String(Math.round(fluidsTotal)) : "—"}
                      unit={DEFAULT_UNIT.fluids}
                      tone="lavender"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-4 rounded-full font-bold"
                    onClick={() => navigate({ to: "/vitals" })}
                  >
                    {t("dashboard.logVitals")}
                  </Button>
                </>
              );
            })()}
          </section>

          {/* Handover preview */}
          <section className="card-soft p-6" data-tour="handover">

            {handoverLoading ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-5 w-32 rounded" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-3/4 mb-2 rounded" />
                <Skeleton className="h-4 w-2/3 mb-2 rounded" />
                <Skeleton className="h-4 w-1/2 rounded" />
                <Skeleton className="w-full h-10 mt-4 rounded-full" />
              </>
            ) : (() => {
              const fmt = new Intl.DateTimeFormat(
                i18n.language === "sv" ? "sv-SE" : "en-US",
                { weekday: "short", hour: "2-digit", minute: "2-digit" },
              );
              return (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-extrabold">{t("dashboard.handover")}</h3>
                    {latestHandover && (
                      <span className="text-xs font-semibold text-primary bg-primary-soft rounded-full px-2.5 py-1">
                        {fmt.format(new Date(latestHandover.created_at))}
                      </span>
                    )}
                  </div>
                  {latestHandover ? (
                    <>
                      {latestHandover.summary && (
                        <p className="text-sm mb-3 italic">"{latestHandover.summary}"</p>
                      )}
                      <ul className="space-y-2 text-sm">
                        {latestHandover.sleep && (
                          <HandoverItem label={t("dashboard.sleep")} value={latestHandover.sleep} />
                        )}
                        {latestHandover.mood && (
                          <HandoverItem label={t("dashboard.mood")} value={latestHandover.mood} />
                        )}
                        {latestHandover.seizures && (
                          <HandoverItem
                            label={t("dashboard.seizures")}
                            value={latestHandover.seizures}
                          />
                        )}
                        {latestHandover.notes && (
                          <HandoverItem
                            label={t("dashboard.notes")}
                            value={latestHandover.notes}
                          />
                        )}
                      </ul>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-3">
                      {t("dashboard.handoverIntro")}
                    </p>
                  )}
                  <Button
                    variant="secondary"
                    className="w-full mt-4 rounded-full font-bold"
                    onClick={() => navigate({ to: "/handover" })}
                  >
                    {t("dashboard.openHandover")}
                  </Button>
                </>
              );
            })()}
          </section>

          {/* On shift now / Next shift */}
          <section className="card-soft p-6" data-tour="care-team">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold">{t("dashboard.onShift")}</h3>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-primary font-semibold"
                onClick={() => navigate({ to: "/shifts" })}
              >
                {t("dashboard.manage")} <ChevronRight className="size-4" />
              </Button>
            </div>
            <div className="space-y-4">
              {shiftsLoading ? (
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                </div>
              ) : (
                <>
                  <ShiftSlot
                    label={t("dashboard.onShift")}
                    shift={currentShift}
                    emptyLabel={t("dashboard.noOneOnShift")}
                    members={members}
                    profiles={caregiverProfiles}
                    youUserId={user?.id}
                    youLabel={t("dashboard.youLabel")}
                    unassignedLabel={t("dashboard.shiftUnassigned")}
                    locale={i18n.language === "sv" ? "sv-SE" : "en-US"}
                    t={t}
                    accent
                  />
                  <div className="border-t border-border/60" />
                  <ShiftSlot
                    label={t("dashboard.nextShift")}
                    shift={nextShift}
                    emptyLabel={t("dashboard.noUpcomingShift")}
                    members={members}
                    profiles={caregiverProfiles}
                    youUserId={user?.id}
                    youLabel={t("dashboard.youLabel")}
                    unassignedLabel={t("dashboard.shiftUnassigned")}
                    locale={i18n.language === "sv" ? "sv-SE" : "en-US"}
                    t={t}
                  />
                </>
              )}
            </div>
          </section>

        </div>
      </div>

      <AlertDialog open={!!confirmTask} onOpenChange={(o) => !o && setConfirmTask(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dashboard.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTask && t("dashboard.confirmBody", { title: confirmTask.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction className="rounded-full" onClick={confirmDone}>
              {t("dashboard.yesLog")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <GuidedTour
        open={tourOpen}
        steps={tourSteps}
        onClose={closeTour}
        onFinish={closeTour}
      />
    </DashboardLayout>
  );
}

function VitalTile({
  icon: Icon,
  label,
  value,
  unit,
  tone,
}: {
  icon: typeof Heart;
  label: string;
  value: string;
  unit: string;
  tone: "primary" | "success" | "warning" | "lavender";
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary-soft text-primary",
    success: "bg-success/20 text-success-foreground",
    warning: "bg-warning/20 text-warning-foreground",
    lavender: "bg-lavender-deep/40 text-accent-foreground",
  };
  return (
    <div className="rounded-2xl border border-border/60 p-3">
      <div className={cn("size-9 rounded-xl flex items-center justify-center mb-2", tones[tone])}>
        <Icon className="size-4.5" />
      </div>
      <div className="text-xs text-muted-foreground font-semibold">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-extrabold">{value}</span>
        <span className="text-xs text-muted-foreground font-semibold">{unit}</span>
      </div>
    </div>
  );
}

function HandoverItem({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex justify-between gap-3">
      <span className="text-muted-foreground font-semibold shrink-0">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </li>
  );
}

function CareMember({
  name,
  role,
  color,
  avatarUrl,
  you,
}: {
  name: string;
  role: string;
  color: string;
  avatarUrl?: string | null;
  you?: boolean;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  return (
    <div className="flex items-center gap-3">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="size-10 rounded-full object-cover shrink-0"
        />
      ) : (
        <div
          className="size-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{ backgroundColor: color }}
        >
          {initials || "•"}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-bold truncate">{name}</div>
        <div className="text-xs text-muted-foreground">{role}</div>
      </div>
      {you && (
        <span className="text-xs font-bold text-primary bg-primary-soft rounded-full px-2 py-0.5">
          ·
        </span>
      )}
    </div>
  );
}

function ShiftSlot({
  label,
  shift,
  emptyLabel,
  members,
  profiles,
  youUserId,
  youLabel,
  unassignedLabel,
  locale,
  t,
  accent,
}: {
  label: string;
  shift: ShiftOccurrence | null;
  emptyLabel: string;
  members: ReturnType<typeof useFamilyMembers>["data"] extends infer T ? (T extends undefined ? never : T) : never;
  profiles: ReturnType<typeof useCaregiverProfiles>["data"] extends infer T ? (T extends undefined ? never : T) : never;
  youUserId: string | undefined;
  youLabel: string;
  unassignedLabel: string;
  locale: string;
  t: (k: string, opts?: Record<string, unknown>) => string;
  accent?: boolean;
}) {
  const fmtTime = (d: Date) =>
    d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const fmtDay = (d: Date) => {
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow =
      d.getFullYear() === tomorrow.getFullYear() &&
      d.getMonth() === tomorrow.getMonth() &&
      d.getDate() === tomorrow.getDate();
    if (sameDay) return "";
    if (isTomorrow) return locale.startsWith("sv") ? "imorgon · " : "tomorrow · ";
    return d.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" }) + " · ";
  };

  if (!shift) {
    return (
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
          {label}
        </div>
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  const profile = shift.caregiverProfileId
    ? profiles.find((p) => p.id === shift.caregiverProfileId) ?? null
    : null;
  const member = members.find((m) => m.user_id === shift.caregiverUserId);
  const orgName = member?.profile?.full_name ?? null;

  const displayName = profile?.name ?? orgName ?? unassignedLabel;
  const color =
    profile?.color ?? shift.color ?? member?.profile?.avatar_color ?? member?.display_color ?? "#6C63FF";
  const subtitle = profile && orgName ? orgName : null;
  const isYou = !!youUserId && shift.caregiverUserId === youUserId;

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  const timeStr = t("dashboard.shiftTime", {
    start: fmtTime(shift.start),
    end: fmtTime(shift.end),
  });
  const prefix = fmtDay(shift.start);

  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
        {label}
      </div>
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl p-3",
          accent ? "bg-primary-soft/40 border border-primary/20" : "bg-secondary/40",
        )}
      >
        <div
          className="size-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{ backgroundColor: color }}
        >
          {initials || "•"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold truncate">{displayName}</span>
            {isYou && (
              <span className="text-[10px] font-bold text-primary bg-primary-soft rounded-full px-1.5 py-0.5 shrink-0">
                {youLabel}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {subtitle ? `${subtitle} · ` : ""}
            {prefix}
            {timeStr}
          </div>
        </div>
      </div>
    </div>
  );
}

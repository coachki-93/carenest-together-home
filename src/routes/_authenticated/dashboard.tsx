import { useMemo, useState } from "react";
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
} from "lucide-react";
import { DashboardLayout } from "@/components/carenest/DashboardLayout";
import { Button } from "@/components/ui/button";
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
import { useFamilyMembers } from "@/lib/data/family";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CareNest" }] }),
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
  const { data: child } = useChild();
  const { data: latestVitals } = useLatestVitals(familyId);
  const { data: fluidsToday } = useVitals(familyId, { types: ["fluids"], sinceHours: 24 });
  const { data: latestHandover } = useLatestHandover(familyId);
  const { data: members = [] } = useFamilyMembers(familyId);

  const todayStart = useMemo(() => startOfDay(new Date()), []);
  const todayEnd = useMemo(() => endOfDay(new Date()), []);
  const { data: meds = [] } = useMedications(familyId);
  const { data: logs = [] } = useMedLogs(familyId, todayStart, todayEnd);
  const { data: appointments = [] } = useAppointments(familyId, todayStart, todayEnd);

  const logDose = useLogDose();
  const navigate = useNavigate();
  const [confirmTask, setConfirmTask] = useState<TaskItem | null>(null);

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
          <section className="card-soft p-6">
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
            {tasks.length === 0 ? (
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
                  const style = TYPE_STYLES[task.type];
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
          <section className="card-soft p-6">
            {(() => {
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
          <section className="card-soft p-6">
            {(() => {
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

          {/* Care team */}
          <section className="card-soft p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold">{t("dashboard.onShift")}</h3>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-primary font-semibold"
                onClick={() => navigate({ to: "/caregivers" })}
              >
                {t("dashboard.manage")} <ChevronRight className="size-4" />
              </Button>
            </div>
            <div className="space-y-3">
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("dashboard.noMembers")}</p>
              ) : (
                members.map((m) => (
                  <CareMember
                    key={m.id}
                    name={m.profile?.full_name ?? "—"}
                    role={
                      m.role === "owner"
                        ? t("dashboard.owner")
                        : m.role === "caregiver"
                          ? t("dashboard.caregiver")
                          : t("dashboard.viewer")
                    }
                    color={m.profile?.avatar_color ?? m.display_color ?? "#6C63FF"}
                    avatarUrl={m.profile?.avatar_url ?? null}
                    you={m.user_id === user?.id}
                  />
                ))
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

import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Pill,
  Utensils,
  Activity,
  Moon,
  Heart,
  Thermometer,
  Droplet,
  CheckCircle2,
  Clock,
  Plus,
  Sun,
  ChevronRight,
} from "lucide-react";
import { DashboardLayout } from "@/components/carenest/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useProfile, useMyMembership } from "@/lib/auth/use-profile";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
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

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CareNest" }] }),
  component: DashboardPage,
});

type TaskType = "medication" | "feed" | "therapy" | "sleep";
interface Task {
  id: string;
  time: string;
  title: string;
  detail: string;
  type: TaskType;
  done?: boolean;
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

const TYPE_STYLES: Record<TaskType, { icon: typeof Pill; bg: string; fg: string }> = {
  medication: { icon: Pill, bg: "bg-primary-soft", fg: "text-primary" },
  feed: { icon: Utensils, bg: "bg-warning/20", fg: "text-warning-foreground" },
  therapy: { icon: Activity, bg: "bg-success/20", fg: "text-success-foreground" },
  sleep: { icon: Moon, bg: "bg-lavender-deep/40", fg: "text-accent-foreground" },
};

function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { data: profile } = useProfile();
  const { data: membership } = useMyMembership();
  const { data: child } = useChild();
  const { data: latestVitals } = useLatestVitals(membership?.family_id);
  const { data: fluidsToday } = useVitals(membership?.family_id, {
    types: ["fluids"],
    sinceHours: 24,
  });
  const navigate = useNavigate();
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [confirmTask, setConfirmTask] = useState<Task | null>(null);

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

  // Placeholder tasks — persisted logging arrives in a later step
  const tasks: Task[] = [
    { id: "1", time: "08:00", type: "medication", title: t("demo.med.keppra"), detail: "250mg • " + t("demo.oral") },
    { id: "2", time: "08:30", type: "feed", title: t("demo.feed.breakfast"), detail: "200ml • " + t("demo.viaTube") },
    { id: "3", time: "10:00", type: "therapy", title: t("demo.therapy.physio"), detail: "30 min • " + t("demo.withMaria") },
    { id: "4", time: "12:00", type: "medication", title: t("demo.med.baclofen"), detail: "10mg • " + t("demo.oral") },
    { id: "5", time: "12:30", type: "feed", title: t("demo.feed.lunch"), detail: "220ml • " + t("demo.viaTube") },
    { id: "6", time: "14:00", type: "sleep", title: t("demo.rest"), detail: t("demo.napWindow") },
    { id: "7", time: "16:00", type: "medication", title: t("demo.med.keppra"), detail: "250mg • " + t("demo.oral") },
    { id: "8", time: "18:30", type: "feed", title: t("demo.feed.dinner"), detail: "220ml • " + t("demo.viaTube") },
  ];
  const visibleTasks = tasks.map((tk) => ({ ...tk, done: completed.has(tk.id) }));
  const doneCount = visibleTasks.filter((t) => t.done).length;
  const nextTask = visibleTasks.find((t) => !t.done);

  function confirmDone() {
    if (!confirmTask) return;
    setCompleted((prev) => new Set(prev).add(confirmTask.id));
    toast.success(t("dashboard.taskLogged", { title: confirmTask.title }));
    setConfirmTask(null);
  }

  const childName = child?.name ?? t("dashboard.yourChild");
  const firstName = profile?.full_name?.split(" ")[0] ?? "";

  return (
    <DashboardLayout
      title={t("dashboard.today")}
      subtitle={today}
      actions={
        <Button size="sm" className="rounded-full gap-1.5 font-semibold">
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
                    / {visibleTasks.length} {t("dashboard.tasks")}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-[120px]">
                <div className="h-3 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-lavender-deep transition-all duration-500"
                    style={{ width: `${(doneCount / visibleTasks.length) * 100}%` }}
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
              <Button variant="ghost" size="sm" className="rounded-full text-primary font-semibold">
                {t("dashboard.viewFull")} <ChevronRight className="size-4" />
              </Button>
            </div>
            <ul className="space-y-2">
              {visibleTasks.map((task) => {
                const style = TYPE_STYLES[task.type];
                const Icon = style.icon;
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
                      <div className="text-sm text-muted-foreground truncate">{task.detail}</div>
                    </div>
                    {task.done ? (
                      <div className="flex items-center gap-1.5 text-success-foreground bg-success/20 rounded-full px-3 py-1.5 text-sm font-bold">
                        <CheckCircle2 className="size-4" /> {t("dashboard.done")}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="rounded-full font-bold"
                        onClick={() => setConfirmTask(task)}
                      >
                        {t("dashboard.markDone")}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
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
            <h3 className="text-lg font-extrabold mb-4">{t("dashboard.onShift")}</h3>
            <div className="space-y-3">
              <CareMember name={profile?.full_name ?? "—"} role={t("dashboard.youLabel")} color="#6C63FF" you />
              <CareMember name="Maria L." role={t("dashboard.therapist")} color="#7BC4A4" />
              <CareMember name="Jonas P." role={t("dashboard.caregiver")} color="#F2A65A" />
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
  you,
}: {
  name: string;
  role: string;
  color: string;
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
      <div
        className="size-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
        style={{ backgroundColor: color }}
      >
        {initials || "•"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold truncate">{name}</div>
        <div className="text-xs text-muted-foreground">{role}</div>
      </div>
      {you && (
        <span className="text-xs font-bold text-primary bg-primary-soft rounded-full px-2 py-0.5">
          {you ? "•" : ""}
        </span>
      )}
    </div>
  );
}

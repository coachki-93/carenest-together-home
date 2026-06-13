import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Pill, CheckCircle2, X, Plus, Clock, Undo2, CalendarClock } from "lucide-react";
import { DashboardLayout } from "@/components/carenest/DashboardLayout";
import { Button } from "@/components/ui/button";
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
import { useMyMembership, useSession } from "@/lib/auth/use-profile";
import {
  useFamilyChild,
  useMedications,
  useMedLogs,
  useLogDose,
  useDeleteLog,
  buildTodaysDoses,
  type ScheduledDose,
} from "@/lib/data/medications";

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({ meta: [{ title: "Schedule — CareNest" }] }),
  component: SchedulePage,
});

function SchedulePage() {
  const { t, i18n } = useTranslation();
  const { user } = useSession();
  const { data: membership } = useMyMembership();
  const familyId = membership?.family_id;
  const { data: child } = useFamilyChild(familyId);
  const { data: meds = [] } = useMedications(familyId);

  const { startOfDay, endOfDay, todayLabel } = useMemo(() => {
    const s = new Date();
    s.setHours(0, 0, 0, 0);
    const e = new Date(s);
    e.setDate(e.getDate() + 1);
    const fmt = new Intl.DateTimeFormat(i18n.language, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    return { startOfDay: s, endOfDay: e, todayLabel: fmt.format(s) };
  }, [i18n.language]);

  const { data: logs = [] } = useMedLogs(familyId, startOfDay, endOfDay);
  const doses = useMemo(() => buildTodaysDoses(meds, logs), [meds, logs]);

  const logDose = useLogDose();
  const deleteLog = useDeleteLog();
  const [confirm, setConfirm] = useState<
    { dose: ScheduledDose; status: "given" | "skipped" } | null
  >(null);

  const now = new Date();
  const stats = {
    given: doses.filter((d) => d.log?.status === "given").length,
    total: doses.length,
  };

  const submitConfirm = async () => {
    if (!confirm || !familyId || !child) return;
    try {
      await logDose.mutateAsync({
        family_id: familyId,
        child_id: child.id,
        medication_id: confirm.dose.medication.id,
        scheduled_for: confirm.dose.scheduled_for.toISOString(),
        status: confirm.status,
        given_by: user?.id ?? null,
      });
      toast.success(
        confirm.status === "given" ? t("schedule.doseLogged") : t("schedule.doseSkipped"),
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
    setConfirm(null);
  };

  return (
    <DashboardLayout
      title={t("schedule.title")}
      subtitle={todayLabel}
      actions={
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/medications">
            <Plus className="size-4" /> {t("schedule.addMedication")}
          </Link>
        </Button>
      }
    >
      <div className="card-soft p-5 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{t("dashboard.progress")}</p>
          <p className="text-2xl font-extrabold">
            {stats.given} / {stats.total}{" "}
            <span className="text-base font-semibold text-muted-foreground">
              {t("dashboard.tasks")}
            </span>
          </p>
        </div>
        <div className="size-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center">
          <CalendarClock className="size-7" />
        </div>
      </div>

      {doses.length === 0 ? (
        <div className="card-soft p-10 text-center max-w-md mx-auto">
          <div className="size-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mx-auto mb-4">
            <Pill className="size-7" />
          </div>
          <h2 className="text-xl font-extrabold mb-2">{t("schedule.noScheduled")}</h2>
          <p className="text-muted-foreground mb-6">{t("schedule.noScheduledBody")}</p>
          <Button asChild className="rounded-full">
            <Link to="/medications">
              <Plus className="size-4" /> {t("schedule.addMedication")}
            </Link>
          </Button>
        </div>
      ) : (
        <ol className="space-y-3">
          {doses.map((d) => (
            <DoseRow
              key={d.key}
              dose={d}
              now={now}
              onMark={(status) => setConfirm({ dose: d, status })}
              onUndo={() => {
                if (d.log) {
                  deleteLog.mutate(d.log.id, {
                    onSuccess: () => toast.success(t("schedule.doseUndone")),
                    onError: (e) => toast.error((e as Error).message),
                  });
                }
              }}
            />
          ))}
        </ol>
      )}

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.status === "given"
                ? t("schedule.confirmGiveTitle")
                : t("schedule.confirmSkipTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm &&
                (confirm.status === "given"
                  ? t("schedule.confirmGiveBody", {
                      name: confirm.dose.medication.name,
                      dose:
                        [confirm.dose.medication.dose_amount, confirm.dose.medication.dose_unit]
                          .filter(Boolean)
                          .join(" ") || "—",
                      time: confirm.dose.time,
                    })
                  : t("schedule.confirmSkipBody", {
                      name: confirm.dose.medication.name,
                      time: confirm.dose.time,
                    }))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={submitConfirm}>
              {confirm?.status === "given"
                ? t("schedule.confirmGive")
                : t("schedule.confirmSkip")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

function DoseRow({
  dose,
  now,
  onMark,
  onUndo,
}: {
  dose: ScheduledDose;
  now: Date;
  onMark: (status: "given" | "skipped") => void;
  onUndo: () => void;
}) {
  const { t } = useTranslation();
  const status = dose.log?.status;
  const isOverdue = !status && dose.scheduled_for < now;
  const med = dose.medication;
  const dose_label = [med.dose_amount, med.dose_unit].filter(Boolean).join(" ");
  const color = med.color ?? "#A78BFA";

  return (
    <li
      className={cn(
        "card-soft p-4 flex items-center gap-4 transition-opacity",
        status === "given" && "opacity-70",
        status === "skipped" && "opacity-60",
      )}
    >
      <div className="text-center shrink-0 w-16">
        <div className="text-xl font-extrabold tabular-nums">{dose.time}</div>
        {isOverdue && (
          <div className="text-[10px] font-bold uppercase text-destructive mt-0.5">
            {t("schedule.overdue")}
          </div>
        )}
      </div>

      <div
        className="size-12 rounded-2xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: color + "33", color }}
      >
        <Pill className="size-6" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-extrabold truncate">{med.name}</h3>
          <StatusBadge status={status} />
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {dose_label || "—"} · {t(`meds.route${routeKey(med.route)}`)}
        </p>
        {med.instructions && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{med.instructions}</p>
        )}
      </div>

      <div className="flex gap-2 shrink-0">
        {!status && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => onMark("skipped")}
            >
              <X className="size-4" /> <span className="hidden sm:inline">{t("schedule.skip")}</span>
            </Button>
            <Button size="sm" className="rounded-full" onClick={() => onMark("given")}>
              <CheckCircle2 className="size-4" />{" "}
              <span className="hidden sm:inline">{t("schedule.markGiven")}</span>
            </Button>
          </>
        )}
        {status && (
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full"
            onClick={onUndo}
            aria-label={t("schedule.undo")}
          >
            <Undo2 className="size-4" />
            <span className="hidden sm:inline">{t("schedule.undo")}</span>
          </Button>
        )}
      </div>
    </li>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const { t } = useTranslation();
  if (!status) {
    return (
      <span className="text-[10px] font-bold uppercase rounded-full bg-muted text-muted-foreground px-2 py-0.5 inline-flex items-center gap-1">
        <Clock className="size-3" /> {t("schedule.statusPending")}
      </span>
    );
  }
  if (status === "given") {
    return (
      <span className="text-[10px] font-bold uppercase rounded-full bg-green-100 text-green-700 px-2 py-0.5 inline-flex items-center gap-1">
        <CheckCircle2 className="size-3" /> {t("schedule.statusGiven")}
      </span>
    );
  }
  if (status === "skipped") {
    return (
      <span className="text-[10px] font-bold uppercase rounded-full bg-amber-100 text-amber-700 px-2 py-0.5">
        {t("schedule.statusSkipped")}
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold uppercase rounded-full bg-destructive/15 text-destructive px-2 py-0.5">
      {t("schedule.statusMissed")}
    </span>
  );
}

function routeKey(r: string): string {
  switch (r) {
    case "g_tube":
      return "GTube";
    case "oral":
      return "Oral";
    case "injection":
      return "Injection";
    case "topical":
      return "Topical";
    case "inhaled":
      return "Inhaled";
    default:
      return "Other";
  }
}

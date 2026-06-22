import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Pill,
  CheckCircle2,
  X,
  Plus,
  Clock,
  Undo2,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  MapPin,
  Stethoscope,
  Sparkles,
  ClipboardList,
  Calendar as CalendarIcon,
  Trash2,
  Pencil,
  Repeat,
  Bell,
  UtensilsCrossed,
  Moon,
  Thermometer,
  Heart,
  Wind,
  Activity,
  Droplet,
  Baby,
  Zap,
  StickyNote,
} from "lucide-react";
import { DashboardLayout } from "@/components/carenest/DashboardLayout";
import { getTaskState } from "@/lib/schedule/task-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";
import { useMyMembership, useSession } from "@/lib/auth/use-profile";
import { useActiveCaregiverProfile } from "@/lib/data/active-profile";
import { ByProfile } from "@/components/carenest/ByProfile";
import {
  useFamilyChild,
  useMedications,
  useMedLogs,
  useLogDose,
  useDeleteLog,
  buildTodaysDoses,
  type ScheduledDose,
} from "@/lib/data/medications";
import {
  APPOINTMENT_KINDS,
  useAppointments,
  useCreateAppointment,
  useUpdateAppointment,
  useDeleteAppointment,
  useUpdateAppointmentInstance,
  useDeleteAppointmentInstance,
  type ExpandedAppointment,
  type AppointmentKind,
  type RecurrenceFreq,
} from "@/lib/data/appointments";
import { useShifts } from "@/lib/data/shifts";
import {
  useHandoverDueItem,
  useDismissedHandovers,
} from "@/lib/data/handover-due";
import { ClipboardCheck } from "lucide-react";

type RepeatMode = "none" | RecurrenceFreq;

type SavePayload = {
  family_id: string;
  child_id: string | null;
  created_by: string;
  title: string;
  notes: string | null;
  location: string | null;
  kind: AppointmentKind;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  recurrence_freq: RecurrenceFreq | null;
  recurrence_interval: number;
  recurrence_byweekday: number[] | null;
  recurrence_times_of_day: string[] | null;
  reminder_minutes: number | null;
  amount_ml: number | null;
  late_after_minutes: number;
  missed_after_minutes: number;
  allow_ongoing: boolean;
  timer_minutes: number | null;
};

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({ meta: [{ title: "Schedule — CareNest" }] }),
  component: SchedulePage,
});

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function toDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function toTimeInput(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function toLocalDateTime(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type TimelineItem =
  | { kind: "dose"; key: string; at: Date; dose: ScheduledDose }
  | { kind: "appt"; key: string; at: Date; appt: ExpandedAppointment }
  | {
      kind: "handover";
      key: string;
      at: Date;
      shiftStart: Date;
      shiftEnd: Date;
      dismissId: string;
    };

function SchedulePage() {
  const { t, i18n } = useTranslation();
  const { user } = useSession();
  const { data: membership } = useMyMembership();
  const familyId = membership?.family_id;
  const { data: child } = useFamilyChild(familyId);
  const { data: meds = [] } = useMedications(familyId);
  const { activeId: activeCaregiverId } = useActiveCaregiverProfile(familyId, user?.id);

  const [day, setDay] = useState<Date>(() => startOfDay(new Date()));
  const dayEnd = useMemo(() => addDays(day, 1), [day]);
  const isToday = isSameDay(day, new Date());

  const dayLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(i18n.language, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    return fmt.format(day);
  }, [i18n.language, day]);

  const { data: logs = [] } = useMedLogs(familyId, day, dayEnd);
  const { data: appointments = [] } = useAppointments(familyId, day, dayEnd);
  const { data: shifts = [] } = useShifts(familyId);
  const doses = useMemo(
    () => buildTodaysDoses(meds, logs, day),
    [meds, logs, day],
  );

  const { dismissed: dismissedHandovers, dismiss: dismissHandover } =
    useDismissedHandovers(user?.id);
  const handoverDue = useHandoverDueItem(
    shifts,
    user?.id,
    day,
    dayEnd,
    dismissedHandovers,
  );
  const handoverItems = useMemo<TimelineItem[]>(() => {
    if (!handoverDue) return [];
    return [
      {
        kind: "handover",
        key: `handover-${handoverDue.dismissId}`,
        at: handoverDue.at,
        shiftStart: handoverDue.shiftStart,
        shiftEnd: handoverDue.shiftEnd,
        dismissId: handoverDue.dismissId,
      },
    ];
  }, [handoverDue]);

  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];
    for (const d of doses) {
      items.push({ kind: "dose", key: d.key, at: d.scheduled_for, dose: d });
    }
    for (const a of appointments) {
      items.push({ kind: "appt", key: a.id, at: new Date(a.starts_at), appt: a });
    }
    items.push(...handoverItems);
    return items.sort((x, y) => x.at.getTime() - y.at.getTime());
  }, [doses, appointments, handoverItems]);

  const logDose = useLogDose();
  const deleteLog = useDeleteLog();
  const createAppt = useCreateAppointment();
  const updateAppt = useUpdateAppointment();
  const deleteAppt = useDeleteAppointment();
  const updateInstance = useUpdateAppointmentInstance();
  const deleteInstance = useDeleteAppointmentInstance();

  const [confirm, setConfirm] = useState<
    { dose: ScheduledDose; status: "given" | "skipped" } | null
  >(null);
  const [apptOpen, setApptOpen] = useState(false);
  const [editing, setEditing] = useState<ExpandedAppointment | null>(null);
  const [confirmDeleteAppt, setConfirmDeleteAppt] = useState<ExpandedAppointment | null>(null);
  const [showPastItems, setShowPastItems] = useState(false);

  const now = new Date();
  const stats = isToday
    ? { given: doses.filter((d) => d.log?.status === "given").length, total: doses.length }
    : null;

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
        caregiver_profile_id: activeCaregiverId ?? null,
      });
      toast.success(
        confirm.status === "given" ? t("schedule.doseLogged") : t("schedule.doseSkipped"),
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
    setConfirm(null);
  };

  function openCreateAppt() {
    setEditing(null);
    setApptOpen(true);
  }

  function openEditAppt(a: ExpandedAppointment) {
    setEditing(a);
    setApptOpen(true);
  }

  async function handleDeleteAppt(scope: "this" | "series") {
    if (!confirmDeleteAppt || !familyId || !user) return;
    const target = confirmDeleteAppt;
    try {
      if (target.is_recurring && target.master_id && scope === "this") {
        await deleteInstance.mutateAsync({
          family_id: familyId,
          child_id: target.child_id,
          created_by: user.id,
          master_id: target.master_id,
          occurrence_start: target.occurrence_start,
          title: target.title,
          kind: target.kind,
        });
      } else {
        const id = target.master_id ?? target.id;
        await deleteAppt.mutateAsync(id);
      }
      toast.success(t("scheduleEvents.deleted"));
      setConfirmDeleteAppt(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }


  return (
    <DashboardLayout
      title={t("schedule.title")}
      subtitle={dayLabel}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="rounded-full gap-1.5 font-semibold"
            onClick={openCreateAppt}
            disabled={!familyId}
          >
            <Plus className="size-4" /> {t("scheduleEvents.new")}
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link to="/medications">
              <Pill className="size-4" /> {t("schedule.addMedication")}
            </Link>
          </Button>
        </div>
      }
    >
      <div className="card-soft p-3 mb-5 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => setDay(addDays(day, -1))}
          aria-label="Previous day"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <div className="flex-1 text-center">
          <p className="font-extrabold text-base">{dayLabel}</p>
          {!isToday && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => setDay(startOfDay(new Date()))}
            >
              {t("schedule.today")}
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => setDay(addDays(day, 1))}
          aria-label="Next day"
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>

      {stats && stats.total > 0 && (
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
            <CalendarDays className="size-7" />
          </div>
        </div>
      )}

      {timeline.length === 0 ? (
        <div className="card-soft p-10 text-center max-w-md mx-auto">
          <div className="size-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mx-auto mb-4">
            <CalendarIcon className="size-7" />
          </div>
          <h2 className="text-xl font-extrabold mb-2">{t("scheduleEvents.emptyTitle")}</h2>
          <p className="text-muted-foreground mb-6">{t("scheduleEvents.emptyBody")}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button className="rounded-full" onClick={openCreateAppt} disabled={!familyId}>
              <Plus className="size-4" /> {t("scheduleEvents.new")}
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/medications">
                <Pill className="size-4" /> {t("schedule.addMedication")}
              </Link>
            </Button>
          </div>
        </div>
      ) : (() => {
        const renderItem = (item: TimelineItem) => {
          if (item.kind === "dose") {
            return (
              <DoseRow
                key={item.key}
                dose={item.dose}
                now={now}
                onMark={(status) => setConfirm({ dose: item.dose, status })}
                onUndo={() => {
                  if (item.dose.log) {
                    deleteLog.mutate(item.dose.log.id, {
                      onSuccess: () => toast.success(t("schedule.doseUndone")),
                      onError: (e) => toast.error((e as Error).message),
                    });
                  }
                }}
              />
            );
          }
          if (item.kind === "handover") {
            return (
              <HandoverDueRow
                key={item.key}
                at={item.at}
                shiftStart={item.shiftStart}
                shiftEnd={item.shiftEnd}
                onDismiss={() => dismissHandover(item.dismissId)}
              />
            );
          }
          return (
            <AppointmentRow
              key={item.key}
              appt={item.appt}
              onEdit={() => openEditAppt(item.appt)}
              onDelete={() => setConfirmDeleteAppt(item.appt)}
              canManage={item.appt.created_by === user?.id || membership?.role === "owner"}
            />
          );
        };
        const isPast = (item: TimelineItem) =>
          item.kind === "dose" &&
          !!item.dose.log?.status &&
          item.dose.log.status !== "postponed";
        const activeItems = timeline.filter((it) => !isPast(it));
        const pastItems = timeline.filter(isPast);
        return (
          <>
            {activeItems.length > 0 ? (
              <ol className="space-y-3">{activeItems.map(renderItem)}</ol>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                {t("schedule.allCaughtUp")}
              </div>
            )}
            {pastItems.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setShowPastItems((v) => !v)}
                  className="w-full flex items-center justify-between gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>
                    {showPastItems
                      ? t("schedule.hidePrevious")
                      : t("schedule.showPrevious", { count: pastItems.length })}
                  </span>
                  <ChevronRight
                    className={cn(
                      "size-4 transition-transform",
                      showPastItems && "rotate-90",
                    )}
                  />
                </button>
                {showPastItems && (
                  <ol className="space-y-3 mt-3">{pastItems.map(renderItem)}</ol>
                )}
              </div>
            )}
          </>
        );
      })()}

      <AppointmentDialog
        open={apptOpen}
        onOpenChange={(o) => {
          setApptOpen(o);
          if (!o) setEditing(null);
        }}
        defaultDay={day}
        familyId={familyId}
        childId={child?.id ?? null}
        userId={user?.id ?? null}
        editing={editing}
        onSave={async (values, scope) => {
          if (!familyId || !user) return;
          try {
            if (!editing) {
              await createAppt.mutateAsync(values as never);
              toast.success(t("scheduleEvents.created"));
            } else if (editing.is_recurring && editing.master_id && scope === "this") {
              await updateInstance.mutateAsync({
                family_id: familyId,
                child_id: editing.child_id,
                created_by: user.id,
                master_id: editing.master_id,
                occurrence_start: editing.occurrence_start,
                patch: {
                  title: values.title,
                  notes: values.notes,
                  location: values.location,
                  kind: values.kind,
                  starts_at: values.starts_at,
                  ends_at: values.ends_at,
                  all_day: values.all_day,
                  reminder_minutes: values.reminder_minutes,
                  amount_ml: values.amount_ml,
                  late_after_minutes: values.late_after_minutes,
                  missed_after_minutes: values.missed_after_minutes,
                  allow_ongoing: values.allow_ongoing,
                  timer_minutes: values.timer_minutes,
                },
              });
              toast.success(t("scheduleEvents.updated"));
            } else {
              // whole series, or non-recurring row
              const id = editing.master_id ?? editing.id;
              // When editing an instance with scope=series, the dialog
              // doesn't show the recurrence editor — strip those fields so
              // we don't clobber the master's existing pattern.
              const patch = editing.is_recurring
                ? {
                    title: values.title,
                    notes: values.notes,
                    location: values.location,
                    kind: values.kind,
                    all_day: values.all_day,
                    // keep clock-time + duration changes for the series
                    starts_at: values.starts_at,
                    ends_at: values.ends_at,
                    reminder_minutes: values.reminder_minutes,
                    late_after_minutes: values.late_after_minutes,
                    missed_after_minutes: values.missed_after_minutes,
                    allow_ongoing: values.allow_ongoing,
                  }
                : values;
              await updateAppt.mutateAsync({ id, patch });
              toast.success(t("scheduleEvents.updated"));
            }
            setApptOpen(false);
            setEditing(null);
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
        saving={
          createAppt.isPending ||
          updateAppt.isPending ||
          updateInstance.isPending
        }
      />

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

      <AlertDialog
        open={!!confirmDeleteAppt}
        onOpenChange={(o) => !o && setConfirmDeleteAppt(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("scheduleEvents.confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDeleteAppt?.is_recurring
                ? t("scheduleEvents.confirmDeleteSeriesBody", {
                    title: confirmDeleteAppt?.title ?? "",
                  })
                : t("scheduleEvents.confirmDeleteBody", {
                    title: confirmDeleteAppt?.title ?? "",
                  })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="rounded-full">
              {t("common.cancel")}
            </AlertDialogCancel>
            {confirmDeleteAppt?.is_recurring && (
              <AlertDialogAction
                className="rounded-full"
                onClick={() => handleDeleteAppt("this")}
              >
                {t("scheduleEvents.deleteThisOne")}
              </AlertDialogAction>
            )}
            <AlertDialogAction
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => handleDeleteAppt("series")}
            >
              {confirmDeleteAppt?.is_recurring
                ? t("scheduleEvents.deleteSeries")
                : t("scheduleEvents.delete")}
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
  const { user } = useSession();
  const { data: membership } = useMyMembership();
  const status = dose.log?.status;
  const med = dose.medication;
  const lateAfter = (med as { late_after_minutes?: number | null }).late_after_minutes ?? 0;
  const missedAfter = (med as { missed_after_minutes?: number | null }).missed_after_minutes ?? 15;
  const liveState = !status
    ? getTaskState({
        status: "pending",
        scheduledFor: dose.scheduled_for,
        lateAfterMinutes: lateAfter,
        missedAfterMinutes: missedAfter,
        now,
      })
    : "given";
  const isLate = liveState === "late";
  const isMissed = liveState === "missed";
  const dose_label = [med.dose_amount, med.dose_unit].filter(Boolean).join(" ");
  const color = med.color ?? "#A78BFA";

  return (
    <li
      className={cn(
        "card-soft p-4 flex items-center gap-4 transition-opacity",
        status === "given" && "opacity-70",
        status === "skipped" && "opacity-60",
        isMissed && "border-destructive/40 bg-destructive/5",
        isLate && "border-amber-300 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-950/20",
      )}
    >
      <div className="text-center shrink-0 w-16">
        <div className="text-xl font-extrabold tabular-nums">{dose.time}</div>
        {isMissed && (
          <div className="text-[10px] font-bold uppercase text-destructive mt-0.5">
            {t("schedule.missed")}
          </div>
        )}
        {isLate && (
          <div className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400 mt-0.5">
            {t("schedule.late")}
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
        {status && dose.log && (
          <div className="text-xs text-muted-foreground mt-1">
            <ByProfile
              familyId={membership?.family_id}
              caregiverProfileId={dose.log.caregiver_profile_id}
              authorUserId={dose.log.given_by}
              viewerUserId={user?.id}
            />
          </div>
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
              <X className="size-4" />{" "}
              <span className="hidden sm:inline">{t("schedule.skip")}</span>
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

function AppointmentRow({
  appt,
  onEdit,
  onDelete,
  canManage,
}: {
  appt: ExpandedAppointment;
  onEdit: () => void;
  onDelete: () => void;
  canManage: boolean;
}) {
  const { t, i18n } = useTranslation();
  const tone = kindTone(appt.kind);
  const start = new Date(appt.starts_at);
  const end = appt.ends_at ? new Date(appt.ends_at) : null;
  const timeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language === "sv" ? "sv-SE" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [i18n.language],
  );

  return (
    <li className="card-soft p-4 flex items-center gap-4">
      <div className="text-center shrink-0 w-16">
        {appt.all_day ? (
          <div className="text-xs font-bold uppercase text-muted-foreground">
            {t("scheduleEvents.allDay")}
          </div>
        ) : (
          <>
            <div className="text-xl font-extrabold tabular-nums">{timeFmt.format(start)}</div>
            {end && (
              <div className="text-[10px] text-muted-foreground tabular-nums">
                {timeFmt.format(end)}
              </div>
            )}
          </>
        )}
      </div>

      <div
        className="size-12 rounded-2xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: tone.bg, color: tone.fg }}
      >
        <KindIcon kind={appt.kind} className="size-6" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-extrabold truncate">{appt.title}</h3>
          <span
            className="text-[10px] font-bold uppercase rounded-full px-2 py-0.5"
            style={{ backgroundColor: tone.bg, color: tone.fg }}
          >
            {t(`scheduleEvents.kind.${appt.kind}`)}
          </span>
          {appt.is_recurring && (
            <span
              className="text-[10px] font-bold uppercase rounded-full px-2 py-0.5 bg-primary-soft text-primary inline-flex items-center gap-1"
              title={t("scheduleEvents.repeat.badge")}
            >
              <Repeat className="size-3" /> {t("scheduleEvents.repeat.badge")}
            </span>
          )}
        </div>
        {appt.location && (
          <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5">
            <MapPin className="size-3.5" /> {appt.location}
          </p>
        )}
        {appt.notes && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{appt.notes}</p>
        )}
      </div>

      {canManage && (
        <div className="flex gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={onEdit}
            aria-label={t("scheduleEvents.edit")}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            aria-label={t("scheduleEvents.delete")}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      )}
    </li>
  );
}

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function AppointmentDialog({
  open,
  onOpenChange,
  defaultDay,
  familyId,
  childId,
  userId,
  editing,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultDay: Date;
  familyId: string | undefined | null;
  childId: string | null;
  userId: string | null;
  editing: ExpandedAppointment | null;
  onSave: (values: SavePayload, scope: "this" | "series") => void | Promise<void>;
  saving: boolean;
}) {
  const { t } = useTranslation();

  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<AppointmentKind>("appointment");
  const [date, setDate] = useState(toDateInput(defaultDay));
  const [time, setTime] = useState("09:00");
  const [endTime, setEndTime] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [repeat, setRepeat] = useState<RepeatMode>("none");
  const [interval, setInterval] = useState<number>(1);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [timesOfDay, setTimesOfDay] = useState<string[]>([]);
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(null);
  const [amountMl, setAmountMl] = useState<string>("");
  const [lateAfter, setLateAfter] = useState<string>("0");
  const [missedAfter, setMissedAfter] = useState<string>("15");
  const [allowOngoing, setAllowOngoing] = useState<boolean>(false);
  const [enableTimer, setEnableTimer] = useState<boolean>(false);
  const [timerMinutes, setTimerMinutes] = useState<string>("1");
  const [scopeOpen, setScopeOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<SavePayload | null>(null);

  const isInstance = !!editing?.is_recurring;
  const showsRepeat = !editing || (editing && !editing.is_recurring);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const s = new Date(editing.starts_at);
      const e = editing.ends_at ? new Date(editing.ends_at) : null;
      setTitle(editing.title);
      setKind(editing.kind);
      setDate(toDateInput(s));
      setTime(toTimeInput(s));
      setEndTime(e ? toTimeInput(e) : "");
      setAllDay(editing.all_day);
      setLocation(editing.location ?? "");
      setNotes(editing.notes ?? "");
      setRepeat((editing.recurrence_freq as RepeatMode | null) ?? "none");
      setInterval(editing.recurrence_interval || 1);
      setWeekdays(editing.recurrence_byweekday ?? []);
      setTimesOfDay(editing.recurrence_times_of_day ?? []);
      setReminderMinutes(editing.reminder_minutes ?? null);
      setAmountMl(editing.amount_ml != null ? String(editing.amount_ml) : "");
      setLateAfter(String((editing as { late_after_minutes?: number }).late_after_minutes ?? 0));
      setMissedAfter(String((editing as { missed_after_minutes?: number }).missed_after_minutes ?? 15));
      setAllowOngoing(!!(editing as { allow_ongoing?: boolean }).allow_ongoing);
      const tm = (editing as { timer_minutes?: number | null }).timer_minutes ?? null;
      setEnableTimer(tm != null);
      setTimerMinutes(tm != null ? String(tm) : "1");
    } else {
      setTitle("");
      setKind("appointment");
      setDate(toDateInput(defaultDay));
      setTime("09:00");
      setEndTime("");
      setAllDay(false);
      setLocation("");
      setNotes("");
      setRepeat("none");
      setInterval(1);
      setWeekdays([]);
      setTimesOfDay([]);
      setReminderMinutes(null);
      setAmountMl("");
      setLateAfter("0");
      setMissedAfter("15");
      setAllowOngoing(false);
      setEnableTimer(false);
      setTimerMinutes("1");
    }
  }, [open, editing, defaultDay]);

  function buildValues(): SavePayload | null {
    if (!familyId || !userId) return null;
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error(t("scheduleEvents.titleRequired"));
      return null;
    }
    const startDt = allDay
      ? toLocalDateTime(date, "00:00")
      : toLocalDateTime(date, time || "00:00");
    const endDt = !allDay && endTime ? toLocalDateTime(date, endTime) : null;
    if (endDt && endDt <= startDt) {
      toast.error(t("scheduleEvents.endAfterStart"));
      return null;
    }
    if (repeat === "weekly" && weekdays.length === 0 && showsRepeat) {
      toast.error(t("scheduleEvents.weekdaysRequired"));
      return null;
    }
    // Times-of-day only apply to daily/weekly/monthly (not hourly).
    const allowTimes =
      showsRepeat && (repeat === "daily" || repeat === "weekly" || repeat === "monthly");
    const cleanedTimes = allowTimes
      ? Array.from(
          new Set(
            timesOfDay
              .map((s) => s.trim())
              .filter((s) => /^\d{1,2}:\d{2}$/.test(s)),
          ),
        ).sort()
      : [];
    return {
      family_id: familyId,
      child_id: childId,
      created_by: userId,
      title: trimmed,
      notes: notes.trim() || null,
      location: location.trim() || null,
      kind,
      starts_at: startDt.toISOString(),
      ends_at: endDt ? endDt.toISOString() : null,
      all_day: allDay,
      recurrence_freq: showsRepeat && repeat !== "none" ? repeat : null,
      recurrence_interval: showsRepeat && repeat !== "none" ? Math.max(1, interval) : 1,
      recurrence_byweekday:
        showsRepeat && repeat === "weekly" ? [...weekdays].sort() : null,
      recurrence_times_of_day: cleanedTimes.length > 0 ? cleanedTimes : null,
      reminder_minutes: reminderMinutes,
      amount_ml: kind === "meal" && amountMl.trim() !== "" && !Number.isNaN(Number(amountMl))
        ? Number(amountMl)
        : null,
      late_after_minutes: Math.max(0, parseInt(lateAfter, 10) || 0),
      missed_after_minutes: Math.max(0, parseInt(missedAfter, 10) || 15),
      allow_ongoing: allowOngoing,
      timer_minutes: enableTimer ? Math.max(1, Math.min(120, parseInt(timerMinutes, 10) || 1)) : null,
    };
  }

  function handleSubmit() {
    const values = buildValues();
    if (!values) return;
    if (isInstance) {
      // Ask scope: this one only, or the whole series
      setPendingValues(values);
      setScopeOpen(true);
      return;
    }
    onSave(values, "series");
  }

  function toggleWeekday(i: number) {
    setWeekdays((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
    );
  }

  const showInterval = repeat === "hourly" || repeat === "daily" || repeat === "monthly";
  const showWeekdays = repeat === "weekly";
  const showTimesOfDay = repeat === "daily" || repeat === "weekly" || repeat === "monthly";

  function addTimeOfDay() {
    setTimesOfDay((prev) => [...prev, "12:00"]);
  }
  function updateTimeOfDay(idx: number, value: string) {
    setTimesOfDay((prev) => prev.map((t, i) => (i === idx ? value : t)));
  }
  function removeTimeOfDay(idx: number) {
    setTimesOfDay((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("scheduleEvents.editTitle") : t("scheduleEvents.newTitle")}
            </DialogTitle>
            <DialogDescription>{t("scheduleEvents.newBody")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="font-semibold">{t("scheduleEvents.fields.title")}</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("scheduleEvents.placeholders.title")}
                className="rounded-xl mt-1.5"
              />
            </div>
            <div>
              <Label className="font-semibold">{t("scheduleEvents.fields.kind")}</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as AppointmentKind)}>
                <SelectTrigger className="rounded-xl mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {t(`scheduleEvents.kind.${k}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {kind === "meal" && (
              <div>
                <Label className="font-semibold">{t("scheduleEvents.fields.amountMl")}</Label>
                <div className="grid grid-cols-[1fr_auto] gap-2 mt-1.5">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="1"
                    value={amountMl}
                    onChange={(e) => setAmountMl(e.target.value)}
                    placeholder={t("scheduleEvents.placeholders.amountMl")}
                    className="rounded-xl"
                  />
                  <div className="h-9 px-3 rounded-xl border border-input bg-muted/40 flex items-center text-sm font-semibold text-muted-foreground">
                    ml
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Checkbox
                id="all-day"
                checked={allDay}
                onCheckedChange={(c) => setAllDay(c === true)}
              />
              <Label htmlFor="all-day" className="font-semibold">
                {t("scheduleEvents.allDay")}
              </Label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <Label className="font-semibold">{t("scheduleEvents.fields.date")}</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-xl mt-1.5"
                />
              </div>
              {!allDay && (
                <>
                  <div>
                    <Label className="font-semibold">{t("scheduleEvents.fields.start")}</Label>
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="rounded-xl mt-1.5"
                    />
                  </div>
                  <div>
                    <Label className="font-semibold">{t("scheduleEvents.fields.end")}</Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="rounded-xl mt-1.5"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Recurrence */}
            {showsRepeat && (
              <div className="rounded-2xl border border-border/60 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Repeat className="size-4 text-primary" />
                  <Label className="font-semibold">
                    {t("scheduleEvents.fields.repeat")}
                  </Label>
                </div>
                <Select
                  value={repeat}
                  onValueChange={(v) => setRepeat(v as RepeatMode)}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("scheduleEvents.repeat.none")}</SelectItem>
                    <SelectItem value="hourly">{t("scheduleEvents.repeat.hourly")}</SelectItem>
                    <SelectItem value="daily">{t("scheduleEvents.repeat.daily")}</SelectItem>
                    <SelectItem value="weekly">{t("scheduleEvents.repeat.weekly")}</SelectItem>
                    <SelectItem value="monthly">{t("scheduleEvents.repeat.monthly")}</SelectItem>
                  </SelectContent>
                </Select>
                {showInterval && (
                  <div className="flex items-center gap-2">
                    <Label className="text-sm shrink-0">
                      {t("scheduleEvents.repeat.everyN")}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={repeat === "hourly" ? 23 : repeat === "monthly" ? 24 : 365}
                      value={interval}
                      onChange={(e) =>
                        setInterval(Math.max(1, Number(e.target.value) || 1))
                      }
                      className="rounded-xl w-20"
                    />
                    <span className="text-sm text-muted-foreground">
                      {repeat === "hourly"
                        ? t("scheduleEvents.repeat.hoursUnit", { count: interval })
                        : repeat === "monthly"
                          ? t("scheduleEvents.repeat.monthsUnit", { count: interval })
                          : t("scheduleEvents.repeat.daysUnit", { count: interval })}
                    </span>
                  </div>
                )}
                {showWeekdays && (
                  <div>
                    <Label className="text-sm">
                      {t("scheduleEvents.repeat.weekdays")}
                    </Label>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {WEEKDAY_KEYS.map((k, i) => {
                        const active = weekdays.includes(i);
                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={() => toggleWeekday(i)}
                            className={cn(
                              "size-9 rounded-full text-xs font-bold border transition-colors",
                              active
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background border-border text-foreground hover:bg-muted",
                            )}
                          >
                            {t(`scheduleEvents.repeat.weekdayShort.${k}`)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {showTimesOfDay && (
                  <div className="space-y-2">
                    <Label className="text-sm">
                      {t("scheduleEvents.repeat.timesOfDay")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("scheduleEvents.repeat.timesOfDayHint")}
                    </p>
                    <div className="space-y-2">
                      {timesOfDay.map((tod, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={tod}
                            onChange={(e) => updateTimeOfDay(i, e.target.value)}
                            className="rounded-xl w-32"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="rounded-full text-muted-foreground hover:text-destructive"
                            onClick={() => removeTimeOfDay(i)}
                            aria-label={t("common.remove")}
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={addTimeOfDay}
                      >
                        <Plus className="size-3.5" />
                        {t("scheduleEvents.repeat.addTime")}
                      </Button>
                    </div>
                  </div>
                )}
                {repeat !== "none" && (
                  <p className="text-xs text-muted-foreground">
                    {t("scheduleEvents.repeat.foreverHint")}
                  </p>
                )}
              </div>
            )}

            {/* Reminder */}
            <div className="rounded-2xl border border-border/60 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-primary" />
                <Label className="font-semibold">
                  {t("scheduleEvents.fields.reminder")}
                </Label>
              </div>
              <Select
                value={reminderMinutes === null ? "none" : String(reminderMinutes)}
                onValueChange={(v) =>
                  setReminderMinutes(v === "none" ? null : Number(v))
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("scheduleEvents.reminder.none")}</SelectItem>
                  <SelectItem value="0">{t("scheduleEvents.reminder.atTime")}</SelectItem>
                  <SelectItem value="5">{t("scheduleEvents.reminder.min5")}</SelectItem>
                  <SelectItem value="10">{t("scheduleEvents.reminder.min10")}</SelectItem>
                  <SelectItem value="15">{t("scheduleEvents.reminder.min15")}</SelectItem>
                  <SelectItem value="30">{t("scheduleEvents.reminder.min30")}</SelectItem>
                  <SelectItem value="60">{t("scheduleEvents.reminder.hour1")}</SelectItem>
                  <SelectItem value="120">{t("scheduleEvents.reminder.hour2")}</SelectItem>
                  <SelectItem value="1440">{t("scheduleEvents.reminder.day1")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Late / Missed thresholds */}
            <div className="rounded-2xl border border-border/60 p-3 space-y-2">
              <Label className="font-semibold">
                {t("scheduleEvents.fields.lateAfter")} / {t("scheduleEvents.fields.missedAfter")}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {t("scheduleEvents.fields.lateAfter")}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={lateAfter}
                      onChange={(e) => setLateAfter(e.target.value)}
                      className="rounded-xl w-20"
                    />
                    <span className="text-xs text-muted-foreground">
                      {t("scheduleEvents.fields.minutes")}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {t("scheduleEvents.fields.missedAfter")}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={missedAfter}
                      onChange={(e) => setMissedAfter(e.target.value)}
                      className="rounded-xl w-20"
                    />
                    <span className="text-xs text-muted-foreground">
                      {t("scheduleEvents.fields.minutes")}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("scheduleEvents.fields.lateMissedHint")}
              </p>
            </div>

            {/* Allow Ongoing */}
            <div className="rounded-2xl border border-border/60 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="allow-ongoing"
                  checked={allowOngoing}
                  onCheckedChange={(c) => setAllowOngoing(c === true)}
                />
                <Label htmlFor="allow-ongoing" className="font-semibold cursor-pointer">
                  {t("scheduleEvents.fields.allowOngoing")}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("scheduleEvents.fields.allowOngoingHelp")}
              </p>
            </div>

            {isInstance && (
              <p className="text-xs text-muted-foreground rounded-xl bg-muted/50 p-3">
                {t("scheduleEvents.repeat.instanceHint")}
              </p>
            )}

            <div>
              <Label className="font-semibold">{t("scheduleEvents.fields.location")}</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t("scheduleEvents.placeholders.location")}
                className="rounded-xl mt-1.5"
              />
            </div>
            <div>
              <Label className="font-semibold">{t("scheduleEvents.fields.notes")}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("scheduleEvents.placeholders.notes")}
                rows={3}
                className="rounded-xl mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-full" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              className="rounded-full font-bold"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? t("common.saving") : t("scheduleEvents.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scope chooser for editing a recurring instance */}
      <AlertDialog open={scopeOpen} onOpenChange={setScopeOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("scheduleEvents.scopeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("scheduleEvents.scopeBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="rounded-full">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full"
              onClick={() => {
                if (pendingValues) onSave(pendingValues, "this");
                setScopeOpen(false);
              }}
            >
              {t("scheduleEvents.scopeThis")}
            </AlertDialogAction>
            <AlertDialogAction
              className="rounded-full"
              onClick={() => {
                if (pendingValues) onSave(pendingValues, "series");
                setScopeOpen(false);
              }}
            >
              {t("scheduleEvents.scopeSeries")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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

function KindIcon({ kind, className }: { kind: AppointmentKind; className?: string }) {
  switch (kind) {
    case "appointment":
      return <Stethoscope className={className} />;
    case "therapy":
      return <Sparkles className={className} />;
    case "task":
      return <ClipboardList className={className} />;
    case "meal":
      return <UtensilsCrossed className={className} />;
    case "sleep":
      return <Moon className={className} />;
    case "temperature":
      return <Thermometer className={className} />;
    case "heart_rate":
      return <Heart className={className} />;
    case "spo2":
      return <Wind className={className} />;
    case "breathing":
      return <Activity className={className} />;
    case "fluids":
      return <Droplet className={className} />;
    case "diaper":
      return <Baby className={className} />;
    case "seizure":
      return <Zap className={className} />;
    case "note":
      return <StickyNote className={className} />;
    default:
      return <CalendarIcon className={className} />;
  }
}

function kindTone(kind: AppointmentKind): { bg: string; fg: string } {
  switch (kind) {
    case "appointment":
      return { bg: "#DBEAFE", fg: "#1D4ED8" };
    case "therapy":
      return { bg: "#FCE7F3", fg: "#BE185D" };
    case "task":
      return { bg: "#DCFCE7", fg: "#15803D" };
    case "meal":
      return { bg: "#FFEDD5", fg: "#C2410C" };
    case "sleep":
      return { bg: "#E0E7FF", fg: "#4338CA" };
    case "temperature":
      return { bg: "#FFE4E6", fg: "#BE123C" };
    case "heart_rate":
      return { bg: "#FCE7F3", fg: "#BE185D" };
    case "spo2":
      return { bg: "#E0F2FE", fg: "#0369A1" };
    case "breathing":
      return { bg: "#CFFAFE", fg: "#0E7490" };
    case "fluids":
      return { bg: "#DBEAFE", fg: "#1D4ED8" };
    case "diaper":
      return { bg: "#FEF3C7", fg: "#B45309" };
    case "seizure":
      return { bg: "#EDE9FE", fg: "#6D28D9" };
    case "note":
      return { bg: "#F1F5F9", fg: "#334155" };
    default:
      return { bg: "#F3E8FF", fg: "#7C3AED" };
  }
}

function HandoverDueRow({
  at,
  shiftStart,
  shiftEnd,
  onDismiss,
}: {
  at: Date;
  shiftStart: Date;
  shiftEnd: Date;
  onDismiss: () => void;
}) {
  const { t, i18n } = useTranslation();
  const timeFmt = new Intl.DateTimeFormat(
    i18n.language === "sv" ? "sv-SE" : "en-US",
    { hour: "2-digit", minute: "2-digit" },
  );
  return (
    <li className="card-soft p-4 flex items-center gap-4 border-2 border-warning/60 bg-warning/5">
      <div className="text-center shrink-0 w-16">
        <div className="text-xl font-extrabold tabular-nums">
          {timeFmt.format(at)}
        </div>
        <div className="text-[10px] font-bold uppercase text-warning-foreground/80 mt-0.5">
          {t("schedule.handoverDue.badge")}
        </div>
      </div>
      <div className="size-12 rounded-2xl flex items-center justify-center shrink-0 bg-warning/30 text-warning-foreground">
        <ClipboardCheck className="size-6" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-extrabold truncate">
          {t("schedule.handoverDue.title")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("schedule.handoverDue.body", {
            start: timeFmt.format(shiftStart),
            end: timeFmt.format(shiftEnd),
          })}
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          className="rounded-full"
          onClick={onDismiss}
        >
          {t("schedule.handoverDue.skip")}
        </Button>
        <Button asChild size="sm" className="rounded-full font-semibold">
          <Link
            to="/handover"
            search={{
              shiftStart: shiftStart.toISOString(),
              shiftEnd: shiftEnd.toISOString(),
            }}
          >
            {t("schedule.handoverDue.start")}
          </Link>
        </Button>
      </div>
    </li>
  );
}

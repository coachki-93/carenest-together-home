import { useMemo, useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  MapPin,
  Repeat,
  Trash2,
  CalendarHeart,
} from "lucide-react";
import { DashboardLayout } from "@/components/carenest/DashboardLayout";
import { LanguageToggle } from "@/components/carenest/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { cn } from "@/lib/utils";
import { toast } from "@/lib/notify";
import { useMyMembership, useSession } from "@/lib/auth/use-profile";
import { useFamily } from "@/lib/data/family";
import {
  useAppointments,
  useCreateAppointment,
  useDeleteAppointment,
  useDeleteAppointmentInstance,
  useUpdateAppointment,
  useUpdateAppointmentInstance,
  type AppointmentKind,
  type ExpandedAppointment,
  type RecurrenceFreq,
} from "@/lib/data/appointments";
import { wallClockIn, formatTimeIn } from "@/lib/time/family-tz";

export const Route = createFileRoute("/_authenticated/appointments")({
  head: () => ({ meta: [{ title: "Appointments — CareNest" }] }),
  component: AppointmentsPage,
});

// 8-swatch fixed palette. Kept out of theme tokens on purpose — a small,
// deliberate set for chip differentiation, not a design-system role.
const PALETTE = [
  "#7C3AED", // violet (default appointment)
  "#0EA5E9", // sky (default therapy)
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EF4444", // rose
  "#EC4899", // pink
  "#14B8A6", // teal
  "#64748B", // slate
] as const;
const DEFAULT_COLOR: Record<"appointment" | "therapy", string> = {
  appointment: PALETTE[0],
  therapy: PALETTE[1],
};

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
type VisitKind = "appointment" | "therapy";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function AppointmentsPage() {
  const { t, i18n } = useTranslation();
  const { data: membership } = useMyMembership();
  const { user } = useSession();
  const familyId = membership?.family_id ?? null;
  const { data: family } = useFamily(familyId);
  const tz = family?.timezone ?? "Europe/Stockholm";

  // Anchor is any date inside the visible month.
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string>(
    () => wallClockIn(new Date(), tz).todayStr,
  );
  useEffect(() => {
    // Re-align selected day if tz resolves after mount.
    setSelectedDay((prev) => prev || wallClockIn(new Date(), tz).todayStr);
  }, [tz]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExpandedAppointment | null>(null);
  const [defaultDay, setDefaultDay] = useState<string | null>(null);

  // Range: build a 6-week grid so we always show a stable month view.
  const { gridStart, gridEnd, gridDays, monthStr } = useMemo(
    () => buildMonthGrid(anchor, tz),
    [anchor, tz],
  );

  const { data: allAppts = [] } = useAppointments(familyId, gridStart, gridEnd);
  const visits = useMemo(
    () =>
      allAppts.filter((a) => a.kind === "appointment" || a.kind === "therapy"),
    [allAppts],
  );

  // Group visits by family-tz day (YYYY-MM-DD).
  const byDay = useMemo(() => {
    const m = new Map<string, ExpandedAppointment[]>();
    for (const a of visits) {
      const day = wallClockIn(new Date(a.starts_at), tz).todayStr;
      if (!m.has(day)) m.set(day, []);
      m.get(day)!.push(a);
    }
    for (const arr of m.values()) {
      arr.sort(
        (a, b) =>
          Number(b.all_day) - Number(a.all_day) ||
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      );
    }
    return m;
  }, [visits, tz]);

  const todayStr = wallClockIn(new Date(), tz).todayStr;
  const selectedList = byDay.get(selectedDay) ?? [];

  const monthLabel = new Intl.DateTimeFormat(
    i18n.language === "sv" ? "sv-SE" : "en-US",
    { month: "long", year: "numeric", timeZone: tz },
  ).format(anchor);

  function openNew(dayStr: string) {
    setEditing(null);
    setDefaultDay(dayStr);
    setDialogOpen(true);
  }
  function openEdit(a: ExpandedAppointment) {
    setEditing(a);
    setDefaultDay(null);
    setDialogOpen(true);
  }

  return (
    <DashboardLayout
      title={t("appointments.title")}
      subtitle={t("appointments.subtitleNoChild")}
      actions={<LanguageToggle />}
    >
      <div className="max-w-5xl space-y-4">
        {/* Month header */}
        <div className="card-soft p-3 md:p-4 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label={t("appointments.prevMonth")}
            onClick={() => setAnchor(shiftMonth(anchor, -1, tz))}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg md:text-xl font-extrabold capitalize truncate">
              {monthLabel}
            </h2>
          </div>
          <Button
            variant="outline"
            className="rounded-full font-semibold"
            onClick={() => {
              setAnchor(new Date());
              setSelectedDay(todayStr);
            }}
          >
            {t("appointments.today")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label={t("appointments.nextMonth")}
            onClick={() => setAnchor(shiftMonth(anchor, 1, tz))}
          >
            <ChevronRight className="size-5" />
          </Button>
          <Button
            className="rounded-full font-bold ml-1"
            onClick={() => openNew(selectedDay)}
            disabled={!familyId}
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">{t("appointments.new")}</span>
          </Button>
        </div>

        {/* Grid */}
        <div className="card-soft p-2 md:p-3">
          <div className="grid grid-cols-7 gap-1 md:gap-2 mb-1">
            {WEEKDAY_KEYS.map((k) => (
              <div
                key={k}
                className="text-[10px] md:text-xs font-bold uppercase text-muted-foreground text-center py-1"
              >
                {t(`appointments.weekdayShort.${k}`)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {gridDays.map((d) => {
              const dayStr = d.dateStr;
              const inMonth = d.inMonth;
              const isToday = dayStr === todayStr;
              const isSelected = dayStr === selectedDay;
              const events = byDay.get(dayStr) ?? [];
              return (
                <button
                  key={dayStr}
                  type="button"
                  onClick={() => setSelectedDay(dayStr)}
                  onDoubleClick={() => openNew(dayStr)}
                  className={cn(
                    "min-h-[62px] md:min-h-[96px] rounded-xl md:rounded-2xl border p-1 md:p-2 text-left transition-colors flex flex-col gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    inMonth
                      ? "bg-background border-border/60"
                      : "bg-muted/30 border-border/40 text-muted-foreground",
                    isSelected && "ring-2 ring-primary border-primary",
                    !isSelected && isToday && "border-primary/60",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-xs md:text-sm font-bold tabular-nums",
                        isToday && "text-primary",
                      )}
                    >
                      {d.dayOfMonth}
                    </span>
                    {/* Mobile: dots + count */}
                    <div className="flex md:hidden items-center gap-0.5">
                      {events.slice(0, 3).map((e, i) => (
                        <span
                          key={i}
                          className="inline-block size-1.5 rounded-full"
                          style={{ background: chipColor(e) }}
                        />
                      ))}
                      {events.length > 3 && (
                        <span className="text-[10px] font-bold text-muted-foreground ml-0.5">
                          +{events.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Desktop: chips */}
                  <div className="hidden md:flex flex-col gap-1 min-w-0">
                    {events.slice(0, 3).map((e) => (
                      <div
                        key={e.id}
                        className="truncate text-[11px] font-semibold rounded-md px-1.5 py-0.5"
                        style={{
                          background: chipColor(e) + "26",
                          color: chipColor(e),
                        }}
                        title={e.title}
                      >
                        {!e.all_day && (
                          <span className="tabular-nums opacity-80 mr-1">
                            {formatTimeIn(e.starts_at, tz)}
                          </span>
                        )}
                        {e.title}
                      </div>
                    ))}
                    {events.length > 3 && (
                      <div className="text-[10px] font-semibold text-muted-foreground pl-1">
                        {t("appointments.moreCount", {
                          count: events.length - 3,
                        })}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Agenda for selected day */}
        <div className="card-soft p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-base md:text-lg font-extrabold">
              {formatDayHeading(selectedDay, tz, i18n.language)}
            </h3>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full font-semibold"
              onClick={() => openNew(selectedDay)}
              disabled={!familyId}
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">{t("appointments.new")}</span>
            </Button>
          </div>
          {selectedList.length === 0 ? (
            <div className="flex items-center gap-3 py-6 text-muted-foreground">
              <CalendarHeart className="size-5 opacity-60" />
              <span className="text-sm">{t("appointments.dayEmpty")}</span>
            </div>
          ) : (
            <ul className="space-y-2">
              {selectedList.map((a) => (
                <AgendaRow
                  key={a.id}
                  appt={a}
                  tz={tz}
                  onEdit={() => openEdit(a)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      {familyId && user && (
        <EventDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          familyId={familyId}
          userId={user.id}
          defaultDay={defaultDay ?? selectedDay}
          editing={editing}
        />
      )}
    </DashboardLayout>
  );
}

// ---------------------------------------------------------------------------
// Agenda row
// ---------------------------------------------------------------------------

function AgendaRow({
  appt,
  tz,
  onEdit,
}: {
  appt: ExpandedAppointment;
  tz: string;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const color = chipColor(appt);
  const startTxt = appt.all_day
    ? t("appointments.today_banner.allDay")
    : formatTimeIn(appt.starts_at, tz);
  const endTxt =
    !appt.all_day && appt.ends_at ? formatTimeIn(appt.ends_at, tz) : null;

  return (
    <li
      className="card-soft p-3 flex items-center gap-3 cursor-pointer hover:brightness-[0.98]"
      onClick={onEdit}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit();
        }
      }}
    >
      <div className="text-center shrink-0 w-16">
        <div className="text-lg font-extrabold tabular-nums">{startTxt}</div>
        {endTxt && (
          <div className="text-[10px] text-muted-foreground tabular-nums">
            {endTxt}
          </div>
        )}
      </div>
      <div
        className="size-10 rounded-2xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: color + "33", color }}
      >
        <CalendarHeart className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-extrabold truncate">{appt.title}</h4>
          <span
            className="text-[10px] font-bold uppercase rounded-full px-2 py-0.5"
            style={{ backgroundColor: color + "33", color }}
          >
            {t(`appointments.kind.${appt.kind as VisitKind}`)}
          </span>
          {appt.is_recurring && (
            <span
              className="text-[10px] font-bold uppercase rounded-full px-2 py-0.5 bg-primary-soft text-primary inline-flex items-center gap-1"
              title={t("appointments.recurrence.toggle")}
            >
              <Repeat className="size-3" />
            </span>
          )}
        </div>
        {appt.location && (
          <p className="text-sm font-semibold text-foreground/80 flex items-center gap-1.5 truncate mt-0.5">
            <MapPin className="size-3.5 shrink-0" /> {appt.location}
          </p>
        )}
        {appt.notes && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {appt.notes}
          </p>
        )}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// EventDialog
// ---------------------------------------------------------------------------

type DialogValues = {
  title: string;
  kind: VisitKind;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  endTime: string; // HH:MM or ""
  allDay: boolean;
  location: string;
  notes: string;
  color: string;
  repeat: "none" | "daily" | "weekly" | "monthly";
  interval: number;
  weekdays: number[];
};

function EventDialog({
  open,
  onOpenChange,
  familyId,
  userId,
  defaultDay,
  editing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  familyId: string;
  userId: string;
  defaultDay: string;
  editing: ExpandedAppointment | null;
}) {
  const { t } = useTranslation();
  const create = useCreateAppointment();
  const updateSeries = useUpdateAppointment();
  const updateInstance = useUpdateAppointmentInstance();
  const removeSeries = useDeleteAppointment();
  const removeInstance = useDeleteAppointmentInstance();

  const isInstance = !!editing?.is_recurring;

  const [values, setValues] = useState<DialogValues>(() => blankValues(defaultDay));
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [pendingScope, setPendingScope] = useState<null | "save" | "delete">(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const s = new Date(editing.starts_at);
      const e = editing.ends_at ? new Date(editing.ends_at) : null;
      const kind: VisitKind =
        editing.kind === "therapy" ? "therapy" : "appointment";
      const freq = editing.recurrence_freq;
      setValues({
        title: editing.title,
        kind,
        date: toDateInput(s),
        time: toTimeInput(s),
        endTime: e ? toTimeInput(e) : "",
        allDay: editing.all_day,
        location: editing.location ?? "",
        notes: editing.notes ?? "",
        color: editing.color ?? DEFAULT_COLOR[kind],
        repeat:
          freq === "daily" || freq === "weekly" || freq === "monthly"
            ? freq
            : "none",
        interval: Math.max(1, editing.recurrence_interval ?? 1),
        weekdays: editing.recurrence_byweekday ?? [],
      });
      setRepeatOpen(!!freq && freq !== "hourly");
    } else {
      setValues(blankValues(defaultDay));
      setRepeatOpen(false);
    }
  }, [open, editing, defaultDay]);

  function update<K extends keyof DialogValues>(k: K, v: DialogValues[K]) {
    setValues((prev) => ({ ...prev, [k]: v }));
  }

  function buildPatch(): {
    ok: true;
    starts_at: string;
    ends_at: string | null;
    common: {
      title: string;
      notes: string | null;
      location: string | null;
      kind: AppointmentKind;
      all_day: boolean;
      color: string;
    };
    recurrence: {
      recurrence_freq: RecurrenceFreq | null;
      recurrence_interval: number;
      recurrence_byweekday: number[] | null;
    };
  } | { ok: false } {
    const trimmed = values.title.trim();
    if (!trimmed) {
      toast.error(t("appointments.validation.titleRequired"));
      return { ok: false };
    }
    const startDt = values.allDay
      ? toLocalDateTime(values.date, "00:00")
      : toLocalDateTime(values.date, values.time || "00:00");
    const endDt =
      !values.allDay && values.endTime
        ? toLocalDateTime(values.date, values.endTime)
        : null;
    if (endDt && endDt <= startDt) {
      toast.error(t("appointments.validation.endAfterStart"));
      return { ok: false };
    }
    if (
      values.repeat === "weekly" &&
      values.weekdays.length === 0 &&
      !isInstance
    ) {
      toast.error(t("appointments.validation.weekdaysRequired"));
      return { ok: false };
    }
    const persistedFreq: RecurrenceFreq | null = isInstance
      ? null
      : values.repeat === "none"
        ? null
        : values.repeat;
    return {
      ok: true,
      starts_at: startDt.toISOString(),
      ends_at: endDt ? endDt.toISOString() : null,
      common: {
        title: trimmed,
        notes: values.notes.trim() || null,
        location: values.location.trim() || null,
        kind: values.kind as AppointmentKind,
        all_day: values.allDay,
        color: values.color,
      },
      recurrence: {
        recurrence_freq: persistedFreq,
        recurrence_interval:
          !isInstance && persistedFreq ? Math.max(1, values.interval) : 1,
        recurrence_byweekday:
          !isInstance && persistedFreq === "weekly"
            ? [...values.weekdays].sort()
            : null,
      },
    };
  }

  async function handleSave() {
    const b = buildPatch();
    if (!b.ok) return;

    if (!editing) {
      // Create
      await create.mutateAsync({
        family_id: familyId,
        child_id: null,
        created_by: userId,
        starts_at: b.starts_at,
        ends_at: b.ends_at,
        ...b.common,
        ...b.recurrence,
      } as never);
      toast.success(t("appointments.save"));
      onOpenChange(false);
      return;
    }

    if (isInstance) {
      // Ask scope
      setPendingScope("save");
      setScopeOpen(true);
      return;
    }

    await updateSeries.mutateAsync({
      id: editing.id,
      patch: {
        starts_at: b.starts_at,
        ends_at: b.ends_at,
        ...b.common,
        ...b.recurrence,
      } as never,
    });
    toast.success(t("appointments.save"));
    onOpenChange(false);
  }

  async function commitScope(scope: "this" | "series") {
    if (!editing) return;
    const b = buildPatch();
    if (!b.ok) return;

    if (pendingScope === "save") {
      if (scope === "this") {
        await updateInstance.mutateAsync({
          family_id: familyId,
          child_id: null,
          created_by: userId,
          master_id: editing.master_id!,
          occurrence_start: editing.occurrence_start,
          patch: {
            title: b.common.title,
            notes: b.common.notes,
            location: b.common.location,
            kind: b.common.kind,
            starts_at: b.starts_at,
            ends_at: b.ends_at,
            all_day: b.common.all_day,
            reminder_minutes: null,
            amount_ml: null,
          },
        });
      } else {
        await updateSeries.mutateAsync({
          id: editing.master_id!,
          patch: {
            ...b.common,
            recurrence_interval: b.recurrence.recurrence_interval,
            recurrence_byweekday: b.recurrence.recurrence_byweekday,
          } as never,
        });
      }
      toast.success(t("appointments.save"));
    } else if (pendingScope === "delete") {
      if (scope === "this") {
        await removeInstance.mutateAsync({
          family_id: familyId,
          child_id: null,
          created_by: userId,
          master_id: editing.master_id!,
          occurrence_start: editing.occurrence_start,
          title: editing.title,
          kind: editing.kind,
        });
      } else {
        await removeSeries.mutateAsync(editing.master_id!);
      }
      toast.success(t("appointments.delete"));
    }
    setScopeOpen(false);
    setPendingScope(null);
    onOpenChange(false);
  }

  async function handleDeleteClick() {
    if (!editing) return;
    if (isInstance) {
      setPendingScope("delete");
      setScopeOpen(true);
    } else {
      setDeleteOpen(true);
    }
  }

  async function commitPlainDelete() {
    if (!editing) return;
    await removeSeries.mutateAsync(editing.id);
    toast.success(t("appointments.delete"));
    setDeleteOpen(false);
    onOpenChange(false);
  }

  const saving = create.isPending || updateSeries.isPending || updateInstance.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("appointments.edit") : t("appointments.new")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("appointments.new")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div>
              <Label className="font-semibold">
                {t("appointments.field.title")}
              </Label>
              <Input
                value={values.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder={t("appointments.placeholder.title")}
                className="rounded-xl mt-1.5"
              />
            </div>

            {/* Location — prominent, right after title */}
            <div>
              <Label className="font-semibold">
                {t("appointments.field.location")}
              </Label>
              <div className="relative mt-1.5">
                <MapPin className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={values.location}
                  onChange={(e) => update("location", e.target.value)}
                  placeholder={t("appointments.placeholder.location")}
                  className="rounded-xl pl-9"
                />
              </div>
            </div>

            {/* Kind toggle */}
            <div>
              <Label className="font-semibold">
                {t("appointments.field.kind")}
              </Label>
              <div className="mt-1.5 inline-flex rounded-full border border-border p-1 bg-muted/50">
                {(["appointment", "therapy"] as VisitKind[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      update("kind", k);
                      // Bump default color when user hasn't customized yet.
                      if (
                        values.color === DEFAULT_COLOR.appointment ||
                        values.color === DEFAULT_COLOR.therapy
                      ) {
                        update("color", DEFAULT_COLOR[k]);
                      }
                    }}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-sm font-bold transition-colors",
                      values.kind === k
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t(`appointments.kind.${k}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* All-day + date/time */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="appt-all-day"
                checked={values.allDay}
                onCheckedChange={(c) => update("allDay", c === true)}
              />
              <Label htmlFor="appt-all-day" className="font-semibold">
                {t("appointments.field.allDay")}
              </Label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="font-semibold">
                  {t("appointments.field.date")}
                </Label>
                <Input
                  type="date"
                  value={values.date}
                  onChange={(e) => update("date", e.target.value)}
                  className="rounded-xl mt-1.5"
                />
              </div>
              {!values.allDay && (
                <>
                  <div>
                    <Label className="font-semibold">
                      {t("appointments.field.start")}
                    </Label>
                    <Input
                      type="time"
                      value={values.time}
                      onChange={(e) => update("time", e.target.value)}
                      className="rounded-xl mt-1.5"
                    />
                  </div>
                  <div>
                    <Label className="font-semibold">
                      {t("appointments.field.end")}
                    </Label>
                    <Input
                      type="time"
                      value={values.endTime}
                      onChange={(e) => update("endTime", e.target.value)}
                      className="rounded-xl mt-1.5"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Color palette */}
            <div>
              <Label className="font-semibold">
                {t("appointments.field.color")}
              </Label>
              <div className="mt-2 grid grid-cols-8 gap-2 max-w-xs">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => update("color", c)}
                    aria-label={c}
                    className={cn(
                      "size-8 rounded-full border-2 transition-transform",
                      values.color === c
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105",
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Recurrence — collapsed by default */}
            {!isInstance && (
              <div className="rounded-2xl border border-border/60 p-3 space-y-3">
                <button
                  type="button"
                  onClick={() => setRepeatOpen((v) => !v)}
                  className="w-full flex items-center gap-2 text-sm font-semibold"
                >
                  <Repeat className="size-4 text-primary" />
                  <span className="flex-1 text-left">
                    {t("appointments.recurrence.toggle")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {values.repeat === "none"
                      ? t("appointments.recurrence.none")
                      : t(`appointments.recurrence.${values.repeat}`)}
                  </span>
                </button>
                {repeatOpen && (
                  <div className="space-y-3">
                    <Select
                      value={values.repeat}
                      onValueChange={(v) =>
                        update("repeat", v as DialogValues["repeat"])
                      }
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          {t("appointments.recurrence.none")}
                        </SelectItem>
                        <SelectItem value="daily">
                          {t("appointments.recurrence.daily")}
                        </SelectItem>
                        <SelectItem value="weekly">
                          {t("appointments.recurrence.weekly")}
                        </SelectItem>
                        <SelectItem value="monthly">
                          {t("appointments.recurrence.monthly")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {values.repeat !== "none" && (
                      <div className="flex items-center gap-2">
                        <Label className="text-sm shrink-0">
                          {t("appointments.recurrence.everyN")}
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={values.repeat === "monthly" ? 24 : 52}
                          value={values.interval}
                          onChange={(e) =>
                            update(
                              "interval",
                              Math.max(1, Number(e.target.value) || 1),
                            )
                          }
                          className="rounded-xl w-20"
                        />
                        <span className="text-sm text-muted-foreground">
                          {t(
                            `appointments.recurrence.${
                              values.repeat === "monthly"
                                ? "monthsUnit"
                                : values.repeat === "weekly"
                                  ? "weeksUnit"
                                  : "daysUnit"
                            }`,
                            { count: values.interval },
                          )}
                        </span>
                      </div>
                    )}
                    {values.repeat === "weekly" && (
                      <div>
                        <Label className="text-sm">
                          {t("appointments.recurrence.weekdays")}
                        </Label>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {WEEKDAY_KEYS.map((k, i) => {
                            // JS: Sun=0..Sat=6; our UI order is Mon..Sun → map.
                            const jsIdx = i === 6 ? 0 : i + 1;
                            const active = values.weekdays.includes(jsIdx);
                            return (
                              <button
                                key={k}
                                type="button"
                                onClick={() =>
                                  update(
                                    "weekdays",
                                    active
                                      ? values.weekdays.filter(
                                          (x) => x !== jsIdx,
                                        )
                                      : [...values.weekdays, jsIdx],
                                  )
                                }
                                className={cn(
                                  "size-9 rounded-full text-xs font-bold border transition-colors",
                                  active
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background border-border text-foreground hover:bg-muted",
                                )}
                              >
                                {t(`appointments.weekdayShort.${k}`)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {isInstance && (
              <p className="text-xs text-muted-foreground rounded-xl bg-muted/50 p-3">
                {t("appointments.recurrence.instanceHint")}
              </p>
            )}

            {/* Notes */}
            <div>
              <Label className="font-semibold">
                {t("appointments.field.notes")}
              </Label>
              <Textarea
                value={values.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder={t("appointments.placeholder.notes")}
                rows={3}
                className="rounded-xl mt-1.5"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 flex-col sm:flex-row">
            {editing && (
              <Button
                variant="ghost"
                className="rounded-full text-destructive hover:bg-destructive/10 sm:mr-auto"
                onClick={handleDeleteClick}
              >
                <Trash2 className="size-4" />
                {t("appointments.delete")}
              </Button>
            )}
            <Button
              variant="ghost"
              className="rounded-full"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              className="rounded-full font-bold"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? t("common.saving") : t("appointments.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scope chooser for instance edits/deletes */}
      <AlertDialog open={scopeOpen} onOpenChange={setScopeOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingScope === "delete"
                ? t("appointments.deleteConfirm.title")
                : t("appointments.scope.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingScope === "delete"
                ? t("appointments.deleteConfirm.bodyInstance")
                : t("appointments.scope.body")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              className="rounded-full"
              onClick={() => {
                setPendingScope(null);
              }}
            >
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full"
              onClick={() => commitScope("this")}
            >
              {t("appointments.scope.thisOne")}
            </AlertDialogAction>
            <AlertDialogAction
              className="rounded-full"
              onClick={() => commitScope("series")}
            >
              {t("appointments.scope.series")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Plain confirm for non-recurring deletes */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("appointments.deleteConfirm.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("appointments.deleteConfirm.body")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={commitPlainDelete}
            >
              {t("appointments.deleteConfirm.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function chipColor(a: ExpandedAppointment): string {
  if (a.color) return a.color;
  return a.kind === "therapy"
    ? DEFAULT_COLOR.therapy
    : DEFAULT_COLOR.appointment;
}

function blankValues(dayStr: string): DialogValues {
  return {
    title: "",
    kind: "appointment",
    date: dayStr,
    time: "09:00",
    endTime: "",
    allDay: false,
    location: "",
    notes: "",
    color: DEFAULT_COLOR.appointment,
    repeat: "none",
    interval: 1,
    weekdays: [],
  };
}

function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toTimeInput(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function toLocalDateTime(dateStr: string, timeStr: string): Date {
  // Interpret as browser-local time — matches the existing schedule dialog's
  // write convention. Display uses family tz via wallClockIn/formatTimeIn.
  return new Date(`${dateStr}T${timeStr}`);
}

/**
 * Advance the given anchor by N calendar months, staying inside the same
 * family-timezone month by anchoring to the 15th (avoids Feb 30 issues).
 */
function shiftMonth(anchor: Date, delta: number, tz: string): Date {
  const p = wallClockIn(anchor, tz);
  const [y, m] = p.todayStr.split("-").map(Number);
  const y2 = y + Math.floor((m - 1 + delta) / 12);
  const m2 = ((((m - 1 + delta) % 12) + 12) % 12) + 1;
  return new Date(`${y2}-${String(m2).padStart(2, "0")}-15T12:00:00`);
}

type GridDay = {
  dateStr: string; // YYYY-MM-DD (family tz)
  dayOfMonth: number;
  inMonth: boolean;
};

function buildMonthGrid(
  anchor: Date,
  tz: string,
): {
  gridStart: Date;
  gridEnd: Date;
  gridDays: GridDay[];
  monthStr: string;
} {
  const p = wallClockIn(anchor, tz);
  const [year, month] = p.todayStr.split("-").map(Number);
  // First of month in browser-local time — good enough anchor to walk 42 days
  // and derive family-tz day strings for each.
  const first = new Date(year, month - 1, 1, 12, 0, 0, 0);
  // Grid starts on Monday of the week containing the 1st.
  const firstWeekday = first.getDay(); // 0=Sun..6=Sat
  const backDays = (firstWeekday + 6) % 7; // days to previous Monday
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - backDays);
  gridStart.setHours(0, 0, 0, 0);

  const days: GridDay[] = [];
  const cursor = new Date(gridStart);
  for (let i = 0; i < 42; i++) {
    const partsCursor = wallClockIn(cursor, tz);
    const [cy, cm, cd] = partsCursor.todayStr.split("-").map(Number);
    days.push({
      dateStr: partsCursor.todayStr,
      dayOfMonth: cd,
      inMonth: cy === year && cm === month,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  const gridEnd = new Date(cursor);
  return {
    gridStart,
    gridEnd,
    gridDays: days,
    monthStr: `${year}-${String(month).padStart(2, "0")}`,
  };
}

function formatDayHeading(dayStr: string, tz: string, lang: string): string {
  // dayStr is YYYY-MM-DD in tz — build a Date that when read back through
  // wallClockIn gives the same day; noon is safe.
  const [y, m, d] = dayStr.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
  return new Intl.DateTimeFormat(lang === "sv" ? "sv-SE" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: tz,
  }).format(dt);
}

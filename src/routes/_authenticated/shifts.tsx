import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Plus, Trash2, CalendarClock } from "lucide-react";
import { toast } from "@/lib/notify";
import { DashboardLayout } from "@/components/carenest/DashboardLayout";
import { initials } from "@/components/carenest/AvatarColorPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useMyMembership, useProfile } from "@/lib/auth/use-profile";
import { useFamily, useFamilyMembers } from "@/lib/data/family";
import { dateInputIn, dateTimeInputIn, zonedWallClockToDate } from "@/lib/time/family-tz";
import { useCaregiverProfiles, type CaregiverProfile } from "@/lib/data/caregiver-profiles";
import {
  expandShifts,
  startOfWeek,
  useCreateShift,
  useDeleteShift,
  useShifts,
  useUpdateShift,
  type ShiftOccurrence,
  type ShiftRow,
} from "@/lib/data/shifts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/shifts")({
  head: () => ({ meta: [{ title: "Shifts — CareNest" }] }),
  component: ShiftsPage,
});

const SHIFT_COLORS = [
  "#a7d8ff",
  "#ffd9a8",
  "#c8f0c4",
  "#ffc6d3",
  "#e0c8ff",
  "#fff0a8",
  "#b8e8e0",
];

const UNASSIGNED_KEY = "__unassigned__";

// The previous device-local toLocalDateTimeInput / toLocalDateInput helpers
// were removed — they showed the browser's wall clock instead of the family's.
// ShiftDialog now renders and parses input values through the family timezone
// via dateTimeInputIn / dateInputIn / zonedWallClockToDate.


function ShiftsPage() {
  const { t, i18n } = useTranslation();
  const { data: profile } = useProfile();
  const { data: membership } = useMyMembership();
  const familyId = membership?.family_id;
  const isOwner = membership?.role === "owner";

  const { data: members } = useFamilyMembers(familyId);
  const { data: profiles } = useCaregiverProfiles(familyId);
  const { data: shifts } = useShifts(familyId);

  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [editing, setEditing] = useState<ShiftRow | null>(null);
  const [creating, setCreating] = useState<{ profileId?: string; date?: Date } | null>(
    null,
  );

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    return d;
  }, [weekStart]);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart],
  );

  const occurrences = useMemo(
    () => expandShifts(shifts ?? [], weekStart, weekEnd),
    [shifts, weekStart, weekEnd],
  );

  const occByProfileDay = useMemo(() => {
    const map = new Map<string, ShiftOccurrence[]>();
    for (const occ of occurrences) {
      const dayIdx = Math.floor(
        (new Date(occ.start.getFullYear(), occ.start.getMonth(), occ.start.getDate()).getTime() -
          weekStart.getTime()) /
          (24 * 3600 * 1000),
      );
      const key = `${occ.caregiverProfileId ?? UNASSIGNED_KEY}:${dayIdx}`;
      const list = map.get(key) ?? [];
      list.push(occ);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.start.getTime() - b.start.getTime());
    return map;
  }, [occurrences, weekStart]);

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language === "sv" ? "sv-SE" : "en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    [i18n.language],
  );
  const rangeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language === "sv" ? "sv-SE" : "en-US", {
        month: "short",
        day: "numeric",
      }),
    [i18n.language],
  );
  const timeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language === "sv" ? "sv-SE" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [i18n.language],
  );

  function shiftWeek(delta: number) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(d);
  }

  function openCreate(profileId?: string, date?: Date) {
    if (!isOwner) return;
    setCreating({ profileId, date });
    setEditing(null);
  }

  function openEdit(occ: ShiftOccurrence) {
    if (!isOwner) return;
    const master = (shifts ?? []).find((s) => s.id === occ.masterId);
    if (!master) return;
    setEditing(master);
    setCreating(null);
  }

  const activeProfiles = (profiles ?? []).filter((p) => p.is_active);
  const accountById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members ?? []) {
      const name = m.profile?.full_name?.trim() || t("caregiversPage.unnamed");
      map.set(m.user_id, name);
    }
    return map;
  }, [members, t]);

  const hasUnassigned = occurrences.some((o) => !o.caregiverProfileId);

  return (
    <DashboardLayout
      title={t("shiftsPage.title")}
      subtitle={t("shiftsPage.subtitle")}
      actions={
        isOwner ? (
          <Button
            size="sm"
            className="rounded-full gap-1.5 font-semibold"
            onClick={() => openCreate()}
          >
            <Plus className="size-4" /> {t("shiftsPage.addShift")}
          </Button>
        ) : undefined
      }
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Week navigator */}
        <div className="flex items-center justify-between gap-3 card-soft p-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => shiftWeek(-1)}
            aria-label={t("shiftsPage.prevWeek")}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div className="text-center">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
              {t("shiftsPage.week")}
            </div>
            <div className="font-extrabold text-base md:text-lg">
              {rangeFmt.format(weekStart)} – {rangeFmt.format(new Date(weekEnd.getTime() - 1))}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => setWeekStart(startOfWeek(new Date()))}
            >
              {t("shiftsPage.today")}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => shiftWeek(1)}
              aria-label={t("shiftsPage.nextWeek")}
            >
              <ChevronRight className="size-5" />
            </Button>
          </div>
        </div>

        {/* Grid */}
        {activeProfiles.length === 0 && !hasUnassigned ? (
          <div className="card-soft p-10 text-center">
            <CalendarClock className="size-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold">{t("shiftsPage.noProfiles")}</p>
            <p className="text-sm text-muted-foreground">{t("shiftsPage.addProfilesFirst")}</p>
          </div>
        ) : (
          <div className="card-soft overflow-x-auto">
            <div className="min-w-[860px]">
              {/* Header row */}
              <div className="grid grid-cols-[220px_repeat(7,1fr)] border-b border-border/60">
                <div className="p-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("shiftsPage.caregiverProfile")}
                </div>
                {days.map((d) => {
                  const isToday = d.toDateString() === new Date().toDateString();
                  return (
                    <div
                      key={d.toISOString()}
                      className={cn(
                        "p-3 text-center border-l border-border/60",
                        isToday && "bg-primary-soft/40",
                      )}
                    >
                      <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                        {dateFmt.format(d).split(" ")[0]}
                      </div>
                      <div className={cn("font-extrabold text-base", isToday && "text-primary")}>
                        {d.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Profile rows */}
              {activeProfiles.map((p) => (
                <ProfileRow
                  key={p.id}
                  profile={p}
                  accountName={accountById.get(p.account_user_id) ?? ""}
                  days={days}
                  occByProfileDay={occByProfileDay}
                  isOwner={!!isOwner}
                  onCreate={openCreate}
                  onEdit={openEdit}
                  timeFmt={timeFmt}
                />
              ))}

              {hasUnassigned && (
                <UnassignedRow
                  days={days}
                  occByProfileDay={occByProfileDay}
                  isOwner={!!isOwner}
                  onEdit={openEdit}
                  timeFmt={timeFmt}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit dialog */}
      {(creating || editing) && familyId && profile?.id && (
        <ShiftDialog
          open
          onOpenChange={(o) => {
            if (!o) {
              setCreating(null);
              setEditing(null);
            }
          }}
          familyId={familyId}
          userId={profile.id}
          profiles={activeProfiles}
          accountById={accountById}
          existing={editing}
          initialProfileId={creating?.profileId}
          initialDate={creating?.date}
        />
      )}
    </DashboardLayout>
  );
}

function ProfileRow({
  profile,
  accountName,
  days,
  occByProfileDay,
  isOwner,
  onCreate,
  onEdit,
  timeFmt,
}: {
  profile: CaregiverProfile;
  accountName: string;
  days: Date[];
  occByProfileDay: Map<string, ShiftOccurrence[]>;
  isOwner: boolean;
  onCreate: (profileId: string, date: Date) => void;
  onEdit: (occ: ShiftOccurrence) => void;
  timeFmt: Intl.DateTimeFormat;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-[220px_repeat(7,1fr)] border-b border-border/60 last:border-b-0">
      <div className="p-3 flex items-center gap-2 min-w-0">
        <div
          className="size-9 rounded-full flex items-center justify-center font-bold text-xs text-white flex-none"
          style={{ background: profile.color }}
        >
          {initials(profile.name) || "·"}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{profile.name}</div>
          {accountName && (
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
              {accountName}
            </div>
          )}
        </div>
      </div>
      {days.map((d, dayIdx) => {
        const key = `${profile.id}:${dayIdx}`;
        const list = occByProfileDay.get(key) ?? [];
        const isToday = d.toDateString() === new Date().toDateString();
        return (
          <div
            key={d.toISOString()}
            className={cn(
              "p-1.5 border-l border-border/60 min-h-[88px] space-y-1 group/cell relative",
              isToday && "bg-primary-soft/20",
            )}
          >
            {list.map((occ) => (
              <button
                key={occ.id}
                type="button"
                onClick={() => onEdit(occ)}
                disabled={!isOwner}
                className={cn(
                  "w-full text-left rounded-lg px-2 py-1.5 text-xs leading-tight transition",
                  isOwner && "hover:brightness-95 cursor-pointer",
                  !isOwner && "cursor-default",
                )}
                style={{ background: occ.color ?? profile.color }}
              >
                <div className="font-bold truncate">
                  {timeFmt.format(occ.start)} – {timeFmt.format(occ.end)}
                </div>
                {occ.category && <div className="truncate opacity-80">{occ.category}</div>}
              </button>
            ))}
            {isOwner && (
              <button
                type="button"
                onClick={() => onCreate(profile.id, d)}
                className="absolute inset-0 opacity-0 group-hover/cell:opacity-100 flex items-center justify-center text-muted-foreground hover:bg-muted/30 transition rounded"
                aria-label={t("shiftsPage.addShift")}
              >
                <Plus className="size-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function UnassignedRow({
  days,
  occByProfileDay,
  isOwner,
  onEdit,
  timeFmt,
}: {
  days: Date[];
  occByProfileDay: Map<string, ShiftOccurrence[]>;
  isOwner: boolean;
  onEdit: (occ: ShiftOccurrence) => void;
  timeFmt: Intl.DateTimeFormat;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-[220px_repeat(7,1fr)] border-t-2 border-dashed border-border/60">
      <div className="p-3 flex items-center gap-2 min-w-0">
        <div className="size-9 rounded-full flex items-center justify-center font-bold text-xs flex-none bg-muted text-muted-foreground">
          ?
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{t("shiftsPage.unassigned")}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("shiftsPage.unassignedHint")}
          </div>
        </div>
      </div>
      {days.map((d, dayIdx) => {
        const key = `${UNASSIGNED_KEY}:${dayIdx}`;
        const list = occByProfileDay.get(key) ?? [];
        return (
          <div
            key={d.toISOString()}
            className="p-1.5 border-l border-border/60 min-h-[88px] space-y-1"
          >
            {list.map((occ) => (
              <button
                key={occ.id}
                type="button"
                onClick={() => onEdit(occ)}
                disabled={!isOwner}
                className={cn(
                  "w-full text-left rounded-lg px-2 py-1.5 text-xs leading-tight transition border border-dashed border-border",
                  isOwner && "hover:brightness-95 cursor-pointer",
                )}
                style={{ background: occ.color ?? "var(--muted)" }}
              >
                <div className="font-bold truncate">
                  {timeFmt.format(occ.start)} – {timeFmt.format(occ.end)}
                </div>
                {occ.category && <div className="truncate opacity-80">{occ.category}</div>}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function ShiftDialog({
  open,
  onOpenChange,
  familyId,
  userId,
  profiles,
  accountById,
  existing,
  initialProfileId,
  initialDate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  familyId: string;
  userId: string;
  profiles: CaregiverProfile[];
  accountById: Map<string, string>;
  existing: ShiftRow | null;
  initialProfileId?: string;
  initialDate?: Date;
}) {
  const { t } = useTranslation();
  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const deleteShift = useDeleteShift();

  const defaultStart = useMemo(() => {
    if (existing) return new Date(existing.start_at);
    const d = initialDate ? new Date(initialDate) : new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  }, [existing, initialDate]);
  const defaultEnd = useMemo(() => {
    if (existing) return new Date(existing.end_at);
    const d = new Date(defaultStart);
    d.setHours(d.getHours() + 4);
    return d;
  }, [existing, defaultStart]);

  const [profileId, setProfileId] = useState<string>(
    existing?.caregiver_profile_id ?? initialProfileId ?? profiles[0]?.id ?? "",
  );
  const [startAt, setStartAt] = useState<string>(toLocalDateTimeInput(defaultStart));
  const [endAt, setEndAt] = useState<string>(toLocalDateTimeInput(defaultEnd));
  const [color, setColor] = useState<string>(existing?.color ?? SHIFT_COLORS[0]);
  const [category, setCategory] = useState<string>(existing?.category ?? "");
  const [repeatMode, setRepeatMode] = useState<"none" | "daily" | "weekly">(
    (existing?.recurrence_freq as "daily" | "weekly" | null) ?? "none",
  );
  const [interval, setInterval] = useState<number>(existing?.recurrence_interval ?? 1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    existing?.recurrence_days_of_week ?? [],
  );
  const [until, setUntil] = useState<string>(
    existing?.recurrence_until ? toLocalDateInput(new Date(existing.recurrence_until)) : "",
  );

  function toggleDay(dow: number) {
    setDaysOfWeek((cur) =>
      cur.includes(dow) ? cur.filter((d) => d !== dow) : [...cur, dow].sort(),
    );
  }

  async function handleSave() {
    const selectedProfile = profiles.find((p) => p.id === profileId);
    if (!selectedProfile) {
      toast.error(t("shiftsPage.errorProfile"));
      return;
    }
    const sa = new Date(startAt);
    const ea = new Date(endAt);
    if (!(ea > sa)) {
      toast.error(t("shiftsPage.errorTime"));
      return;
    }
    const payload = {
      family_id: familyId,
      caregiver_user_id: selectedProfile.account_user_id,
      caregiver_profile_id: selectedProfile.id,
      start_at: sa.toISOString(),
      end_at: ea.toISOString(),
      color,
      category: category.trim() || null,
      recurrence_freq: repeatMode === "none" ? null : repeatMode,
      recurrence_interval: repeatMode === "none" ? null : Math.max(1, interval),
      recurrence_days_of_week:
        repeatMode === "weekly" && daysOfWeek.length > 0 ? daysOfWeek : null,
      recurrence_until: repeatMode === "none" || !until ? null : new Date(until).toISOString(),
    };
    try {
      if (existing) {
        await updateShift.mutateAsync({ id: existing.id, patch: payload });
        toast.success(t("shiftsPage.savedUpdate"));
      } else {
        await createShift.mutateAsync({ ...payload, created_by: userId });
        toast.success(t("shiftsPage.savedCreate"));
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("caregiversPage.error"));
    }
  }

  async function handleDelete() {
    if (!existing) return;
    try {
      await deleteShift.mutateAsync(existing.id);
      toast.success(t("shiftsPage.deleted"));
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("caregiversPage.error"));
    }
  }

  const dayLabels = [
    t("shiftsPage.dow.sun"),
    t("shiftsPage.dow.mon"),
    t("shiftsPage.dow.tue"),
    t("shiftsPage.dow.wed"),
    t("shiftsPage.dow.thu"),
    t("shiftsPage.dow.fri"),
    t("shiftsPage.dow.sat"),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existing ? t("shiftsPage.editShift") : t("shiftsPage.addShift")}
          </DialogTitle>
          <DialogDescription>{t("shiftsPage.dialogDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{t("shiftsPage.caregiverProfile")}</Label>
            {profiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("shiftsPage.noProfiles")}</p>
            ) : (
              <Select value={profileId} onValueChange={setProfileId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-block size-3 rounded-full"
                          style={{ background: p.color }}
                        />
                        {p.name}
                        {accountById.get(p.account_user_id) && (
                          <span className="text-xs text-muted-foreground">
                            · {accountById.get(p.account_user_id)}
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("shiftsPage.startAt")}</Label>
              <Input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("shiftsPage.endAt")}</Label>
              <Input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("shiftsPage.category")}</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={t("shiftsPage.categoryPh")}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("shiftsPage.color")}</Label>
            <div className="flex flex-wrap gap-2">
              {SHIFT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "size-8 rounded-full border-2 transition",
                    color === c ? "border-foreground scale-110" : "border-transparent",
                  )}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("shiftsPage.repeat")}</Label>
            <Select
              value={repeatMode}
              onValueChange={(v) => setRepeatMode(v as "none" | "daily" | "weekly")}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("shiftsPage.repeatNone")}</SelectItem>
                <SelectItem value="daily">{t("shiftsPage.repeatDaily")}</SelectItem>
                <SelectItem value="weekly">{t("shiftsPage.repeatWeekly")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {repeatMode !== "none" && (
            <>
              <div className="space-y-1.5">
                <Label>
                  {repeatMode === "daily"
                    ? t("shiftsPage.everyNDays")
                    : t("shiftsPage.everyNWeeks")}
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={interval}
                  onChange={(e) => setInterval(Math.max(1, Number(e.target.value) || 1))}
                  className="rounded-xl w-24"
                />
              </div>
              {repeatMode === "weekly" && (
                <div className="space-y-1.5">
                  <Label>{t("shiftsPage.onDays")}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {dayLabels.map((lbl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleDay(i)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-semibold border transition",
                          daysOfWeek.includes(i)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:bg-muted",
                        )}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>{t("shiftsPage.until")}</Label>
                <Input
                  type="date"
                  value={until}
                  onChange={(e) => setUntil(e.target.value)}
                  className="rounded-xl"
                />
                <p className="text-xs text-muted-foreground">{t("shiftsPage.untilHint")}</p>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          {existing && (
            <Button
              variant="ghost"
              className="rounded-full text-destructive hover:text-destructive mr-auto"
              onClick={handleDelete}
              disabled={deleteShift.isPending}
            >
              <Trash2 className="size-4" /> {t("common.remove")}
            </Button>
          )}
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            className="rounded-full font-semibold"
            onClick={handleSave}
            disabled={createShift.isPending || updateShift.isPending}
          >
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

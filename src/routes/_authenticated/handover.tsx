import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ClipboardList, Plus, Trash2, User, Clock, Sparkles, Check, Pencil } from "lucide-react";
import { DashboardLayout } from "@/components/carenest/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useMyMembership, useProfile, useSession } from "@/lib/auth/use-profile";
import { useActiveCaregiverProfile } from "@/lib/data/active-profile";
import { ByProfile } from "@/components/carenest/ByProfile";
import {
  SHIFT_LABELS,
  useCreateHandover,
  useDeleteHandover,
  useHandovers,
  type Handover,
  type ShiftLabel,
} from "@/lib/data/handovers";
import { useHandoverPrefill } from "@/lib/data/handover-prefill";
import {
  isUnreadForViewer,
  useHandoverReadsBulk,
  useMarkHandoverRead,
  type HandoverRead,
} from "@/lib/data/handover-reads";
import { useCaregiverProfiles } from "@/lib/data/caregiver-profiles";
import { useFamilyMembers } from "@/lib/data/family";
import { ForYourShiftCard } from "@/components/carenest/ForYourShiftCard";
import { cn } from "@/lib/utils";
import { z } from "zod";

const handoverSearchSchema = z.object({
  shiftStart: z.string().optional(),
  shiftEnd: z.string().optional(),
  compose: z.union([z.literal("1"), z.literal(1), z.boolean()]).optional(),
});

function inferredShiftStart(now: Date): Date {
  const h = now.getHours();
  const d = new Date(now);
  d.setMinutes(0, 0, 0);
  if (h < 12) d.setHours(0);
  else if (h < 18) d.setHours(12);
  else d.setHours(18);
  return d;
}

export const Route = createFileRoute("/_authenticated/handover")({
  head: () => ({ meta: [{ title: "Handover — CareNest" }] }),
  validateSearch: handoverSearchSchema,
  component: HandoverPage,
});

function defaultShift(): ShiftLabel {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "night";
}

function HandoverPage() {
  const { t, i18n } = useTranslation();
  const { user } = useSession();
  const { data: profile } = useProfile();
  const { data: membership } = useMyMembership();
  const { activeId: activeCaregiverId } = useActiveCaregiverProfile(
    membership?.family_id,
    user?.id,
  );
  const { data: handovers, isLoading } = useHandovers(membership?.family_id);
  const createHandover = useCreateHandover();
  const deleteHandover = useDeleteHandover();
  const markRead = useMarkHandoverRead();
  const handoverIds = useMemo(
    () => (handovers ?? []).map((h) => h.id),
    [handovers],
  );
  const { data: readsMap } = useHandoverReadsBulk(handoverIds);
  const { data: caregiverProfiles } = useCaregiverProfiles(membership?.family_id);
  const { data: familyMembers } = useFamilyMembers(membership?.family_id);
  const navigate = Route.useNavigate();
  const { shiftStart: shiftStartIso, shiftEnd: shiftEndIso, compose } = Route.useSearch();

  const shiftWindow = useMemo(() => {
    if (shiftStartIso && shiftEndIso) {
      const s = new Date(shiftStartIso);
      const e = new Date(shiftEndIso);
      if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) {
        return { start: s, end: e };
      }
    }
    if (compose) {
      const end = new Date();
      const start = inferredShiftStart(end);
      return { start, end };
    }
    return null;
  }, [shiftStartIso, shiftEndIso, compose]);

  const prefillLabels = useMemo(
    () => ({
      medSkipped: t("handoverPage.prefill.medSkipped"),
      medRefused: t("handoverPage.prefill.medRefused"),
      medPostponed: t("handoverPage.prefill.medPostponed"),
      medMissed: t("handoverPage.prefill.medMissed"),
      apptMissed: t("handoverPage.prefill.apptMissed"),
      apptCancelled: t("handoverPage.prefill.apptCancelled"),
      vitalAbnormal: t("handoverPage.prefill.vitalAbnormal"),
      empty: t("handoverPage.prefill.empty"),
      oxygenStarted: t("handoverPage.prefill.oxygenStarted"),
      oxygenReplaced: t("handoverPage.prefill.oxygenReplaced"),
      hospital: t("handoverPage.prefill.hospital"),
      carePlaceIssue: t("handoverPage.prefill.carePlaceIssue"),
      taskNote: t("handoverPage.prefill.taskNote"),
      tidySkipped: t("handoverPage.prefill.tidySkipped"),
      maintenanceDone: t("handoverPage.prefill.maintenanceDone"),
      maintenanceOverdue: t("handoverPage.prefill.maintenanceOverdue"),
    }),
    [t],
  );

  const prefillInput =
    membership?.family_id && shiftWindow
      ? {
          familyId: membership.family_id,
          shiftStart: shiftWindow.start,
          shiftEnd: shiftWindow.end,
        }
      : null;
  const { data: prefill } = useHandoverPrefill(prefillInput, prefillLabels);

  function shiftLabelFromDate(d: Date): ShiftLabel {
    const h = d.getHours();
    if (h < 12) return "morning";
    if (h < 18) return "afternoon";
    return "night";
  }

  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Handover | null>(null);
  const [form, setForm] = useState({
    shift: defaultShift() as ShiftLabel,
    summary: "",
    sleep: "",
    mood: "",
    seizures: "",
    fluids: "",
    meds: "",
    notes: "",
  });

  // When arriving with shift query params, open dialog + seed from prefill
  useEffect(() => {
    if (!shiftWindow || !prefill) return;
    setForm((prev) => ({
      ...prev,
      shift: shiftLabelFromDate(shiftWindow.start),
      meds: prev.meds || prefill.meds,
      notes: prev.notes || prefill.notes,
    }));
    setOpen(true);
  }, [shiftWindow, prefill]);

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language === "sv" ? "sv-SE" : "en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
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

  function resetForm() {
    setForm({
      shift: defaultShift(),
      summary: "",
      sleep: "",
      mood: "",
      seizures: "",
      fluids: "",
      meds: "",
      notes: "",
    });
  }

  async function handleSubmit() {
    if (!membership?.family_id || !profile?.id) return;
    try {
      await createHandover.mutateAsync({
        family_id: membership.family_id,
        author_id: profile.id,
        caregiver_profile_id: activeCaregiverId ?? null,
        shift: form.shift,
        summary: form.summary || null,
        sleep: form.sleep || null,
        mood: form.mood || null,
        seizures: form.seizures || null,
        fluids: form.fluids || null,
        meds: form.meds || null,
        notes: form.notes || null,
      });
      toast.success(t("handoverPage.saved"));
      setOpen(false);
      resetForm();
      if (shiftStartIso || shiftEndIso || compose) {
        navigate({ search: {}, replace: true });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("handoverPage.saveError"));
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await deleteHandover.mutateAsync(confirmDelete.id);
      toast.success(t("handoverPage.deleted"));
      setConfirmDelete(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("handoverPage.deleteError"));
    }
  }

  return (
    <DashboardLayout
      title={t("nav.handover")}
      subtitle={t("handoverPage.subtitle")}
      actions={
        <Button
          size="sm"
          className="rounded-full gap-1.5 font-semibold"
          onClick={() => setOpen(true)}
        >
          <Plus className="size-4" /> {t("handoverPage.new")}
        </Button>
      }
    >
      <ForYourShiftCard familyId={membership?.family_id} />
      {isLoading ? (
        <div className="card-soft p-10 text-center text-muted-foreground">
          {t("common.loading")}
        </div>
      ) : !handovers || handovers.length === 0 ? (
        <div className="card-soft p-10 text-center max-w-xl mx-auto">
          <div className="size-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="size-7" />
          </div>
          <h2 className="text-2xl font-extrabold mb-2">{t("handoverPage.emptyTitle")}</h2>
          <p className="text-muted-foreground mb-6">{t("handoverPage.emptyBody")}</p>
          <Button className="rounded-full gap-1.5 font-semibold" onClick={() => setOpen(true)}>
            <Plus className="size-4" /> {t("handoverPage.new")}
          </Button>
        </div>
      ) : (
        <ul className="space-y-4 max-w-3xl mx-auto">
          {handovers.map((h) => (
            <li key={h.id} className="card-soft p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold",
                      shiftToneClass(h.shift),
                    )}
                  >
                    {t(`handoverPage.shift.${h.shift}`)}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    {dateFmt.format(new Date(h.created_at))}
                  </div>
                  {h.edited_at && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800"
                      title={dateFmt.format(new Date(h.edited_at))}
                    >
                      <Pencil className="size-3" />
                      {t("handoverPage.reads.edited", {
                        time: timeFmt.format(new Date(h.edited_at)),
                      })}
                    </span>
                  )}
                </div>
                {h.author_id === profile?.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-muted-foreground hover:text-destructive"
                    onClick={() => setConfirmDelete(h)}
                    aria-label={t("common.cancel")}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>

              {h.summary && (
                <p className="text-base font-semibold mb-4 leading-relaxed">{h.summary}</p>
              )}

              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Field label={t("handoverPage.fields.sleep")} value={h.sleep} />
                <Field label={t("handoverPage.fields.mood")} value={h.mood} />
                <Field label={t("handoverPage.fields.seizures")} value={h.seizures} />
                <Field label={t("handoverPage.fields.fluids")} value={h.fluids} />
                <Field label={t("handoverPage.fields.meds")} value={h.meds} />
                <Field label={t("handoverPage.fields.notes")} value={h.notes} />
              </dl>

              <div className="mt-4 pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="size-3.5" />
                  <ByProfile
                    familyId={membership?.family_id}
                    caregiverProfileId={h.caregiver_profile_id}
                    authorUserId={h.author_id}
                    viewerUserId={user?.id}
                  />
                </div>
                <HandoverReadsRow
                  reads={readsMap?.get(h.id) ?? []}
                  editedAt={h.edited_at}
                  familyMembers={familyMembers ?? []}
                  caregiverProfiles={caregiverProfiles ?? []}
                  viewerUserId={user?.id ?? null}
                  isAuthor={h.author_id === profile?.id}
                  onMarkRead={() => {
                    markRead
                      .mutateAsync(h.id)
                      .then(() => toast.success(t("handoverPage.reads.markedRead")))
                      .catch(() => { /* ignore */ });
                  }}
                  timeFmt={timeFmt}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (o) {
            setOpen(true);
          } else {
            setOpen(false);
            resetForm();
            if (shiftStartIso || shiftEndIso || compose) {
              navigate({ search: {}, replace: true });
            }
          }
        }}
      >
        <DialogContent className="rounded-2xl max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("handoverPage.newTitle")}</DialogTitle>
            <DialogDescription>{t("handoverPage.newBody")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {shiftWindow && (
              <div className="rounded-xl bg-primary-soft/60 text-sm px-4 py-3 flex items-start gap-2">
                <Sparkles className="size-4 mt-0.5 text-primary shrink-0" />
                <div>
                  <p className="font-semibold">
                    {t("handoverPage.prefill.banner")}
                  </p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {dateFmt.format(shiftWindow.start)} – {dateFmt.format(shiftWindow.end)}
                    {prefill && !prefill.hasContent
                      ? ` · ${t("handoverPage.prefill.nothing")}`
                      : ""}
                  </p>
                </div>
              </div>
            )}
            <div>
              <Label className="font-semibold">{t("handoverPage.fields.shift")}</Label>
              <Select
                value={form.shift}
                onValueChange={(v) => setForm({ ...form, shift: v as ShiftLabel })}
              >
                <SelectTrigger className="rounded-xl mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIFT_LABELS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`handoverPage.shift.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-semibold">{t("handoverPage.fields.summary")}</Label>
              <Textarea
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                placeholder={t("handoverPage.placeholders.summary")}
                rows={2}
                className="rounded-xl mt-1.5"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FieldInput
                label={t("handoverPage.fields.sleep")}
                value={form.sleep}
                onChange={(v) => setForm({ ...form, sleep: v })}
                placeholder={t("handoverPage.placeholders.sleep")}
              />
              <FieldInput
                label={t("handoverPage.fields.mood")}
                value={form.mood}
                onChange={(v) => setForm({ ...form, mood: v })}
                placeholder={t("handoverPage.placeholders.mood")}
              />
              <FieldInput
                label={t("handoverPage.fields.seizures")}
                value={form.seizures}
                onChange={(v) => setForm({ ...form, seizures: v })}
                placeholder={t("handoverPage.placeholders.seizures")}
              />
              <FieldInput
                label={t("handoverPage.fields.fluids")}
                value={form.fluids}
                onChange={(v) => setForm({ ...form, fluids: v })}
                placeholder={t("handoverPage.placeholders.fluids")}
              />
              <FieldInput
                label={t("handoverPage.fields.meds")}
                value={form.meds}
                onChange={(v) => setForm({ ...form, meds: v })}
                placeholder={t("handoverPage.placeholders.meds")}
              />
            </div>
            <div>
              <Label className="font-semibold">{t("handoverPage.fields.notes")}</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t("handoverPage.placeholders.notes")}
                rows={3}
                className="rounded-xl mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              className="rounded-full"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              className="rounded-full font-bold"
              onClick={handleSubmit}
              disabled={createHandover.isPending}
            >
              {createHandover.isPending ? t("common.saving") : t("handoverPage.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("handoverPage.confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("handoverPage.confirmDeleteBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              {t("handoverPage.deleteAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

function shiftToneClass(shift: ShiftLabel) {
  switch (shift) {
    case "morning":
      return "bg-warning/20 text-warning-foreground";
    case "afternoon":
      return "bg-success/20 text-success-foreground";
    case "night":
      return "bg-lavender-deep/40 text-accent-foreground";
    default:
      return "bg-primary-soft text-primary";
  }
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label className="font-semibold">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl mt-1.5"
      />
    </div>
  );
}

interface HandoverReadsRowProps {
  reads: HandoverRead[];
  editedAt: string | null;
  familyMembers: Array<{ user_id: string; profile?: { full_name?: string | null } | null }>;
  caregiverProfiles: Array<{ id: string; account_user_id: string | null; name: string; color: string }>;
  viewerUserId: string | null;
  isAuthor: boolean;
  onMarkRead: () => void;
  timeFmt: Intl.DateTimeFormat;
}

function HandoverReadsRow({
  reads,
  editedAt,
  familyMembers,
  caregiverProfiles,
  viewerUserId,
  isAuthor,
  onMarkRead,
  timeFmt,
}: HandoverReadsRowProps) {
  const { t } = useTranslation();
  const viewerUnread = isUnreadForViewer(reads, viewerUserId, editedAt);
  const editedTs = editedAt ? new Date(editedAt).getTime() : null;

  return (
    <div className="flex items-center gap-3 flex-wrap justify-end ml-auto">
      {reads.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-muted-foreground">
            {t("handoverPage.reads.readBy")}
          </span>
          {reads.map((r) => {
            // Prefer a caregiver profile matching the reader; fall back to member.
            const profile = caregiverProfiles.find(
              (p) => p.account_user_id === r.user_id,
            );
            const memberName = familyMembers.find(
              (m) => m.user_id === r.user_id,
            )?.profile?.full_name?.trim();
            const name = profile?.name || memberName || "—";
            const before =
              editedTs !== null &&
              new Date(r.read_at).getTime() < editedTs;
            return (
              <span
                key={r.user_id}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
                  before
                    ? "bg-amber-50 text-amber-800"
                    : "bg-muted text-foreground",
                )}
                title={new Date(r.read_at).toLocaleString()}
              >
                {profile?.color && (
                  <span
                    className="inline-block size-2 rounded-full"
                    style={{ background: profile.color }}
                  />
                )}
                <span className="font-semibold">{name}</span>
                <span className="text-muted-foreground">
                  · {timeFmt.format(new Date(r.read_at))}
                </span>
                {before && (
                  <span className="text-[10px] font-bold uppercase ml-1">
                    · {t("handoverPage.reads.readBefore")}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      )}
      {!isAuthor && viewerUnread && (
        <Button
          size="sm"
          variant="outline"
          className="rounded-full h-7 gap-1.5"
          onClick={onMarkRead}
        >
          <Check className="size-3.5" />
          {t("handoverPage.reads.markRead")}
        </Button>
      )}
    </div>
  );
}

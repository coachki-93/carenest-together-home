import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ClipboardList, Plus, Trash2, User, Clock } from "lucide-react";
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
import { toast } from "sonner";
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/handover")({
  head: () => ({ meta: [{ title: "Handover — CareNest" }] }),
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
  const { data: profile } = useProfile();
  const { data: membership } = useMyMembership();
  const { data: handovers, isLoading } = useHandovers(membership?.family_id);
  const createHandover = useCreateHandover();
  const deleteHandover = useDeleteHandover();

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

              <div className="mt-4 pt-4 border-t border-border/60 flex items-center gap-2 text-xs text-muted-foreground">
                <User className="size-3.5" />
                {h.author_id === profile?.id
                  ? t("handoverPage.byYou")
                  : t("handoverPage.byCaregiver")}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : (setOpen(false), resetForm()))}>
        <DialogContent className="rounded-2xl max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("handoverPage.newTitle")}</DialogTitle>
            <DialogDescription>{t("handoverPage.newBody")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
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

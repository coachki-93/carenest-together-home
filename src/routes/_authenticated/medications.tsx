import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Pill, Plus, Trash2, Pencil, X, Clock } from "lucide-react";
import { DashboardLayout } from "@/components/carenest/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { cn } from "@/lib/utils";
import { useMyMembership } from "@/lib/auth/use-profile";
import {
  useFamilyChild,
  useMedications,
  useSaveMedication,
  useDeleteMedication,
  type Medication,
  type MedRoute,
} from "@/lib/data/medications";

export const Route = createFileRoute("/_authenticated/medications")({
  head: () => ({ meta: [{ title: "Medications — CareNest" }] }),
  component: MedicationsPage,
});

const ROUTE_OPTIONS: MedRoute[] = ["oral", "g_tube", "injection", "topical", "inhaled", "other"];
const COLOR_OPTIONS = ["#A78BFA", "#F472B6", "#34D399", "#FBBF24", "#60A5FA", "#FB7185"];

function MedicationsPage() {
  const { t } = useTranslation();
  const { data: membership } = useMyMembership();
  const familyId = membership?.family_id;
  const isOwner = membership?.role === "owner";
  const { data: child } = useFamilyChild(familyId);
  const { data: meds, isLoading } = useMedications(familyId);

  const [editing, setEditing] = useState<Medication | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Medication | null>(null);
  const deleteMed = useDeleteMedication();

  if (!child && membership) {
    return (
      <DashboardLayout title={t("meds.title")}>
        <div className="card-soft p-10 text-center max-w-md mx-auto">
          <div className="size-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mx-auto mb-4">
            <Pill className="size-7" />
          </div>
          <p className="text-muted-foreground mb-6">{t("meds.noChildFirst")}</p>
          {isOwner && (
            <Button asChild>
              <Link to="/child">{t("meds.goToChild")}</Link>
            </Button>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={t("meds.title")}
      subtitle={child ? t("meds.subtitle", { name: child.name }) : undefined}
      actions={
        child && isOwner ? (
          <Button onClick={() => setCreating(true)} className="rounded-full">
            <Plus className="size-4" /> {t("meds.addNew")}
          </Button>
        ) : null
      }
    >
      {isLoading ? (
        <div className="text-muted-foreground">{t("common.loading")}</div>
      ) : !meds || meds.length === 0 ? (
        <div className="card-soft p-10 text-center max-w-md mx-auto">
          <div className="size-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mx-auto mb-4">
            <Pill className="size-7" />
          </div>
          <h2 className="text-xl font-extrabold mb-2">{t("meds.noMeds")}</h2>
          <p className="text-muted-foreground mb-6">
            {isOwner ? t("meds.noMedsBody") : t("meds.noMedsBodyCaregiver")}
          </p>
          {child && isOwner && (
            <Button onClick={() => setCreating(true)} className="rounded-full">
              <Plus className="size-4" /> {t("meds.addNew")}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {meds.map((m) => (
            <MedicationCard
              key={m.id}
              med={m}
              canEdit={isOwner}
              onEdit={() => setEditing(m)}
              onDelete={() => setDeleting(m)}
            />
          ))}
        </div>
      )}


      {(creating || editing) && child && familyId && (
        <MedicationDialog
          familyId={familyId}
          childId={child.id}
          medication={editing ?? undefined}
          open
          onOpenChange={(o) => {
            if (!o) {
              setCreating(false);
              setEditing(null);
            }
          }}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("meds.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("meds.deleteBody", { name: deleting?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleting) return;
                try {
                  await deleteMed.mutateAsync(deleting.id);
                  toast.success(t("meds.deleted"));
                } catch (e) {
                  toast.error((e as Error).message);
                }
                setDeleting(null);
              }}
            >
              {t("meds.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

function MedicationCard({
  med,
  onEdit,
  onDelete,
}: {
  med: Medication;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const dose = [med.dose_amount, med.dose_unit].filter(Boolean).join(" ");
  return (
    <div className={cn("card-soft p-5", !med.active && "opacity-60")}>
      <div className="flex items-start gap-3">
        <div
          className="size-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: (med.color ?? "#A78BFA") + "33", color: med.color ?? "#A78BFA" }}
        >
          <Pill className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-extrabold text-lg truncate">{med.name}</h3>
              <p className="text-sm text-muted-foreground">
                {dose || "—"} · {t(`meds.route${routeKey(med.route)}`)}
              </p>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="rounded-full" onClick={onEdit}>
                <Pencil className="size-4" />
              </Button>
              <Button size="icon" variant="ghost" className="rounded-full" onClick={onDelete}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </div>
          {med.instructions && (
            <p className="text-sm text-muted-foreground mt-2">{med.instructions}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(med.times ?? []).map((tm) => (
              <span
                key={tm}
                className="inline-flex items-center gap-1 text-xs font-semibold rounded-full bg-primary-soft text-primary px-2.5 py-1"
              >
                <Clock className="size-3" />
                {tm}
              </span>
            ))}
            {(med.times ?? []).length === 0 && (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function routeKey(r: MedRoute): string {
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

function MedicationDialog({
  familyId,
  childId,
  medication,
  open,
  onOpenChange,
}: {
  familyId: string;
  childId: string;
  medication?: Medication;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { t } = useTranslation();
  const saveMed = useSaveMedication();
  const [name, setName] = useState(medication?.name ?? "");
  const [doseAmount, setDoseAmount] = useState(
    medication?.dose_amount != null ? String(medication.dose_amount) : "",
  );
  const [doseUnit, setDoseUnit] = useState(medication?.dose_unit ?? "");
  const [route, setRoute] = useState<MedRoute>(medication?.route ?? "oral");
  const [instructions, setInstructions] = useState(medication?.instructions ?? "");
  const [times, setTimes] = useState<string[]>(medication?.times ?? []);
  const [color, setColor] = useState(medication?.color ?? COLOR_OPTIONS[0]);
  const [active, setActive] = useState(medication?.active ?? true);
  const [newTime, setNewTime] = useState("08:00");

  const addTime = () => {
    if (!newTime || times.includes(newTime)) return;
    setTimes([...times, newTime].sort());
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t("meds.nameRequired"));
      return;
    }
    try {
      await saveMed.mutateAsync({
        id: medication?.id,
        family_id: familyId,
        child_id: childId,
        name: name.trim(),
        dose_amount: doseAmount ? Number(doseAmount.replace(",", ".")) : null,
        dose_unit: doseUnit.trim() || null,
        route,
        instructions: instructions.trim() || null,
        times,
        color,
        active,
      });
      toast.success(t("meds.saved"));
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{medication ? t("meds.edit") : t("meds.addNew")}</DialogTitle>
          <DialogDescription className="sr-only">{t("meds.title")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="med-name">{t("meds.name")}</Label>
            <Input
              id="med-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("meds.namePh")}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="med-dose">{t("meds.dose")}</Label>
              <Input
                id="med-dose"
                value={doseAmount}
                onChange={(e) => setDoseAmount(e.target.value)}
                placeholder={t("meds.doseAmountPh")}
                inputMode="decimal"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="med-unit">{t("meds.doseUnit")}</Label>
              <Input
                id="med-unit"
                value={doseUnit}
                onChange={(e) => setDoseUnit(e.target.value)}
                placeholder={t("meds.doseUnitPh")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("meds.route")}</Label>
            <Select value={route} onValueChange={(v) => setRoute(v as MedRoute)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROUTE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`meds.route${routeKey(r)}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="med-inst">{t("meds.instructions")}</Label>
            <Textarea
              id="med-inst"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={t("meds.instructionsPh")}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("meds.times")}</Label>
            <p className="text-xs text-muted-foreground">{t("meds.timesHelp")}</p>
            <div className="flex flex-wrap gap-2">
              {times.map((tm) => (
                <span
                  key={tm}
                  className="inline-flex items-center gap-1 text-sm font-semibold rounded-full bg-primary-soft text-primary pl-3 pr-1 py-1"
                >
                  <Clock className="size-3.5" />
                  {tm}
                  <button
                    type="button"
                    onClick={() => setTimes(times.filter((x) => x !== tm))}
                    className="ml-1 rounded-full p-0.5 hover:bg-primary/20"
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-32"
              />
              <Button type="button" variant="outline" onClick={addTime} className="rounded-full">
                <Plus className="size-4" /> {t("meds.addTime")}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("meds.color")}</Label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "size-9 rounded-full border-2 transition-transform",
                    color === c ? "border-foreground scale-110" : "border-transparent",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
            <Label htmlFor="med-active" className="cursor-pointer">
              {active ? t("meds.active") : t("meds.inactive")}
            </Label>
            <Switch id="med-active" checked={active} onCheckedChange={setActive} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-full"
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={saveMed.isPending} className="rounded-full">
              {saveMed.isPending ? t("meds.saving") : t("meds.saveMed")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

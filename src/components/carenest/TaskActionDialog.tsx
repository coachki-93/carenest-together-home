import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import type { CaregiverProfile } from "@/lib/data/caregiver-profiles";
import { VITAL_CONTEXTS, type VitalType, type VitalContext } from "@/lib/data/vitals";
import { cn } from "@/lib/utils";

export type TaskAction = "done" | "skipped" | "postponed";

export interface TaskActionResult {
  action: TaskAction;
  caregiverProfileId: string | null;
  reason: string | null;
  postponedTo: Date | null;
  vitalValue: number | null;
  vitalContext: VitalContext | null;
  notes: string | null;
}

export interface VitalSpec {
  type: VitalType;
  unit: string;
  label: string;
  step?: string;
  placeholder?: string;
  defaultValue?: number | null;
}

export interface NotesSpec {
  label: string;
  placeholder?: string;
  required?: boolean;
  quickOptions?: string[];
}

export function TaskActionDialog({
  open,
  onOpenChange,
  action,
  title,
  scheduledFor,
  profiles,
  defaultProfileId,
  onConfirm,
  submitting,
  vitalSpec,
  notesSpec,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  action: TaskAction | null;
  title: string;
  scheduledFor: Date;
  profiles: CaregiverProfile[];
  defaultProfileId: string | null;
  onConfirm: (result: TaskActionResult) => void | Promise<void>;
  submitting?: boolean;
  vitalSpec?: VitalSpec | null;
  notesSpec?: NotesSpec | null;
}) {
  const { t } = useTranslation();
  const [profileId, setProfileId] = useState<string | null>(defaultProfileId);
  const [reason, setReason] = useState("");
  const [postponedDate, setPostponedDate] = useState("");
  const [postponedTime, setPostponedTime] = useState("");
  const [vitalValue, setVitalValue] = useState("");
  const [vitalContext, setVitalContext] = useState<VitalContext | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setProfileId(defaultProfileId);
    setReason("");
    setVitalValue(vitalSpec?.defaultValue != null ? String(vitalSpec.defaultValue) : "");
    setVitalContext(null);
    setNotes("");
    // Default postpone to scheduled + 1 hour, local
    const plusOneHour = new Date(scheduledFor.getTime() + 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    setPostponedDate(
      `${plusOneHour.getFullYear()}-${pad(plusOneHour.getMonth() + 1)}-${pad(plusOneHour.getDate())}`,
    );
    setPostponedTime(`${pad(plusOneHour.getHours())}:${pad(plusOneHour.getMinutes())}`);
  }, [open, defaultProfileId, scheduledFor, vitalSpec?.defaultValue]);

  if (!action) return null;
  const act: TaskAction = action;

  const reasonRequired = action === "skipped" || action === "postponed";
  const showProfile = action === "done";
  const showPostpone = action === "postponed";
  const showVital = action === "done" && !!vitalSpec;
  const showNotes = action === "done" && !!notesSpec;

  const heading =
    action === "done"
      ? t("taskAction.doneTitle")
      : action === "skipped"
        ? t("taskAction.skipTitle")
        : t("taskAction.postponeTitle");

  const description =
    action === "done"
      ? t("taskAction.doneBody", { title })
      : action === "skipped"
        ? t("taskAction.skipBody", { title })
        : t("taskAction.postponeBody", { title });

  const submitLabel =
    action === "done"
      ? t("taskAction.confirmDone")
      : action === "skipped"
        ? t("taskAction.confirmSkip")
        : t("taskAction.confirmPostpone");

  const trimmedReason = reason.trim();
  const trimmedNotes = notes.trim();
  const vitalNum = vitalValue.trim() === "" ? NaN : Number(vitalValue);
  const vitalValid = !showVital || (vitalValue.trim() !== "" && !Number.isNaN(vitalNum));
  const notesValid = !showNotes || !notesSpec?.required || trimmedNotes.length > 0;
  const canSubmit =
    !submitting &&
    (!reasonRequired || trimmedReason.length > 0) &&
    (!showPostpone || (!!postponedDate && !!postponedTime)) &&
    vitalValid &&
    notesValid;

  async function submit() {
    let postponedTo: Date | null = null;
    if (showPostpone) {
      const [y, m, d] = postponedDate.split("-").map(Number);
      const [hh, mm] = postponedTime.split(":").map(Number);
      postponedTo = new Date(y, (m ?? 1) - 1, d, hh ?? 0, mm ?? 0, 0, 0);
    }
    await onConfirm({
      action: act,
      caregiverProfileId: showProfile ? profileId : null,
      reason: trimmedReason ? trimmedReason : null,
      postponedTo,
      vitalValue: showVital && !Number.isNaN(vitalNum) ? vitalNum : null,
      vitalContext: showVital ? vitalContext : null,
      notes: showNotes && trimmedNotes ? trimmedNotes : null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {showVital && vitalSpec && (
            <div className="space-y-1.5">
              <Label>
                {vitalSpec.label} <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  step={vitalSpec.step ?? "0.1"}
                  className="rounded-xl"
                  placeholder={vitalSpec.placeholder}
                  value={vitalValue}
                  onChange={(e) => setVitalValue(e.target.value)}
                  autoFocus
                />
                <div className="h-9 px-3 rounded-xl border border-input bg-muted/40 flex items-center text-sm font-semibold text-muted-foreground">
                  {vitalSpec.unit || "—"}
                </div>
              </div>
              <div className="pt-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("vitals.contextLabel")}
                </Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {VITAL_CONTEXTS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setVitalContext(vitalContext === c ? null : c)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold border transition-colors",
                        vitalContext === c
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border bg-background hover:bg-muted",
                      )}
                    >
                      {t(`vitals.context.${c}` as const)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {showNotes && notesSpec && (
            <div className="space-y-1.5">
              <Label>
                {notesSpec.label}
                {notesSpec.required && <span className="text-destructive"> *</span>}
              </Label>
              {notesSpec.quickOptions && notesSpec.quickOptions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {notesSpec.quickOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() =>
                        setNotes((prev) => (prev ? `${prev} • ${opt}` : opt))
                      }
                      className="px-2.5 py-1 rounded-full border border-input text-xs font-semibold hover:bg-accent"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              <Textarea
                rows={2}
                className="rounded-xl"
                placeholder={notesSpec.placeholder}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          )}

          {showProfile && (
            <div className="space-y-1.5">
              <Label>{t("taskAction.completedBy")}</Label>
              <Select
                value={profileId ?? ""}
                onValueChange={(v) => setProfileId(v || null)}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={t("taskAction.selectProfile")} />
                </SelectTrigger>
                <SelectContent>
                  {profiles.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      {t("taskAction.noProfiles")}
                    </SelectItem>
                  ) : (
                    profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-block size-2.5 rounded-full"
                            style={{ backgroundColor: p.color ?? "#A78BFA" }}
                          />
                          {p.name}
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {showPostpone && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>{t("taskAction.newDate")}</Label>
                <Input
                  type="date"
                  className="rounded-xl"
                  value={postponedDate}
                  onChange={(e) => setPostponedDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("taskAction.newTime")}</Label>
                <Input
                  type="time"
                  className="rounded-xl"
                  value={postponedTime}
                  onChange={(e) => setPostponedTime(e.target.value)}
                />
              </div>
            </div>
          )}

          {reasonRequired && (
            <div className="space-y-1.5">
              <Label>
                {t("taskAction.reasonLabel")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              {(() => {
                const presetKeys =
                  action === "skipped"
                    ? (["notNeeded", "asleep", "refused", "alreadyDone", "atHospital", "missedWindow", "equipmentUnavailable"] as const)
                    : (["asleep", "eating", "outOfHouse", "waitingSupplies", "caregiverBusy", "doctorDelay"] as const);
                const group = action === "skipped" ? "skipReasons" : "postponeReasons";
                return (
                  <div className="flex flex-wrap gap-1.5">
                    {presetKeys.map((k) => {
                      const label = t(`taskAction.${group}.${k}` as const);
                      const active = reason === label;
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setReason(active ? "" : label)}
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-semibold border transition-colors",
                            active
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border bg-background hover:bg-muted",
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
              <Textarea
                rows={3}
                className="rounded-xl"
                placeholder={t("taskAction.reasonPlaceholder")}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}
        </div>


        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            className="rounded-full"
            onClick={submit}
            disabled={!canSubmit}
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

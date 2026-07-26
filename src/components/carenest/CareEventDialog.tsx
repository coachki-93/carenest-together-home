import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  Brain,
  Frown,
  MoreHorizontal,
  Utensils,
  Wind,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useCreateCareEvent,
  useEditCareEvent,
  orderedEventTypesFor,
  type CareEvent,
  type CareEventType,
} from "@/lib/data/care-events";
import { useCurrentActor, guardActingProfile } from "@/lib/data/current-actor";
import { useFamily } from "@/lib/data/family";
import {
  zonedWallClockToDate,
  dateInputIn,
} from "@/lib/time/family-tz";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyId: string;
  childId: string | null;
  careNeeds: unknown;
  event?: CareEvent | null;
}

const KIND_META: Record<
  CareEventType,
  { icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  seizure: { icon: Zap, tone: "bg-violet-50 text-violet-600" },
  desaturation: { icon: Wind, tone: "bg-sky-50 text-sky-600" },
  vomiting: { icon: Frown, tone: "bg-emerald-50 text-emerald-600" },
  feed_issue: { icon: Utensils, tone: "bg-amber-50 text-amber-700" },
  breathing_difficulty: { icon: Activity, tone: "bg-cyan-50 text-cyan-600" },
  behavioural: { icon: Brain, tone: "bg-pink-50 text-pink-600" },
  injury: { icon: AlertTriangle, tone: "bg-rose-50 text-rose-600" },
  other: { icon: MoreHorizontal, tone: "bg-slate-100 text-slate-700" },
};


function timeInputIn(date: Date, tz: string): string {
  // HH:mm in tz
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const hh = parts.find((p) => p.type === "hour")?.value ?? "00";
  const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hh === "24" ? "00" : hh}:${mm}`;
}

export function CareEventDialog({
  open,
  onOpenChange,
  familyId,
  childId,
  careNeeds,
  event,
}: Props) {
  const { t } = useTranslation();
  const { data: family } = useFamily(familyId);
  const tz = family?.timezone ?? "Europe/Stockholm";
  const actor = useCurrentActor(familyId);
  const create = useCreateCareEvent();
  const edit = useEditCareEvent();

  const orderedTypes = useMemo(() => orderedEventTypesFor(careNeeds), [careNeeds]);

  const [type, setType] = useState<CareEventType>("seizure");
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [severity, setSeverity] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<string>("");
  const [durationSec, setDurationSec] = useState<string>("");
  const [description, setDescription] = useState("");
  const [action, setAction] = useState("");

  useEffect(() => {
    if (!open) return;
    if (event) {
      const d = new Date(event.occurred_at);
      setType(event.type);
      setDateStr(dateInputIn(d, tz));
      setTimeStr(timeInputIn(d, tz));
      setSeverity(event.severity ?? null);
      const totalSec = event.duration_seconds ?? 0;
      setDurationMin(totalSec ? String(Math.floor(totalSec / 60)) : "");
      setDurationSec(totalSec ? String(totalSec % 60) : "");
      setDescription(event.description ?? "");
      setAction(event.action_taken ?? "");
    } else {
      const now = new Date();
      setType(orderedTypes[0] ?? "seizure");
      setDateStr(dateInputIn(now, tz));
      setTimeStr(timeInputIn(now, tz));
      setSeverity(null);
      setDurationMin("");
      setDurationSec("");
      setDescription("");
      setAction("");
    }
  }, [open, event, tz, orderedTypes]);

  const submitting = create.isPending || edit.isPending;

  async function handleSubmit() {
    if (!description.trim()) {
      toast.error(t("careEvents.errors.descriptionRequired"));
      return;
    }
    const occurred_at = zonedWallClockToDate(dateStr, timeStr, tz).toISOString();
    const min = Number.parseInt(durationMin || "0", 10) || 0;
    const sec = Number.parseInt(durationSec || "0", 10) || 0;
    const totalSec = min * 60 + sec;
    const duration_seconds = totalSec > 0 ? totalSec : null;

    if (event) {
      try {
        await edit.mutateAsync({
          id: event.id,
          occurred_at,
          type,
          description: description.trim(),
          action_taken: action.trim() ? action.trim() : null,
          severity,
          duration_seconds,
          caregiver_profile_id: event.caregiver_profile_id,
        });
        toast.success(t("careEvents.toast.updated"));
        onOpenChange(false);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error(msg || t("common.saveFailed"));
      }
      return;
    }

    const guard = guardActingProfile(actor);
    if (guard.blocked) {
      toast.error(t("careEvents.errors.pickProfile"));
      return;
    }
    if (!actor.userId) return;
    try {
      await create.mutateAsync({
        family_id: familyId,
        child_id: childId,
        caregiver_profile_id: guard.caregiverProfileId,
        created_by: actor.userId,
        occurred_at,
        type,
        description: description.trim(),
        action_taken: action.trim() ? action.trim() : null,
        severity: severity ?? null,
        duration_seconds,
      });
      toast.success(t("careEvents.toast.created"));
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || t("common.saveFailed"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>
            {event ? t("careEvents.dialog.editTitle") : t("careEvents.dialog.newTitle")}
          </DialogTitle>
          <DialogDescription>{t("careEvents.dialog.desc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("careEvents.dialog.type")}
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              {orderedTypes.map((k) => {
                const Icon = KIND_ICONS[k];
                const selected = type === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setType(k)}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2 min-h-[60px] text-[11px] font-semibold transition ${
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="text-center leading-tight break-words w-full">
                      {t(`careEvents.types.${k}`)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="ev-date" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("careEvents.dialog.date")}
              </Label>
              <Input
                id="ev-date"
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="rounded-xl w-full"
              />
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="ev-time" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("careEvents.dialog.time")}
              </Label>
              <Input
                id="ev-time"
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="rounded-xl w-full"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("careEvents.dialog.severity")}
            </Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[
                { n: null, key: "none" },
                { n: 1, key: "mild" },
                { n: 2, key: "moderate" },
                { n: 3, key: "severe" },
              ].map((s) => {
                const selected = severity === s.n;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSeverity(s.n)}
                    className={`rounded-xl border px-2 py-2 text-xs font-semibold transition ${
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {t(`careEvents.severity.${s.key}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("careEvents.dialog.duration")}
            </Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="flex items-center gap-2 min-w-0">
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="0"
                  value={durationMin}
                  onChange={(e) => setDurationMin(e.target.value)}
                  className="rounded-xl min-w-0 flex-1"
                />
                <span className="text-xs text-muted-foreground shrink-0">
                  {t("careEvents.dialog.min")}
                </span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <Input
                  type="number"
                  min={0}
                  max={59}
                  inputMode="numeric"
                  placeholder="0"
                  value={durationSec}
                  onChange={(e) => setDurationSec(e.target.value)}
                  className="rounded-xl min-w-0 flex-1"
                />
                <span className="text-xs text-muted-foreground shrink-0">
                  {t("careEvents.dialog.sec")}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ev-desc" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("careEvents.dialog.description")}
            </Label>
            <Textarea
              id="ev-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("careEvents.dialog.descriptionPh")}
              rows={3}
              className="rounded-xl resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ev-action" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("careEvents.dialog.action")}
            </Label>
            <Textarea
              id="ev-action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder={t("careEvents.dialog.actionPh")}
              rows={2}
              className="rounded-xl resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full">
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="rounded-full font-semibold">
            {submitting ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


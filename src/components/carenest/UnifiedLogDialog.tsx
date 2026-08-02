import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Thermometer,
  Heart,
  Wind,
  Activity,
  Droplet,
  Baby,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/notify";
import { CARE_EVENT_META } from "@/lib/carenest/care-event-meta";
import {
  useLogVital,
  DEFAULT_UNIT,
  VITAL_CONTEXTS,
  type VitalType,
  type VitalContext,
} from "@/lib/data/vitals";
import {
  useCreateCareEvent,
  orderedEventTypesFor,
  type CareEventType,
} from "@/lib/data/care-events";
import { useCurrentActor, guardActingProfile } from "@/lib/data/current-actor";
import { useFamily } from "@/lib/data/family";
import { zonedWallClockToDate, dateInputIn } from "@/lib/time/family-tz";

type VitalPresetKey =
  | "temperature"
  | "heart_rate"
  | "spo2"
  | "breathing"
  | "fluids"
  | "diaper";

interface VitalPreset {
  kind: "vital";
  key: VitalPresetKey;
  icon: LucideIcon;
  tone: string;
  vitalType: VitalType;
  needsValue: boolean;
}

interface EventPreset {
  kind: "event";
  key: CareEventType;
}

type Selection = VitalPreset | EventPreset;

const VITAL_PRESETS: VitalPreset[] = [
  { kind: "vital", key: "temperature", icon: Thermometer, tone: "bg-rose-50 text-rose-600", vitalType: "temperature", needsValue: true },
  { kind: "vital", key: "heart_rate", icon: Heart, tone: "bg-pink-50 text-pink-600", vitalType: "heart_rate", needsValue: true },
  { kind: "vital", key: "spo2", icon: Wind, tone: "bg-sky-50 text-sky-600", vitalType: "spo2", needsValue: true },
  { kind: "vital", key: "breathing", icon: Activity, tone: "bg-cyan-50 text-cyan-600", vitalType: "breathing", needsValue: true },
  { kind: "vital", key: "fluids", icon: Droplet, tone: "bg-blue-50 text-blue-600", vitalType: "fluids", needsValue: true },
  { kind: "vital", key: "diaper", icon: Baby, tone: "bg-amber-50 text-amber-700", vitalType: "other", needsValue: false },
];

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function timeInputIn(date: Date, tz: string): string {
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

/**
 * The single "+ Log" dialog used on both the Today page and the Events page.
 * Step 1 picks a vital preset or a care-event type (ordered by care needs);
 * step 2 reveals quick value entry for vitals, or the full incident fields
 * (severity / duration / description / action / backdated time) for events.
 */
export function UnifiedLogDialog({
  open,
  onOpenChange,
  familyId,
  childId,
  careNeeds,
  loggedBy,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  familyId: string | undefined | null;
  childId: string | undefined | null;
  careNeeds?: unknown;
  loggedBy?: string | undefined | null;
}) {
  const { t } = useTranslation();
  const logVital = useLogVital();
  const createCareEvent = useCreateCareEvent();
  const actor = useCurrentActor(familyId);
  const { data: family } = useFamily(familyId ?? undefined);
  const tz = family?.timezone ?? "Europe/Stockholm";
  const userId = loggedBy ?? actor.userId;

  const orderedTypes = useMemo(
    () => orderedEventTypesFor(careNeeds),
    [careNeeds],
  );

  const [selection, setSelection] = useState<Selection | null>(null);

  // Vital fields
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [context, setContext] = useState<VitalContext | null>(null);
  const [loggedAt, setLoggedAt] = useState<string>(() => toLocalInput(new Date()));

  // Event fields
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [severity, setSeverity] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState("");
  const [durationSec, setDurationSec] = useState("");
  const [description, setDescription] = useState("");
  const [action, setAction] = useState("");

  useEffect(() => {
    if (!open) return;
    const now = new Date();
    setSelection(null);
    setValue("");
    setNotes("");
    setContext(null);
    setLoggedAt(toLocalInput(now));
    setDateStr(dateInputIn(now, tz));
    setTimeStr(timeInputIn(now, tz));
    setSeverity(null);
    setDurationMin("");
    setDurationSec("");
    setDescription("");
    setAction("");
  }, [open, tz]);

  const unit = useMemo(
    () => (selection && selection.kind === "vital" ? DEFAULT_UNIT[selection.vitalType] : ""),
    [selection],
  );

  const submitting = logVital.isPending || createCareEvent.isPending;

  async function submitEvent(preset: EventPreset) {
    if (!familyId || !userId) return;
    if (!description.trim()) {
      toast.error(t("careEvents.errors.descriptionRequired"));
      return;
    }
    const guard = guardActingProfile(actor);
    if (guard.blocked) {
      toast.error(t("careEvents.errors.pickProfile"));
      return;
    }
    const occurred = zonedWallClockToDate(dateStr, timeStr, tz);
    if (Number.isNaN(occurred.getTime())) {
      toast.error(t("quickLog.invalidTime"));
      return;
    }
    const min = Number.parseInt(durationMin || "0", 10) || 0;
    const sec = Number.parseInt(durationSec || "0", 10) || 0;
    const totalSec = min * 60 + sec;

    try {
      await createCareEvent.mutateAsync({
        family_id: familyId,
        child_id: childId ?? null,
        caregiver_profile_id: guard.caregiverProfileId,
        created_by: userId,
        occurred_at: occurred.toISOString(),
        type: preset.key,
        description: description.trim(),
        action_taken: action.trim() ? action.trim() : null,
        severity,
        duration_seconds: totalSec > 0 ? totalSec : null,
      });
      toast.success(t("careEvents.toast.created"));
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || t("common.saveFailed"));
    }
  }

  async function submitVital(preset: VitalPreset) {
    if (!familyId || !userId || !childId) return;
    const when = loggedAt ? new Date(loggedAt) : new Date();
    if (Number.isNaN(when.getTime())) {
      toast.error(t("quickLog.invalidTime"));
      return;
    }
    const label = t(`quickLog.presets.${preset.key}`);
    let num = 0;
    if (preset.needsValue) {
      const n = Number(value);
      if (!value.trim() || Number.isNaN(n)) {
        toast.error(t("vitals.valueRequired"));
        return;
      }
      num = n;
    }
    const finalNotes = preset.needsValue
      ? notes.trim() || null
      : `${label}${notes.trim() ? ` — ${notes.trim()}` : ""}`;
    try {
      await logVital.mutateAsync({
        family_id: familyId,
        child_id: childId,
        logged_by: userId,
        vital_type: preset.vitalType,
        value: num,
        unit: unit || "",
        notes: finalNotes,
        logged_at: when.toISOString(),
        context: preset.needsValue ? context : null,
      });
      toast.success(t("quickLog.saved", { label }));
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || t("common.saveFailed"));
    }
  }

  async function submit() {
    if (!selection) return;
    if (selection.kind === "event") await submitEvent(selection);
    else await submitVital(selection);
  }

  const selectedLabel = selection
    ? selection.kind === "vital"
      ? t(`quickLog.presets.${selection.key}`)
      : t(`careEvents.types.${selection.key}`)
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>{t("quickLog.title")}</DialogTitle>
          <DialogDescription>{t("quickLog.subtitle")}</DialogDescription>
        </DialogHeader>

        {!selection ? (
          <div className="space-y-5">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("quickLog.groups.vitals")}
              </Label>
              <div className="grid grid-cols-2 gap-2.5 mt-2">
                {VITAL_PRESETS.map((p) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setSelection(p)}
                      className="flex items-center gap-3 p-3 rounded-2xl border border-border hover:border-primary/40 hover:bg-accent/40 transition-colors text-left"
                    >
                      <div className={cn("size-10 rounded-xl flex items-center justify-center shrink-0", p.tone)}>
                        <Icon className="size-5" />
                      </div>
                      <div className="font-semibold text-sm leading-tight">
                        {t(`quickLog.presets.${p.key}`)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("quickLog.groups.events")}
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                {orderedTypes.map((k) => {
                  const { icon: Icon, bg, text } = CARE_EVENT_META[k];
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setSelection({ kind: "event", key: k })}
                      className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border p-2 min-h-[84px] text-[11px] font-semibold transition hover:bg-muted"
                    >
                      <div className={cn("size-10 rounded-xl flex items-center justify-center shrink-0", bg, text)}>
                        <Icon className="size-5" />
                      </div>
                      <span className="text-center leading-tight break-words w-full">
                        {t(`careEvents.types.${k}`)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setSelection(null)}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              ← {t("quickLog.changeType")}
            </button>
            <div className="flex items-center gap-3">
              {selection.kind === "vital" ? (
                <div className={cn("size-10 rounded-xl flex items-center justify-center", selection.tone)}>
                  <selection.icon className="size-5" />
                </div>
              ) : (
                (() => {
                  const { icon: Icon, bg, text } = CARE_EVENT_META[selection.key];
                  return (
                    <div className={cn("size-10 rounded-xl flex items-center justify-center", bg, text)}>
                      <Icon className="size-5" />
                    </div>
                  );
                })()
              )}
              <div className="font-bold">{selectedLabel}</div>
            </div>

            {selection.kind === "vital" ? (
              <>
                {selection.needsValue && (
                  <div className="grid grid-cols-[1fr_auto] gap-3">
                    <div>
                      <Label
                        htmlFor="quick-value"
                        className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                      >
                        {t("vitals.value")}
                      </Label>
                      <Input
                        id="quick-value"
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="rounded-xl h-11 mt-1.5"
                        autoFocus
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="h-11 px-3 rounded-xl border border-input bg-muted/40 flex items-center text-sm font-semibold text-muted-foreground">
                        {unit || "—"}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label
                    htmlFor="quick-time"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    {t("quickLog.when")}
                  </Label>
                  <Input
                    id="quick-time"
                    type="datetime-local"
                    value={loggedAt}
                    onChange={(e) => setLoggedAt(e.target.value)}
                    className="rounded-xl h-11 mt-1.5"
                  />
                  <button
                    type="button"
                    onClick={() => setLoggedAt(toLocalInput(new Date()))}
                    className="mt-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    {t("quickLog.now")}
                  </button>
                </div>

                {selection.needsValue && (
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {t("vitals.contextLabel")}
                    </Label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {VITAL_CONTEXTS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setContext(context === c ? null : c)}
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-semibold border transition-colors",
                            context === c
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border bg-background hover:bg-muted",
                          )}
                        >
                          {t(`vitals.context.${c}` as const)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label
                    htmlFor="quick-notes"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    {t("vitals.notes")}
                  </Label>
                  <Textarea
                    id="quick-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="rounded-xl mt-1.5"
                    rows={3}
                    placeholder={t("quickLog.notesPlaceholder")}
                  />
                </div>
              </>
            ) : (
              <>
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
                    ].map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setSeverity(s.n)}
                        className={`rounded-xl border px-2 py-2 text-xs font-semibold transition ${
                          severity === s.n
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        {t(`careEvents.severity.${s.key}`)}
                      </button>
                    ))}
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
              </>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            className="rounded-full font-bold"
            onClick={submit}
            disabled={!selection || submitting}
          >
            {submitting ? t("vitals.saving") : t("quickLog.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

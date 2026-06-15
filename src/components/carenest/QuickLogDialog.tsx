import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Thermometer,
  Heart,
  Wind,
  Activity,
  Droplet,
  Baby,
  Zap,
  StickyNote,
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
import { toast } from "sonner";
import { useLogVital, DEFAULT_UNIT, type VitalType } from "@/lib/data/vitals";

type PresetKey =
  | "temperature"
  | "heart_rate"
  | "spo2"
  | "breathing"
  | "fluids"
  | "diaper"
  | "seizure"
  | "note";

type Preset = {
  key: PresetKey;
  icon: LucideIcon;
  tone: string;
  vitalType: VitalType;
  needsValue: boolean;
  defaultNote?: string;
};

const PRESETS: Preset[] = [
  { key: "temperature", icon: Thermometer, tone: "bg-rose-50 text-rose-600", vitalType: "temperature", needsValue: true },
  { key: "heart_rate", icon: Heart, tone: "bg-pink-50 text-pink-600", vitalType: "heart_rate", needsValue: true },
  { key: "spo2", icon: Wind, tone: "bg-sky-50 text-sky-600", vitalType: "spo2", needsValue: true },
  { key: "fluids", icon: Droplet, tone: "bg-blue-50 text-blue-600", vitalType: "fluids", needsValue: true },
  { key: "diaper", icon: Baby, tone: "bg-amber-50 text-amber-700", vitalType: "other", needsValue: false },
  { key: "seizure", icon: Zap, tone: "bg-violet-50 text-violet-600", vitalType: "seizure", needsValue: true },
  { key: "note", icon: StickyNote, tone: "bg-slate-100 text-slate-700", vitalType: "other", needsValue: false },
];

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function QuickLogDialog({
  open,
  onOpenChange,
  familyId,
  childId,
  loggedBy,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  familyId: string | undefined | null;
  childId: string | undefined | null;
  loggedBy: string | undefined | null;
}) {
  const { t } = useTranslation();
  const logVital = useLogVital();
  const [preset, setPreset] = useState<Preset | null>(null);
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [loggedAt, setLoggedAt] = useState<string>(() => toLocalInput(new Date()));

  useEffect(() => {
    if (open) {
      setPreset(null);
      setValue("");
      setNotes("");
      setLoggedAt(toLocalInput(new Date()));
    }
  }, [open]);

  const unit = useMemo(() => (preset ? DEFAULT_UNIT[preset.vitalType] : ""), [preset]);

  async function submit() {
    if (!preset || !familyId || !childId || !loggedBy) return;
    let num = 0;
    if (preset.needsValue) {
      const n = Number(value);
      if (!value.trim() || Number.isNaN(n)) {
        toast.error(t("vitals.valueRequired"));
        return;
      }
      num = n;
    }
    const when = loggedAt ? new Date(loggedAt) : new Date();
    if (Number.isNaN(when.getTime())) {
      toast.error(t("quickLog.invalidTime"));
      return;
    }
    const label = t(`quickLog.presets.${preset.key}`);
    const finalNotes = preset.needsValue
      ? notes.trim() || null
      : `${label}${notes.trim() ? ` — ${notes.trim()}` : ""}`;
    await logVital.mutateAsync({
      family_id: familyId,
      child_id: childId,
      logged_by: loggedBy,
      vital_type: preset.vitalType,
      value: num,
      unit: unit || "",
      notes: finalNotes,
      logged_at: when.toISOString(),
    });
    toast.success(t("quickLog.saved", { label }));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-md">
        <DialogHeader>
          <DialogTitle>{t("quickLog.title")}</DialogTitle>
          <DialogDescription>{t("quickLog.subtitle")}</DialogDescription>
        </DialogHeader>

        {!preset ? (
          <div className="grid grid-cols-2 gap-2.5">
            {PRESETS.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPreset(p)}
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
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setPreset(null)}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              ← {t("quickLog.changeType")}
            </button>
            <div className="flex items-center gap-3">
              <div className={cn("size-10 rounded-xl flex items-center justify-center", preset.tone)}>
                <preset.icon className="size-5" />
              </div>
              <div className="font-bold">{t(`quickLog.presets.${preset.key}`)}</div>
            </div>

            {preset.needsValue && (
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
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            className="rounded-full font-bold"
            onClick={submit}
            disabled={!preset || logVital.isPending}
          >
            {logVital.isPending ? t("vitals.saving") : t("quickLog.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CHECKLIST_MAX_LABEL,
  CHECKLIST_MAX_STEPS,
  type ChecklistStep,
} from "@/lib/schedule/checklist";

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function ChecklistEditor({
  steps,
  onChange,
}: {
  steps: ChecklistStep[];
  onChange: (s: ChecklistStep[]) => void;
}) {
  const { t } = useTranslation();
  const full = steps.length >= CHECKLIST_MAX_STEPS;

  function move(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="rounded-2xl border border-border/60 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <Label className="font-semibold">{t("scheduleEvents.checklist.title")}</Label>
        <span className="text-xs text-muted-foreground">
          {t("scheduleEvents.checklist.count", { n: steps.length, max: CHECKLIST_MAX_STEPS })}
        </span>
      </div>
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-1.5">
          <span className="w-5 text-xs text-muted-foreground text-right">{i + 1}.</span>
          <Input
            value={s.label}
            maxLength={CHECKLIST_MAX_LABEL}
            onChange={(e) =>
              onChange(steps.map((x) => (x.id === s.id ? { ...x, label: e.target.value } : x)))
            }
            placeholder={t("scheduleEvents.checklist.placeholder", { n: i + 1 })}
            className="rounded-xl h-9"
          />
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0"
            disabled={i === 0} onClick={() => move(i, -1)}
            aria-label={t("scheduleEvents.checklist.moveUp")}>
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0"
            disabled={i === steps.length - 1} onClick={() => move(i, 1)}
            aria-label={t("scheduleEvents.checklist.moveDown")}>
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0"
            onClick={() => onChange(steps.filter((x) => x.id !== s.id))}
            aria-label={t("scheduleEvents.checklist.remove")}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="rounded-full"
        disabled={full}
        onClick={() => onChange([...steps, { id: newId(), label: "" }])}>
        <Plus className="h-4 w-4 mr-1" />
        {t("scheduleEvents.checklist.add")}
      </Button>
    </div>
  );
}

/** Read-only list (used for "this occurrence only" hints and completed snapshots). */
export function ChecklistReadOnly({
  steps,
}: {
  steps: { id: string; label: string; done?: boolean }[];
}) {
  return (
    <ul className="space-y-1">
      {steps.map((s) => (
        <li key={s.id} className="flex items-start gap-2 text-sm">
          {s.done === undefined ? (
            <span className="text-muted-foreground">•</span>
          ) : s.done ? (
            <span className="text-primary font-bold" aria-hidden>✓</span>
          ) : (
            <span className="text-destructive font-bold" aria-hidden>✗</span>
          )}
          <span className={s.done === false ? "text-muted-foreground" : ""}>{s.label}</span>
        </li>
      ))}
    </ul>
  );
}

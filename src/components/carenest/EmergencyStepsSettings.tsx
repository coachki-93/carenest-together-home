import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Plus,
  Trash2,
  AlertTriangle,
  Eye,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/notify";
import {
  useEmergencySteps,
  useSaveEmergencyStep,
  useDeleteEmergencyStep,
  useReorderEmergencySteps,
  type EmergencyStep,
  type EmergencyStepSeverity,
} from "@/lib/data/emergency-steps";

const SEVERITIES: EmergencyStepSeverity[] = ["critical", "monitor", "info"];

function severityStyles(sev: EmergencyStepSeverity) {
  switch (sev) {
    case "critical":
      return "bg-red-600 text-white";
    case "monitor":
      return "bg-amber-500 text-white";
    default:
      return "bg-slate-500 text-white";
  }
}

function severityIcon(sev: EmergencyStepSeverity) {
  if (sev === "critical") return <AlertTriangle className="size-3.5" />;
  if (sev === "monitor") return <Eye className="size-3.5" />;
  return <Info className="size-3.5" />;
}

export function EmergencyStepsSettings({
  familyId,
  canEdit,
}: {
  familyId: string | null | undefined;
  canEdit: boolean;
}) {
  const { t } = useTranslation();
  const { data: steps } = useEmergencySteps(familyId);
  const save = useSaveEmergencyStep();
  const del = useDeleteEmergencyStep(familyId);
  const reorder = useReorderEmergencySteps(familyId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    title: string;
    description: string;
    severity: EmergencyStepSeverity;
  }>({ title: "", description: "", severity: "info" });

  const list = steps ?? [];

  function startAdd() {
    setEditingId("new");
    setDraft({ title: "", description: "", severity: "critical" });
  }

  function startEdit(s: EmergencyStep) {
    setEditingId(s.id);
    setDraft({
      title: s.title,
      description: s.description ?? "",
      severity: s.severity,
    });
  }

  async function submitDraft() {
    if (!familyId) return;
    if (!draft.title.trim()) {
      toast.error(t("emergencySteps.titleRequired"));
      return;
    }
    try {
      await save.mutateAsync({
        id: editingId && editingId !== "new" ? editingId : undefined,
        family_id: familyId,
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        severity: draft.severity,
        position:
          editingId === "new"
            ? (list[list.length - 1]?.position ?? -1) + 1
            : undefined,
      });
      setEditingId(null);
      toast.success(t("emergencySteps.saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function move(idx: number, dir: -1 | 1) {
    const next = [...list];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    await reorder.mutateAsync(
      next.map((s, i) => ({ id: s.id, position: i })),
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{t("emergencySteps.title")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("emergencySteps.help")}
          </p>
        </div>
        {canEdit && editingId === null && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full shrink-0"
            onClick={startAdd}
          >
            <Plus className="size-4" /> {t("emergencySteps.add")}
          </Button>
        )}
      </div>

      <ol className="space-y-2">
        {list.map((s, i) => (
          <li
            key={s.id}
            className="rounded-xl border border-border/60 p-3 flex items-start gap-3 bg-white"
          >
            <div
              className={`size-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${severityStyles(s.severity)}`}
              aria-label={t(`emergencySteps.sev.${s.severity}`)}
            >
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{s.title}</div>
              {s.description && (
                <div className="text-sm text-muted-foreground whitespace-pre-wrap mt-0.5">
                  {s.description}
                </div>
              )}
              <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {severityIcon(s.severity)}
                {t(`emergencySteps.sev.${s.severity}`)}
              </div>
            </div>
            {canEdit && (
              <div className="flex flex-col gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full size-8"
                  disabled={i === 0 || reorder.isPending}
                  onClick={() => move(i, -1)}
                  aria-label={t("emergencySteps.moveUp")}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full size-8"
                  disabled={i === list.length - 1 || reorder.isPending}
                  onClick={() => move(i, 1)}
                  aria-label={t("emergencySteps.moveDown")}
                >
                  <ArrowDown className="size-4" />
                </Button>
              </div>
            )}
            {canEdit && (
              <div className="flex flex-col gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  onClick={() => startEdit(s)}
                >
                  {t("common.edit")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full size-8 text-destructive"
                  onClick={() => del.mutate(s.id)}
                  aria-label={t("common.delete")}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            )}
          </li>
        ))}
        {list.length === 0 && (
          <li className="text-sm text-muted-foreground italic px-1">
            {t("emergencySteps.empty")}
          </li>
        )}
      </ol>

      {canEdit && editingId !== null && (
        <div className="rounded-xl border-2 border-primary/40 p-3 space-y-3 bg-primary-soft/30">
          <Input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder={t("emergencySteps.titlePh")}
            className="h-11 rounded-xl font-semibold"
          />
          <Textarea
            value={draft.description}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
            placeholder={t("emergencySteps.descPh")}
            rows={2}
            className="rounded-xl"
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              {t("emergencySteps.severity")}
            </span>
            {SEVERITIES.map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setDraft({ ...draft, severity: sev })}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition ${
                  draft.severity === sev
                    ? severityStyles(sev) + " border-transparent"
                    : "bg-white border-border text-muted-foreground"
                }`}
              >
                {t(`emergencySteps.sev.${sev}`)}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              className="rounded-full"
              onClick={() => setEditingId(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="rounded-full"
              onClick={submitDraft}
              disabled={save.isPending}
            >
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

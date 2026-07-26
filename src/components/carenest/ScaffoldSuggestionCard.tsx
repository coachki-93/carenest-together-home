import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Sparkles, X, Clock, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/carenest/RichTextEditor";
import { toast } from "@/lib/notify";

import { supabase } from "@/integrations/supabase/client";
import { parseCareNeeds } from "@/lib/care-needs/parse";
import {
  SCAFFOLD_DEFINITIONS,
  scaffoldFor,
  taskTemplateFor,
  type ScaffoldDefinition,
  type ScaffoldOffer,
} from "@/lib/care-needs/scaffolds";
import {
  mergeScaffoldStatus,
  readScaffoldsMap,
  shouldShowScaffold,
  type ScaffoldStatus,
} from "@/lib/care-needs/scaffold-status";
import { useCreateAppointment } from "@/lib/data/appointments";

interface Props {
  familyId: string;
  childId: string;
  userId: string;
  childName: string;
  careNeedsRaw: unknown;
}

const MAX_VISIBLE = 2;

export function ScaffoldSuggestionCard({
  familyId,
  childId,
  userId,
  childName,
  careNeedsRaw,
}: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const care = useMemo(() => parseCareNeeds(careNeedsRaw), [careNeedsRaw]);
  const statusMap = useMemo(() => readScaffoldsMap(careNeedsRaw), [careNeedsRaw]);

  const eligible = useMemo(() => {
    const now = new Date();
    return SCAFFOLD_DEFINITIONS.filter(
      (def) =>
        care.capabilities.includes(def.capability) &&
        shouldShowScaffold(statusMap, def.capability, now),
    );
  }, [care.capabilities, statusMap]);

  const visible = eligible.slice(0, MAX_VISIBLE);
  const overflow = eligible.length - visible.length;

  const [running, setRunning] = useState<ScaffoldDefinition | null>(null);

  const setStatus = useMutation({
    mutationFn: async ({
      capability,
      status,
    }: {
      capability: string;
      status: ScaffoldStatus;
    }) => {
      const merged = mergeScaffoldStatus(careNeedsRaw, capability, status);
      const { error } = await supabase
        .from("children")
        .update({ care_needs: merged as never })
        .eq("id", childId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard-child", familyId] });
      qc.invalidateQueries({ queryKey: ["children", familyId] });
    },
    onError: (e: Error) => toast.error(e.message),
    meta: { suppressGlobalError: true },
  });

  if (visible.length === 0) return null;

  return (
    <>
      <div className="space-y-3">
        {visible.map((def) => (
          <article key={def.capability} className="card-soft p-5">
            <header className="flex items-start gap-3 mb-3">
              <div className="size-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
                <Sparkles className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold leading-tight">
                  {t(`scaffolds.capabilities.${def.i18nKey}.cardTitle`, { name: childName })}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t(`scaffolds.capabilities.${def.i18nKey}.cardBody`)}
                </p>
                <ul className="mt-2 text-xs text-muted-foreground list-disc pl-5 space-y-0.5">
                  {def.offers.map((o) => (
                    <li key={o.key}>
                      {t(`scaffolds.capabilities.${def.i18nKey}.offers.${o.key}.label`)}
                    </li>
                  ))}
                </ul>
              </div>
            </header>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setRunning(def)} className="rounded-full">
                {t("scaffolds.card.setUp")} <ChevronRight className="size-4 ml-1" />
              </Button>
              <Button
                variant="ghost"
                className="rounded-full"
                disabled={setStatus.isPending}
                onClick={() =>
                  setStatus.mutate({ capability: def.capability, status: "snoozed" })
                }
              >
                <Clock className="size-4 mr-1" /> {t("scaffolds.card.notNow")}
              </Button>
              <Button
                variant="ghost"
                className="rounded-full text-muted-foreground"
                disabled={setStatus.isPending}
                onClick={() =>
                  setStatus.mutate({ capability: def.capability, status: "dismissed" })
                }
              >
                <X className="size-4 mr-1" /> {t("scaffolds.card.dismiss")}
              </Button>
            </div>
          </article>
        ))}
        {overflow > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {t("scaffolds.card.overflow", { count: overflow })}
          </p>
        )}
      </div>

      {running && (
        <ScaffoldRunner
          def={running}
          childName={childName}
          familyId={familyId}
          childId={childId}
          userId={userId}
          onDone={() => {
            setRunning(null);
          }}
          onOfferSaved={(capability) => {
            setStatus.mutate({ capability, status: "done" });
          }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Runner — walks a capability's offers one dialog at a time.
// Marks scaffold "done" on the first successful save; skips leave state alone.
// ---------------------------------------------------------------------------

function ScaffoldRunner({
  def,
  childName,
  familyId,
  childId,
  userId,
  onDone,
  onOfferSaved,
}: {
  def: ScaffoldDefinition;
  childName: string;
  familyId: string;
  childId: string;
  userId: string;
  onDone: () => void;
  onOfferSaved: (capability: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [savedOnce, setSavedOnce] = useState(false);
  const offer = def.offers[index];

  function next() {
    if (index + 1 >= def.offers.length) {
      onDone();
    } else {
      setIndex(index + 1);
    }
  }

  function handleSaved() {
    if (!savedOnce) {
      onOfferSaved(def.capability);
      setSavedOnce(true);
    }
    next();
  }

  if (!offer) {
    onDone();
    return null;
  }

  if (offer.engine === "task") {
    return (
      <TaskScaffoldDialog
        offer={offer}
        def={def}
        stepIndex={index}
        stepTotal={def.offers.length}
        childName={childName}
        familyId={familyId}
        childId={childId}
        userId={userId}
        onSkip={next}
        onSaved={handleSaved}
        onCancel={onDone}
      />
    );
  }

  return (
    <InstructionScaffoldDialog
      offer={offer}
      def={def}
      stepIndex={index}
      stepTotal={def.offers.length}
      childName={childName}
      familyId={familyId}
      userId={userId}
      onSkip={next}
      onSaved={handleSaved}
      onCancel={onDone}
    />
  );
}

// ---------------------------------------------------------------------------
// Task scaffold dialog — pre-filled feed task.
// Uses the NORMAL useCreateAppointment write path (real new row).
// ---------------------------------------------------------------------------

function TaskScaffoldDialog({
  offer,
  def,
  stepIndex,
  stepTotal,
  childName,
  familyId,
  childId,
  userId,
  onSkip,
  onSaved,
  onCancel,
}: {
  offer: ScaffoldOffer;
  def: ScaffoldDefinition;
  stepIndex: number;
  stepTotal: number;
  childName: string;
  familyId: string;
  childId: string;
  userId: string;
  onSkip: () => void;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const tmpl = taskTemplateFor(offer.templateKey);
  const i18nBase = `scaffolds.capabilities.${def.i18nKey}.offers.${offer.key}`;
  const create = useCreateAppointment();

  const [title, setTitle] = useState<string>(
    t(`${i18nBase}.taskTitle`, { defaultValue: tmpl.titleFallback }),
  );
  const [timesText, setTimesText] = useState("");
  const [amountMl, setAmountMl] = useState("");
  const [notes, setNotes] = useState(t(`${i18nBase}.taskNotes`, { defaultValue: "" }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error(t("scaffolds.task.titleRequired"));
      return;
    }
    const cleanedTimes = Array.from(
      new Set(
        timesText
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter((s) => /^\d{1,2}:\d{2}$/.test(s)),
      ),
    ).sort();

    // Anchor date = today, first time (or 09:00 if none). The real schedule
    // engine treats recurrence_times_of_day as the source of truth once
    // recurrence_freq is set; this anchor only satisfies NOT NULL columns.
    const anchorTime = cleanedTimes[0] ?? "09:00";
    const [hh, mm] = anchorTime.split(":").map((n) => parseInt(n, 10));
    const anchor = new Date();
    anchor.setHours(hh, mm, 0, 0);

    try {
      await create.mutateAsync({
        family_id: familyId,
        child_id: childId,
        created_by: userId,
        title: trimmed,
        notes: notes.trim() || null,
        location: null,
        kind: tmpl.kind,
        starts_at: anchor.toISOString(),
        ends_at: null,
        all_day: false,
        recurrence_freq: "daily",
        recurrence_interval: 1,
        recurrence_byweekday: null,
        recurrence_times_of_day: cleanedTimes.length > 0 ? cleanedTimes : null,
        reminder_minutes: null,
        amount_ml:
          tmpl.hasAmountMl && amountMl.trim() !== "" && !Number.isNaN(Number(amountMl))
            ? Number(amountMl)
            : null,
        late_after_minutes: 0,
        missed_after_minutes: 15,
        allow_ongoing: false,
        timer_minutes: null,
      } as never);
      toast.success(t("scaffolds.task.saved"));
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("scaffolds.task.saveError"));
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <StepHeader stepIndex={stepIndex} stepTotal={stepTotal} />
          <DialogTitle>
            {t(`${i18nBase}.title`, { name: childName })}
          </DialogTitle>
          <DialogDescription>{t(`${i18nBase}.desc`)}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scf-title">{t("scaffolds.task.titleLabel")}</Label>
            <Input
              id="scf-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scf-times">{t("scaffolds.task.timesLabel")}</Label>
            <Input
              id="scf-times"
              value={timesText}
              onChange={(e) => setTimesText(e.target.value)}
              placeholder={t("scaffolds.task.timesPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">
              {t("scaffolds.task.timesHint")}
            </p>
          </div>
          {tmpl.hasAmountMl && (
            <div className="space-y-2">
              <Label htmlFor="scf-amount">{t("scaffolds.task.amountLabel")}</Label>
              <Input
                id="scf-amount"
                inputMode="decimal"
                value={amountMl}
                onChange={(e) => setAmountMl(e.target.value)}
                placeholder={t("scaffolds.task.amountPlaceholder")}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="scf-notes">{t("scaffolds.task.notesLabel")}</Label>
            <textarea
              id="scf-notes"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">{t("scaffolds.starterNote")}</p>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={onSkip}>
              {t("scaffolds.skipStep")}
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Instruction scaffold dialog — pre-filled care instruction.
// Uses the NORMAL care_instructions insert.
// ---------------------------------------------------------------------------

function InstructionScaffoldDialog({
  offer,
  def,
  stepIndex,
  stepTotal,
  childName,
  familyId,
  userId,
  onSkip,
  onSaved,
  onCancel,
}: {
  offer: ScaffoldOffer;
  def: ScaffoldDefinition;
  stepIndex: number;
  stepTotal: number;
  childName: string;
  familyId: string;
  userId: string;
  onSkip: () => void;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const i18nBase = `scaffolds.capabilities.${def.i18nKey}.offers.${offer.key}`;

  const [title, setTitle] = useState<string>(t(`${i18nBase}.instructionTitle`));
  const [body, setBody] = useState<string>(t(`${i18nBase}.instructionBody`));
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error(t("scaffolds.instruction.titleRequired"));
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("care_instructions").insert({
        family_id: familyId,
        created_by: userId,
        title: trimmed,
        body,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["care-instructions", familyId] });
      toast.success(t("scaffolds.instruction.saved"));
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("scaffolds.instruction.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <StepHeader stepIndex={stepIndex} stepTotal={stepTotal} />
          <DialogTitle>
            {t(`${i18nBase}.title`, { name: childName })}
          </DialogTitle>
          <DialogDescription>{t(`${i18nBase}.desc`)}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scf-ins-title">{t("scaffolds.instruction.titleLabel")}</Label>
            <Input
              id="scf-ins-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{t("scaffolds.instruction.bodyLabel")}</Label>
            <RichTextEditor value={body} onChange={setBody} />
            <p className="text-xs text-muted-foreground">{t("scaffolds.starterNote")}</p>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={onSkip}>
              {t("scaffolds.skipStep")}
            </Button>
            <Button type="submit" disabled={saving}>
              <CheckCircle2 className="size-4 mr-1" />
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StepHeader({ stepIndex, stepTotal }: { stepIndex: number; stepTotal: number }) {
  const { t } = useTranslation();
  if (stepTotal <= 1) return null;
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
      {t("scaffolds.stepOf", { current: stepIndex + 1, total: stepTotal })}
    </p>
  );
}

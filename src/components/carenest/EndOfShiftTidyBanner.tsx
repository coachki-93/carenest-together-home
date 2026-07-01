import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/lib/notify";
import {
  useTidySettings,
  useTidyItems,
  useShiftTidySubmission,
  useSubmitTidy,
  type TidyStatus,
} from "@/lib/data/tidy";
import { useShifts, expandShifts, type ShiftOccurrence } from "@/lib/data/shifts";

interface Props {
  familyId: string | undefined | null;
  userId: string | undefined | null;
}

interface AnswerState {
  status: TidyStatus | null;
  note: string;
}

function findCurrentShift(
  shifts: ReturnType<typeof useShifts>["data"],
  userId: string,
  now: Date,
): ShiftOccurrence | null {
  if (!shifts?.length) return null;
  const start = new Date(now.getTime() - 12 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  const occurrences = expandShifts(shifts, start, end);
  const active = occurrences
    .filter((o) => o.caregiverUserId === userId && o.start <= now && o.end > now)
    .sort((a, b) => a.end.getTime() - b.end.getTime());
  return active[0] ?? null;
}

export function EndOfShiftTidyBanner({ familyId, userId }: Props) {
  const { t } = useTranslation();
  const { data: settings } = useTidySettings(familyId);
  const { data: items = [] } = useTidyItems(familyId);
  const { data: shifts } = useShifts(familyId);
  const submit = useSubmitTidy();

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const currentShift = useMemo(
    () => (userId ? findCurrentShift(shifts, userId, now) : null),
    [shifts, userId, now],
  );

  const occurrenceIso = currentShift?.start.toISOString() ?? null;
  const { data: existingSubmission } = useShiftTidySubmission(
    familyId,
    currentShift?.masterId ?? null,
    occurrenceIso,
  );

  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});

  if (!familyId || !userId) return null;
  if (!settings?.enabled) return null;
  if (!currentShift) return null;
  if (existingSubmission) return null;

  const leadMs = (settings.lead_minutes ?? 30) * 60 * 1000;
  const msLeft = currentShift.end.getTime() - now.getTime();
  if (msLeft > leadMs) return null;
  if (msLeft <= 0) return null;

  const activeItems = items.filter((i) => i.active);
  if (activeItems.length === 0) return null;

  const minutesLeft = Math.max(1, Math.ceil(msLeft / 60_000));

  function startTidy() {
    const initial: Record<string, AnswerState> = {};
    for (const it of activeItems) {
      initial[it.id] = { status: null, note: "" };
    }
    setAnswers(initial);
    setOpen(true);
  }

  async function handleSubmit() {
    const unanswered = activeItems.filter((it) => !answers[it.id]?.status);
    if (unanswered.length > 0) {
      toast.error(t("tidy.answerAll"));
      return;
    }
    try {
      await submit.mutateAsync({
        family_id: familyId!,
        performed_by: userId!,
        shift_master_id: currentShift!.masterId,
        shift_occurrence_start: occurrenceIso,
        answers: activeItems.map((it) => {
          const a = answers[it.id];
          return {
            item_id: it.id,
            item_label_snapshot: it.label,
            status: a.status!,
            note: a.status === "skipped" && a.note.trim() ? a.note.trim() : null,
          };
        }),
      });
      toast.success(t("tidy.submitted"));
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <>
      <div className="rounded-2xl border-2 border-primary/40 bg-primary-soft px-4 py-3 flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center flex-none">
          <Sparkles className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-primary">{t("tidy.bannerTitle")}</div>
          <div className="text-sm text-primary/80">
            {t("tidy.bannerSubtitle", { n: minutesLeft })}
          </div>
        </div>
        <Button
          size="sm"
          onClick={startTidy}
          className="rounded-full"
        >
          {t("tidy.start")}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("tidy.dialogTitle")}</DialogTitle>
            <DialogDescription>{t("tidy.dialogSubtitle")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {activeItems.map((it) => {
              const a = answers[it.id] ?? { status: null, note: "" };
              return (
                <div key={it.id} className="rounded-xl border p-3 space-y-2">
                  <div className="font-medium">{it.label}</div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={a.status === "done" ? "default" : "outline"}
                      className="flex-1 rounded-full"
                      onClick={() =>
                        setAnswers((prev) => ({
                          ...prev,
                          [it.id]: { status: "done", note: "" },
                        }))
                      }
                    >
                      {t("tidy.done")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={a.status === "skipped" ? "default" : "outline"}
                      className="flex-1 rounded-full"
                      onClick={() =>
                        setAnswers((prev) => ({
                          ...prev,
                          [it.id]: { status: "skipped", note: prev[it.id]?.note ?? "" },
                        }))
                      }
                    >
                      {t("tidy.skip")}
                    </Button>
                  </div>
                  {a.status === "skipped" && (
                    <Textarea
                      placeholder={t("tidy.notePlaceholder")}
                      value={a.note}
                      onChange={(e) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [it.id]: { status: "skipped", note: e.target.value },
                        }))
                      }
                      rows={2}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-full"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submit.isPending}
              className="rounded-full"
            >
              {submit.isPending && <Loader2 className="size-4 animate-spin" />}
              {t("tidy.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ShieldAlert, Loader2, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  useCarePlaceItems,
  useCarePlaceTimes,
  useTodayCarePlaceChecks,
  useSubmitCarePlaceCheck,
  pendingSlots,
  slotSecondsRemaining,
  type CarePlaceItem,
  type CarePlaceTime,
} from "@/lib/data/care-place-checks";

interface Props {
  familyId: string | undefined | null;
  userId: string | undefined | null;
}

interface AnswerState {
  yesno?: boolean;
  count?: string;
}

function formatMMSS(seconds: number) {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function CarePlaceCheckBanner({ familyId, userId }: Props) {
  const { t } = useTranslation();
  const { data: items = [] } = useCarePlaceItems(familyId);
  const { data: times = [] } = useCarePlaceTimes(familyId);
  const { data: todaysChecks = [] } = useTodayCarePlaceChecks(familyId);
  const submit = useSubmitCarePlaceCheck();

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const pending = useMemo(
    () => pendingSlots(times, todaysChecks, now),
    [times, todaysChecks, now],
  );
  const currentSlot: CarePlaceTime | undefined = pending[pending.length - 1];
  const secondsLeft = currentSlot ? slotSecondsRemaining(currentSlot, now) : 0;


  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [notes, setNotes] = useState("");

  if (!familyId || !userId || !currentSlot) return null;

  const activeItems = items.filter((i) => i.active);

  function startCheck() {
    const initial: Record<string, AnswerState> = {};
    for (const it of activeItems) {
      initial[it.id] =
        it.item_type === "yesno" ? { yesno: false } : { count: "" };
    }
    setAnswers(initial);
    setNotes("");
    setOpen(true);
  }

  async function handleSubmit() {
    if (!currentSlot) return;
    try {
      await submit.mutateAsync({
        family_id: familyId!,
        performed_by: userId!,
        scheduled_time: currentSlot.time_of_day,
        scheduled_date: new Date().toISOString().slice(0, 10),
        notes: notes.trim() || null,
        answers: activeItems.map((it) => {
          const a = answers[it.id] ?? {};
          return {
            item_id: it.id,
            item_label_snapshot: it.label,
            item_type_snapshot: it.item_type,
            yesno_value: it.item_type === "yesno" ? !!a.yesno : null,
            count_value:
              it.item_type === "count" && a.count !== ""
                ? Number(a.count)
                : null,
          };
        }),
      });
      toast.success(t("carePlace.submitted"));
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const slotLabel = currentSlot.label
    ? `${currentSlot.label} · ${currentSlot.time_of_day.slice(0, 5)}`
    : currentSlot.time_of_day.slice(0, 5);

  return (
    <>
      <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 md:p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
            <ShieldAlert className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold uppercase tracking-wide text-red-700">
              {t("carePlace.badge")}
            </div>
            <h3 className="text-base md:text-lg font-extrabold text-red-900 mt-0.5">
              {t("carePlace.bannerTitle")}
            </h3>
            <p className="text-sm text-red-800 mt-0.5">
              {t("carePlace.bannerSubtitle", { slot: slotLabel })}
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">
              <Timer className="size-3.5" />
              {t("carePlace.completeWithin", { time: formatMMSS(secondsLeft) })}
            </div>
            {pending.length > 1 && (
              <p className="text-xs text-red-700 mt-1">
                {t("carePlace.missedExtra", { count: pending.length - 1 })}
              </p>
            )}
          </div>
          <Button
            onClick={startCheck}
            className="rounded-full bg-red-600 hover:bg-red-700 text-white shrink-0"
          >
            {t("carePlace.start")}
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("carePlace.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("carePlace.dialogSubtitle", { slot: slotLabel })}
            </DialogDescription>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800 w-fit">
              <Timer className="size-3.5" />
              {t("carePlace.completeWithin", { time: formatMMSS(secondsLeft) })}
            </div>
          </DialogHeader>

          {activeItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {t("carePlace.empty")}
            </p>
          ) : (
            <div className="space-y-4 py-2">
              {activeItems.map((it) => (
                <ItemRow
                  key={it.id}
                  item={it}
                  state={answers[it.id] ?? {}}
                  onChange={(s) =>
                    setAnswers((prev) => ({ ...prev, [it.id]: s }))
                  }
                />
              ))}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">
                  {t("carePlace.notesLabel")}
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder={t("carePlace.notesPlaceholder")}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submit.isPending || activeItems.length === 0}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {submit.isPending && <Loader2 className="size-4 animate-spin" />}
              {t("carePlace.complete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ItemRow({
  item,
  state,
  onChange,
}: {
  item: CarePlaceItem;
  state: AnswerState;
  onChange: (s: AnswerState) => void;
}) {
  const { t } = useTranslation();
  const below =
    item.item_type === "count" &&
    item.min_count != null &&
    state.count !== "" &&
    state.count != null &&
    Number(state.count) < item.min_count;

  if (item.item_type === "yesno") {
    return (
      <label className="flex items-center justify-between gap-3 rounded-xl border p-3 cursor-pointer hover:bg-muted/30">
        <span className="font-medium">{item.label}</span>
        <Checkbox
          checked={!!state.yesno}
          onCheckedChange={(v) => onChange({ yesno: !!v })}
        />
      </label>
    );
  }

  return (
    <div className="rounded-xl border p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label className="font-medium">{item.label}</Label>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          value={state.count ?? ""}
          onChange={(e) => onChange({ count: e.target.value })}
          className="w-24 text-right"
        />
      </div>
      {item.min_count != null && (
        <p className="text-xs text-muted-foreground">
          {t("carePlace.minHint", { n: item.min_count })}
        </p>
      )}
      {below && (
        <p className="text-xs text-red-700 flex items-center gap-1">
          <AlertTriangle className="size-3" />
          {t("carePlace.belowMin", { n: item.min_count })}
        </p>
      )}
    </div>
  );
}

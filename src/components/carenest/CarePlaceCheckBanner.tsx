import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ShieldAlert, Loader2, Timer, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
import {
  useOpenAdhocItems,
  useResolveAdhocItem,
  type AdhocItem,
} from "@/lib/data/adhoc-items";
import { useInventoryItems, isLowStock, type InventoryItem } from "@/lib/data/inventory";

interface Props {
  familyId: string | undefined | null;
  userId: string | undefined | null;
}

interface AnswerState {
  yesno?: boolean | null;
  available?: boolean | null;
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
  const { data: inventory = [] } = useInventoryItems(familyId);
  const { data: openAdhocs = [] } = useOpenAdhocItems(familyId);
  const submit = useSubmitCarePlaceCheck();
  const resolveAdhoc = useResolveAdhocItem();

  const inventoryById = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    for (const it of inventory) map.set(it.id, it);
    return map;
  }, [inventory]);

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
        it.item_type === "yesno"
          ? { yesno: null }
          : { available: null, count: "" };
    }
    setAnswers(initial);
    setNotes("");
    setOpen(true);
  }

  function validate(): string | null {
    for (const it of activeItems) {
      const a = answers[it.id] ?? {};
      if (it.item_type === "yesno") {
        if (a.yesno !== true && a.yesno !== false) return t("carePlace.pickAnswer");
      } else {
        if (a.available !== true && a.available !== false) return t("carePlace.pickAnswer");
        if (a.available === true && (a.count === "" || a.count == null)) return t("carePlace.enterQuantity");
      }
    }
    return null;
  }

  async function handleSubmit() {
    if (!currentSlot) return;
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    try {
      const today = new Date();
      const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      await submit.mutateAsync({
        family_id: familyId!,
        performed_by: userId!,
        scheduled_time: currentSlot.time_of_day,
        scheduled_date: localDate,
        notes: notes.trim() || null,
        answers: activeItems.map((it) => {
          const a = answers[it.id] ?? {};
          if (it.item_type === "yesno") {
            return {
              item_id: it.id,
              item_label_snapshot: it.label,
              item_type_snapshot: it.item_type,
              yesno_value: a.yesno === true,
              count_value: null,
              severity: it.severity,
              decrement_amount: it.decrement_amount,
            };
          }
          const available = a.available === true;
          return {
            item_id: it.id,
            item_label_snapshot: it.label,
            item_type_snapshot: it.item_type,
            yesno_value: available,
            count_value: available ? Number(a.count) : 0,
            inventory_item_id: it.inventory_item_id ?? null,
            severity: it.severity,
            decrement_amount: it.decrement_amount,
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

function YesNoButtons({
  value,
  onChange,
}: {
  value: boolean | null | undefined;
  onChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const base =
    "flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition";
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`${base} ${
          value === true
            ? "border-green-600 bg-green-600 text-white"
            : "border-input bg-background hover:bg-muted"
        }`}
      >
        {t("carePlace.yes")}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`${base} ${
          value === false
            ? "border-red-600 bg-red-600 text-white"
            : "border-input bg-background hover:bg-muted"
        }`}
      >
        {t("carePlace.no")}
      </button>
    </div>
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
  const critical = item.severity === "critical";
  const containerCls = critical
    ? "rounded-xl border-2 border-red-400 bg-red-50/40 p-3 space-y-2"
    : "rounded-xl border p-3 space-y-2";

  const labelRow = (
    <div className="flex items-center gap-2">
      {critical && (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-600 text-white text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5">
          <AlertTriangle className="size-3" />
          {t("carePlace.criticalBadge")}
        </span>
      )}
      <Label className="font-medium">{item.label}</Label>
    </div>
  );

  if (item.item_type === "yesno") {
    return (
      <div className={containerCls}>
        {labelRow}
        <YesNoButtons
          value={state.yesno ?? null}
          onChange={(v) => onChange({ ...state, yesno: v })}
        />
      </div>
    );
  }

  const below =
    item.min_count != null &&
    state.available === true &&
    state.count !== "" &&
    state.count != null &&
    Number(state.count) < item.min_count;

  return (
    <div className={containerCls}>
      <div className="space-y-2">
        {labelRow}
        <p className="text-xs text-muted-foreground">{t("carePlace.available")}</p>
        <YesNoButtons
          value={state.available ?? null}
          onChange={(v) =>
            onChange({
              ...state,
              available: v,
              count: v ? state.count ?? "" : "",
            })
          }
        />
      </div>
      {state.available === true && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-sm">{t("carePlace.quantity")}</Label>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={state.count ?? ""}
              onChange={(e) => onChange({ ...state, count: e.target.value })}
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
      )}
    </div>
  );
}

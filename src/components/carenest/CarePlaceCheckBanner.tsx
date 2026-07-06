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
import { toast } from "@/lib/notify";
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
import { useFamily } from "@/lib/data/family";
import { useCurrentActor, guardActingProfile } from "@/lib/data/current-actor";
import { useActiveCaregiverProfile } from "@/lib/data/active-profile";

interface Props {
  familyId: string | undefined | null;
  userId: string | undefined | null;
}

type QuantityEstimate = "mycket" | "lite" | "slut";

interface AnswerState {
  yesno?: boolean | null;
  available?: boolean | null;
  count?: string;
  days?: string;
  estimate?: QuantityEstimate | null;
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
  const { data: family } = useFamily(familyId);
  const submit = useSubmitCarePlaceCheck();
  const resolveAdhoc = useResolveAdhocItem();
  const actor = useCurrentActor(familyId ?? null);
  // Shared store — same subscription as ActiveProfileSwitcher / useCurrentActor.
  const { setActive } = useActiveCaregiverProfile(familyId ?? null, userId ?? null);
  const myProfiles = actor.profiles;
  const activeProfile = actor.activeProfile;
  const multiProfileNoActive =
    myProfiles.length > 1 && !actor.activeProfileId;

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
  const [adhocAnswers, setAdhocAnswers] = useState<Record<string, boolean | null>>({});
  const [notes, setNotes] = useState("");

  if (!familyId || !userId || !currentSlot) return null;
  if (family?.at_hospital_since) return null;

  const activeItems = items.filter((i) => i.active);

  const slotDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const slotAdhocs = openAdhocs.filter(
    (a) =>
      a.for_slot_date === slotDate &&
      a.for_slot_time.slice(0, 5) === currentSlot.time_of_day.slice(0, 5),
  );

  function startCheck() {
    const initial: Record<string, AnswerState> = {};
    for (const it of activeItems) {
      const linked = it.inventory_item_id ? inventoryById.get(it.inventory_item_id) : undefined;
      const alreadyLow = linked ? isLowStock(linked) : false;
      if (it.item_type === "yesno") {
        initial[it.id] = { yesno: alreadyLow ? false : null };
      } else if (it.item_type === "count") {
        initial[it.id] = { available: alreadyLow ? false : null, count: "" };
      } else if (it.item_type === "days_left") {
        const seeded = linked?.days_left_estimate != null ? String(linked.days_left_estimate) : "";
        initial[it.id] = { days: seeded };
      } else if (it.item_type === "quantity_estimate") {
        initial[it.id] = { estimate: alreadyLow ? "lite" : null };
      } else {
        initial[it.id] = {};
      }
    }
    setAnswers(initial);
    const adhocInit: Record<string, boolean | null> = {};
    for (const a of slotAdhocs) adhocInit[a.id] = null;
    setAdhocAnswers(adhocInit);
    setNotes("");
    setOpen(true);
  }

  function validate(): string | null {
    for (const it of activeItems) {
      const a = answers[it.id] ?? {};
      if (it.item_type === "yesno") {
        if (a.yesno !== true && a.yesno !== false) return t("carePlace.pickAnswer");
      } else if (it.item_type === "count") {
        if (a.available !== true && a.available !== false) return t("carePlace.pickAnswer");
        if (a.available === true && (a.count === "" || a.count == null)) return t("carePlace.enterQuantity");
      } else if (it.item_type === "days_left") {
        if (a.days === "" || a.days == null) return t("carePlace.enterDays");
        if (!Number.isFinite(Number(a.days)) || Number(a.days) < 0) return t("carePlace.enterDays");
      } else if (it.item_type === "quantity_estimate") {
        if (!a.estimate) return t("carePlace.pickAnswer");
      }
    }
    for (const a of slotAdhocs) {
      if (adhocAnswers[a.id] !== true && adhocAnswers[a.id] !== false) {
        return t("carePlace.pickAnswer");
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
    const guard = guardActingProfile(actor);
    if (guard.blocked) {
      toast.error(t("carePlace.pickProfileFirst"));
      return;
    }
    try {
      const today = new Date();
      const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const check = await submit.mutateAsync({
        family_id: familyId!,
        performed_by: userId!,
        caregiver_profile_id: guard.caregiverProfileId,
        scheduled_time: currentSlot.time_of_day,
        scheduled_date: localDate,
        notes: notes.trim() || null,
        answers: activeItems.map((it) => {
          const a = answers[it.id] ?? {};
          const base = {
            item_id: it.id,
            item_label_snapshot: it.label,
            item_type_snapshot: it.item_type,
            inventory_item_id: it.inventory_item_id ?? null,
            severity: it.severity,
            decrement_amount: it.decrement_amount,
            min_count_snapshot: it.min_count,
            days_left_threshold_snapshot: it.days_left_threshold ?? 2,
          };
          if (it.item_type === "yesno") {
            return {
              ...base,
              yesno_value: a.yesno === true,
              count_value: null,
            };
          }
          if (it.item_type === "count") {
            const available = a.available === true;
            return {
              ...base,
              yesno_value: available,
              count_value: available ? Number(a.count) : 0,
            };
          }
          if (it.item_type === "days_left") {
            return {
              ...base,
              yesno_value: null,
              count_value: Number(a.days),
            };
          }
          // quantity_estimate
          const estimate = a.estimate ?? null;
          return {
            ...base,
            yesno_value: estimate === "mycket" ? true : estimate ? false : null,
            count_value: estimate === "mycket" ? 2 : estimate === "lite" ? 1 : 0,
            estimate_value: estimate,
          };
        }),
      });

      // Resolve ad-hoc items tied to this slot (best-effort).
      for (const a of slotAdhocs) {
        try {
          await resolveAdhoc.mutateAsync({ id: a.id, checkId: check.id });
        } catch (e) {
          console.error("Adhoc resolve failed", e);
        }
      }

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

          {myProfiles.length > 0 && (
            <div className="rounded-xl border bg-muted/40 p-3 space-y-2">
              <Label className="text-sm font-semibold">
                {t("carePlace.whoWorking")}
              </Label>
              <div className="flex flex-wrap gap-2">
                {myProfiles.map((p) => {
                  const isActive = activeProfile?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setActive(p.id)}
                      className={
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition " +
                        (isActive
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background hover:bg-accent")
                      }
                      aria-pressed={isActive}
                    >
                      <span
                        className="inline-block size-2.5 rounded-full"
                        style={{ background: p.color }}
                      />
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeItems.length === 0 && slotAdhocs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {t("carePlace.empty")}
            </p>
          ) : (
            <div className="space-y-4 py-2">
              {activeItems.map((it) => (
                <ItemRow
                  key={it.id}
                  item={it}
                  linkedInventory={
                    it.inventory_item_id
                      ? inventoryById.get(it.inventory_item_id) ?? null
                      : null
                  }
                  state={answers[it.id] ?? {}}
                  onChange={(s) =>
                    setAnswers((prev) => ({ ...prev, [it.id]: s }))
                  }
                />
              ))}
              {slotAdhocs.map((a) => (
                <AdhocRow
                  key={a.id}
                  adhoc={a}
                  linkedInventory={inventoryById.get(a.inventory_item_id) ?? null}
                  value={adhocAnswers[a.id] ?? null}
                  onChange={(v) =>
                    setAdhocAnswers((prev) => ({ ...prev, [a.id]: v }))
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
              disabled={
                submit.isPending ||
                activeItems.length === 0 ||
                multiProfileNoActive
              }
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

function ShortageStrip({ item }: { item: InventoryItem }) {
  const { t } = useTranslation();
  const unitLabel = t(`inventory.units.${item.unit}`);
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 flex items-center gap-1.5">
      <AlertTriangle className="size-3.5 shrink-0" />
      <span>
        {t("carePlace.alreadyLow", {
          qty: item.quantity,
          unit: unitLabel,
          min: item.low_stock_threshold,
        })}
      </span>
    </div>
  );
}

function ItemRow({
  item,
  linkedInventory,
  state,
  onChange,
}: {
  item: CarePlaceItem;
  linkedInventory: InventoryItem | null;
  state: AnswerState;
  onChange: (s: AnswerState) => void;
}) {
  const { t } = useTranslation();
  const critical = item.severity === "critical";
  const containerCls = critical
    ? "rounded-xl border-2 border-red-400 bg-red-50/40 p-3 space-y-2"
    : "rounded-xl border p-3 space-y-2";

  const alreadyLow = linkedInventory ? isLowStock(linkedInventory) : false;

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
        {alreadyLow && linkedInventory && <ShortageStrip item={linkedInventory} />}
        <YesNoButtons
          value={state.yesno ?? null}
          onChange={(v) => onChange({ ...state, yesno: v })}
        />
      </div>
    );
  }

  if (item.item_type === "days_left") {
    const daysNum = state.days != null && state.days !== "" ? Number(state.days) : null;
    const lowDays = daysNum != null && daysNum <= 2;
    return (
      <div className={containerCls}>
        {labelRow}
        {alreadyLow && linkedInventory && <ShortageStrip item={linkedInventory} />}
        <div className="flex items-center justify-between gap-3">
          <Label className="text-sm">{t("carePlace.daysLeftLabel")}</Label>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={state.days ?? ""}
            onChange={(e) => onChange({ ...state, days: e.target.value })}
            className="w-24 text-right"
            placeholder="0"
          />
        </div>
        {lowDays && (
          <p className="text-xs text-red-700 flex items-center gap-1">
            <AlertTriangle className="size-3" />
            {t("carePlace.daysLeftLow", { n: daysNum })}
          </p>
        )}
      </div>
    );
  }

  if (item.item_type === "quantity_estimate") {
    return (
      <div className={containerCls}>
        {labelRow}
        {alreadyLow && linkedInventory && <ShortageStrip item={linkedInventory} />}
        <EstimateButtons
          value={state.estimate ?? null}
          onChange={(v) => onChange({ ...state, estimate: v })}
        />
      </div>
    );
  }

  // count
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
        {alreadyLow && linkedInventory && <ShortageStrip item={linkedInventory} />}
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

function EstimateButtons({
  value,
  onChange,
}: {
  value: QuantityEstimate | null;
  onChange: (v: QuantityEstimate) => void;
}) {
  const { t } = useTranslation();
  const opts: { key: QuantityEstimate; label: string; cls: string }[] = [
    { key: "mycket", label: t("carePlace.estMycket"), cls: "border-green-600 bg-green-600 text-white" },
    { key: "lite", label: t("carePlace.estLite"), cls: "border-amber-500 bg-amber-500 text-white" },
    { key: "slut", label: t("carePlace.estSlut"), cls: "border-red-600 bg-red-600 text-white" },
  ];
  return (
    <div className="flex gap-2">
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
            value === o.key ? o.cls : "border-input bg-background hover:bg-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function AdhocRow({
  adhoc,
  linkedInventory,
  value,
  onChange,
}: {
  adhoc: AdhocItem;
  linkedInventory: InventoryItem | null;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border-2 border-amber-400 bg-amber-50/50 p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5">
          <Zap className="size-3" />
          {t("carePlace.adhocBadge")}
        </span>
        <Label className="font-medium">
          {t("carePlace.adhocQuestion", { name: adhoc.label })}
        </Label>
      </div>
      {linkedInventory && isLowStock(linkedInventory) && (
        <ShortageStrip item={linkedInventory} />
      )}
      <YesNoButtons value={value} onChange={onChange} />
    </div>
  );
}


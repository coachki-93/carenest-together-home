import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ShieldAlert, Plus, Trash2, Clock, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  useCarePlaceItems,
  useCarePlaceTimes,
  useUpsertCarePlaceItem,
  useDeleteCarePlaceItem,
  useUpsertCarePlaceTime,
  useDeleteCarePlaceTime,
  useCarePlaceCheckHistory,
  type CarePlaceItemType,
} from "@/lib/data/care-place-checks";
import { useInventoryItems } from "@/lib/data/inventory";

interface Props {
  familyId: string | undefined | null;
  userId: string | undefined | null;
  isOwner: boolean;
}

export function CarePlaceCheckSettings({ familyId, userId, isOwner }: Props) {
  const { t } = useTranslation();
  const { data: items = [] } = useCarePlaceItems(familyId);
  const { data: times = [] } = useCarePlaceTimes(familyId);
  const { data: history = [] } = useCarePlaceCheckHistory(familyId, 30);
  const { data: inventory = [] } = useInventoryItems(familyId);
  const upsertItem = useUpsertCarePlaceItem();
  const deleteItem = useDeleteCarePlaceItem();
  const upsertTime = useUpsertCarePlaceTime();
  const deleteTime = useDeleteCarePlaceTime();

  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<CarePlaceItemType>("yesno");
  const [newMin, setNewMin] = useState("");
  const [newInventoryId, setNewInventoryId] = useState<string>("none");
  const [newSeverity, setNewSeverity] = useState<"routine" | "critical">("routine");
  const [newDecrement, setNewDecrement] = useState("1");
  const [newTime, setNewTime] = useState("07:00");
  const [newTimeLabel, setNewTimeLabel] = useState("");
  const [newGrace, setNewGrace] = useState("30");

  async function addItem() {
    if (!familyId || !userId || !newLabel.trim()) return;
    try {
      await upsertItem.mutateAsync({
        family_id: familyId,
        created_by: userId,
        label: newLabel.trim(),
        item_type: newType,
        min_count:
          newType === "count" && newMin !== "" ? Number(newMin) : null,
        inventory_item_id:
          newType !== "yesno" && newInventoryId !== "none"
            ? newInventoryId
            : null,
        position: items.length,
        active: true,
        severity: newSeverity,
        decrement_amount: Math.max(1, Number(newDecrement) || 1),
      });
      setNewLabel("");
      setNewMin("");
      setNewInventoryId("none");
      setNewSeverity("routine");
      setNewDecrement("1");
      toast.success(t("carePlace.itemAdded"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function addTime() {
    if (!familyId || !userId || !newTime) return;
    try {
      await upsertTime.mutateAsync({
        family_id: familyId,
        created_by: userId,
        time_of_day: `${newTime}:00`,
        label: newTimeLabel.trim() || null,
        active: true,
        grace_minutes: Math.max(0, Math.min(720, Number(newGrace) || 30)),
      });
      setNewTimeLabel("");
      setNewGrace("30");
      toast.success(t("carePlace.timeAdded"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <section className="card-soft p-6 md:p-8 space-y-6">
      <header className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
          <ShieldAlert className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold">{t("carePlace.settingsTitle")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("carePlace.settingsSub")}
          </p>
        </div>
      </header>

      {!isOwner && (
        <p className="text-sm text-muted-foreground rounded-lg bg-muted p-3">
          {t("carePlace.ownerOnly")}
        </p>
      )}

      {/* Items */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">{t("carePlace.itemsTitle")}</h3>
        <div className="space-y-2">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("carePlace.noItems")}
            </p>
          )}
          {items.map((it) => {
            const linked = inventory.find((iv) => iv.id === it.inventory_item_id);
            return (
              <div
                key={it.id}
                className="flex items-center gap-2 rounded-xl border p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{it.label}</span>
                    {it.severity === "critical" && (
                      <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-red-600 text-white">
                        {t("carePlace.criticalBadge")}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {it.item_type === "yesno"
                      ? t("carePlace.typeYesNo")
                      : it.item_type === "count"
                        ? (it.min_count != null
                            ? t("carePlace.typeCountMin", { n: it.min_count })
                            : t("carePlace.typeCount"))
                        : it.item_type === "days_left"
                          ? t("carePlace.typeDaysLeft")
                          : t("carePlace.typeQuantityEstimate")}
                    {(it.item_type === "count" ||
                      it.item_type === "days_left" ||
                      it.item_type === "quantity_estimate") &&
                      linked && (
                        <> · {t("carePlace.linkedTo")} {linked.name}</>
                      )}
                  </div>
                  {isOwner && (
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Select
                        value={it.severity}
                        onValueChange={(v) =>
                          upsertItem.mutate({
                            id: it.id,
                            family_id: it.family_id,
                            created_by: it.created_by,
                            label: it.label,
                            item_type: it.item_type,
                            min_count: it.min_count,
                            position: it.position,
                            active: it.active,
                            inventory_item_id: it.inventory_item_id,
                            severity: v as "routine" | "critical",
                            decrement_amount: it.decrement_amount,
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="routine">{t("carePlace.severityRoutine")}</SelectItem>
                          <SelectItem value="critical">{t("carePlace.severityCritical")}</SelectItem>
                        </SelectContent>
                      </Select>
                      {it.item_type !== "yesno" && (
                        <Select
                          value={it.inventory_item_id ?? "none"}
                          onValueChange={(v) =>
                            upsertItem.mutate({
                              id: it.id,
                              family_id: it.family_id,
                              created_by: it.created_by,
                              label: it.label,
                              item_type: it.item_type,
                              min_count: it.min_count,
                              position: it.position,
                              active: it.active,
                              inventory_item_id: v === "none" ? null : v,
                              severity: it.severity,
                              decrement_amount: it.decrement_amount,
                            })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder={t("carePlace.linkInventory")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t("carePlace.linkNone")}</SelectItem>
                            {inventory
                              .filter((iv) => iv.active)
                              .map((iv) => (
                                <SelectItem key={iv.id} value={iv.id}>
                                  {iv.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}
                </div>
                {isOwner && (
                  <>
                    <Switch
                      checked={it.active}
                      onCheckedChange={(v) =>
                        upsertItem.mutate({
                          id: it.id,
                          family_id: it.family_id,
                          created_by: it.created_by,
                          label: it.label,
                          item_type: it.item_type,
                          min_count: it.min_count,
                          position: it.position,
                          active: !!v,
                          inventory_item_id: it.inventory_item_id,
                          severity: it.severity,
                          decrement_amount: it.decrement_amount,
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteItem.mutate(it.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
        {isOwner && (
          <div className="rounded-xl border-dashed border-2 p-3 space-y-2">
            <div className="grid sm:grid-cols-[1fr_140px] gap-2">
              <Input
                placeholder={t("carePlace.itemLabelPlaceholder")}
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
              <Select
                value={newType}
                onValueChange={(v) => setNewType(v as CarePlaceItemType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yesno">{t("carePlace.typeYesNo")}</SelectItem>
                  <SelectItem value="count">{t("carePlace.typeCount")}</SelectItem>
                  <SelectItem value="days_left">{t("carePlace.typeDaysLeft")}</SelectItem>
                  <SelectItem value="quantity_estimate">{t("carePlace.typeQuantityEstimate")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newType === "count" && (
              <div className="flex items-center gap-2">
                <Label className="text-xs">{t("carePlace.minCountLabel")}</Label>
                <Input
                  type="number"
                  min={0}
                  className="w-24"
                  value={newMin}
                  onChange={(e) => setNewMin(e.target.value)}
                />
              </div>
            )}
            {newType !== "yesno" && (
              <div className="space-y-1">
                <Label className="text-xs">{t("carePlace.linkInventory")}</Label>
                <Select value={newInventoryId} onValueChange={setNewInventoryId}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("carePlace.linkNone")}</SelectItem>
                    {inventory
                      .filter((iv) => iv.active)
                      .map((iv) => (
                        <SelectItem key={iv.id} value={iv.id}>
                          {iv.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {t("carePlace.linkHint")}
                </p>
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{t("carePlace.severityLabel")}</Label>
                <Select
                  value={newSeverity}
                  onValueChange={(v) => setNewSeverity(v as "routine" | "critical")}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">{t("carePlace.severityRoutine")}</SelectItem>
                    <SelectItem value="critical">{t("carePlace.severityCritical")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newType !== "yesno" && newType !== "days_left" && newInventoryId !== "none" && (
                <div className="space-y-1">
                  <Label className="text-xs">{t("carePlace.decrementLabel")}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newDecrement}
                    onChange={(e) => setNewDecrement(e.target.value)}
                    className="h-9"
                  />
                </div>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("carePlace.severityHint")}
            </p>
            <Button
              type="button"
              onClick={addItem}
              disabled={!newLabel.trim() || upsertItem.isPending}
              className="w-full sm:w-auto"
            >
              <Plus className="size-4" />
              {t("carePlace.addItem")}
            </Button>
          </div>
        )}
      </div>

      {/* Times */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Clock className="size-4" />
          {t("carePlace.timesTitle")}
        </h3>
        <div className="space-y-2">
          {times.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("carePlace.noTimes")}
            </p>
          )}
          {times.map((tm) => (
            <div
              key={tm.id}
              className="flex items-center gap-2 rounded-xl border p-3"
            >
              <div className="flex-1">
                <div className="font-mono font-semibold">
                  {tm.time_of_day.slice(0, 5)}
                </div>
                {tm.label && (
                  <div className="text-xs text-muted-foreground">{tm.label}</div>
                )}
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {t("carePlace.graceShort", { n: tm.grace_minutes ?? 30 })}
                </div>
              </div>
              {isOwner && (
                <>
                  <Input
                    type="number"
                    min={0}
                    max={720}
                    className="h-8 w-16 text-xs"
                    value={tm.grace_minutes ?? 30}
                    onChange={(e) =>
                      upsertTime.mutate({
                        id: tm.id,
                        family_id: tm.family_id,
                        created_by: tm.created_by,
                        time_of_day: tm.time_of_day,
                        label: tm.label,
                        active: tm.active,
                        grace_minutes: Math.max(0, Math.min(720, Number(e.target.value) || 0)),
                      })
                    }
                    aria-label={t("carePlace.graceLabel")}
                  />
                  <Switch
                    checked={tm.active}
                    onCheckedChange={(v) =>
                      upsertTime.mutate({
                        id: tm.id,
                        family_id: tm.family_id,
                        created_by: tm.created_by,
                        time_of_day: tm.time_of_day,
                        label: tm.label,
                        active: !!v,
                        grace_minutes: tm.grace_minutes,
                      })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteTime.mutate(tm.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
        {isOwner && (
          <div className="rounded-xl border-dashed border-2 p-3 space-y-2">
            <div className="grid sm:grid-cols-[120px_1fr_120px] gap-2">
              <Input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
              <Input
                placeholder={t("carePlace.timeLabelPlaceholder")}
                value={newTimeLabel}
                onChange={(e) => setNewTimeLabel(e.target.value)}
              />
              <Input
                type="number"
                min={0}
                max={720}
                value={newGrace}
                onChange={(e) => setNewGrace(e.target.value)}
                placeholder={t("carePlace.graceLabel")}
                aria-label={t("carePlace.graceLabel")}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("carePlace.graceHint")}
            </p>
            <Button
              type="button"
              onClick={addTime}
              disabled={upsertTime.isPending}
              className="w-full sm:w-auto"
            >
              <Plus className="size-4" />
              {t("carePlace.addTime")}
            </Button>
          </div>
        )}
      </div>

      {/* History */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <History className="size-4" />
          {t("carePlace.historyTitle")}
        </h3>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("carePlace.noHistory")}
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <details key={h.id} className="rounded-xl border p-3">
                <summary className="cursor-pointer flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {new Date(h.performed_at).toLocaleString()} ·{" "}
                    {h.scheduled_time.slice(0, 5)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {h.answers.length} {t("carePlace.itemsLabel")}
                  </span>
                </summary>
                <ul className="mt-2 space-y-1 text-sm">
                  {h.answers.map((a) => (
                    <li key={a.id} className="flex justify-between gap-3">
                      <span>{a.item_label_snapshot}</span>
                      <span className="font-mono text-muted-foreground">
                        {a.item_type_snapshot === "yesno"
                          ? a.yesno_value
                            ? "✓"
                            : "✗"
                          : (a.count_value ?? "—")}
                      </span>
                    </li>
                  ))}
                </ul>
                {h.notes && (
                  <p className="mt-2 text-xs text-muted-foreground italic">
                    {h.notes}
                  </p>
                )}
              </details>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

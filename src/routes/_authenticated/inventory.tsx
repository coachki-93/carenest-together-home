import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Boxes,
  Plus,
  Trash2,
  Pencil,
  Minus,
  Loader2,
  AlertTriangle,
  CalendarClock,
  History,
  Truck,
  PackageCheck,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/carenest/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMyMembership, useSession } from "@/lib/auth/use-profile";
import {
  useInventoryItems,
  useUpsertInventoryItem,
  useDeleteInventoryItem,
  useAdjustInventory,
  useInventoryHistory,
  useRecentInventoryActivity,
  useMarkOrdered,
  useClearOrder,
  useReceiveStock,
  isLowStock,
  isOnOrder,
  expiryStatus,
  summarizeStock,
  UNIT_GROUPS,
  type InventoryItem,
  type UnitKind,
} from "@/lib/data/inventory";
import { useFamilyMembers } from "@/lib/data/family";
import { useCarePlaceCheckHistory, useCarePlaceTimes } from "@/lib/data/care-place-checks";
import {
  useOpenAdhocItems,
  useAddAdhocItem,
  useDeleteAdhocItem,
  nextUpcomingSlot,
  type AdhocItem,
} from "@/lib/data/adhoc-items";
import { narrateAdjustments } from "@/lib/data/inventory-narrate";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({ meta: [{ title: "Förråd — CareNest" }] }),
  component: InventoryPage,
});

type FilterMode = "all" | "low" | "expiring";

function InventoryPage() {
  const { t } = useTranslation();
  const { user } = useSession();
  const { data: membership } = useMyMembership();
  const familyId = membership?.family_id;
  const isOwner = membership?.role === "owner";
  const isMaterialManager = isOwner || !!membership?.material_responsible;

  const { data: items = [], isLoading } = useInventoryItems(familyId);
  const { data: carePlaceTimes = [] } = useCarePlaceTimes(familyId);
  const { data: openAdhocs = [] } = useOpenAdhocItems(familyId);
  const nextSlot = useMemo(() => nextUpcomingSlot(carePlaceTimes, new Date()), [carePlaceTimes]);
  const adhocByItem = useMemo(() => {
    const map = new Map<string, AdhocItem>();
    if (!nextSlot) return map;
    for (const a of openAdhocs) {
      if (
        a.for_slot_date === nextSlot.date &&
        a.for_slot_time.slice(0, 5) === nextSlot.time.slice(0, 5)
      ) {
        map.set(a.inventory_item_id, a);
      }
    }
    return map;
  }, [openAdhocs, nextSlot]);

  const [filter, setFilter] = useState<FilterMode>("all");
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [historyFor, setHistoryFor] = useState<InventoryItem | null>(null);

  const summary = useMemo(() => summarizeStock(items), [items]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (!it.active) return false;
      if (filter === "low") return isLowStock(it);
      if (filter === "expiring") {
        const e = expiryStatus(it);
        return e !== "ok";
      }
      return true;
    });
  }, [items, filter]);

  return (
    <DashboardLayout
      title={t("inventory.title")}
      subtitle={t("inventory.subtitle")}
      actions={
        isMaterialManager ? (
          <Button
            size="sm"
            className="rounded-full gap-1.5 font-semibold"
            onClick={() => setCreating(true)}
          >
            <Plus className="size-4" /> {t("inventory.add")}
          </Button>
        ) : undefined
      }
    >
      <div className="max-w-3xl mx-auto space-y-5">
        {!isMaterialManager && (
          <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
            {t("inventory.readOnly")}
          </p>
        )}

        {/* Summary */}
        {(summary.lowCount > 0 ||
          summary.expiringCount > 0 ||
          summary.expiredCount > 0) && (
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
            <div className="size-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-none">
              <AlertTriangle className="size-5" />
            </div>
            <div className="text-sm text-amber-900 flex-1">
              <div className="font-bold">{t("inventory.alertTitle")}</div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                {summary.lowCount > 0 && (
                  <span>
                    {t("inventory.lowCount", { count: summary.lowCount })}
                  </span>
                )}
                {summary.expiringCount > 0 && (
                  <span>
                    {t("inventory.expiringCount", { count: summary.expiringCount })}
                  </span>
                )}
                {summary.expiredCount > 0 && (
                  <span className="text-red-700 font-semibold">
                    {t("inventory.expiredCount", { count: summary.expiredCount })}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2">
          {(["all", "low", "expiring"] as FilterMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setFilter(m)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-semibold border",
                filter === m
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted",
              )}
            >
              {t(`inventory.filter.${m}`)}
            </button>
          ))}
        </div>

        {/* Items */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : filtered.length === 0 ? (
          <div className="card-soft p-10 text-center space-y-3">
            <Boxes className="size-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {items.length === 0
                ? t("inventory.empty")
                : t("inventory.emptyFilter")}
            </p>
            {isMaterialManager && items.length === 0 && (
              <Button
                className="rounded-full"
                onClick={() => setCreating(true)}
              >
                <Plus className="size-4" /> {t("inventory.add")}
              </Button>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((it) => (
              <InventoryRow
                key={it.id}
                item={it}
                canManage={isMaterialManager}
                userId={user?.id ?? null}
                familyId={familyId ?? null}
                nextSlot={nextSlot}
                queuedAdhoc={adhocByItem.get(it.id) ?? null}
                onEdit={() => setEditing(it)}
                onHistory={() => setHistoryFor(it)}
              />
            ))}
          </ul>
        )}

        {familyId && <ShoppingListCard familyId={familyId} />}
        {familyId && <RecentActivityCard familyId={familyId} />}
      </div>

      {(creating || editing) && familyId && user?.id && (
        <InventoryDialog
          familyId={familyId}
          userId={user.id}
          item={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      {historyFor && (
        <HistoryDialog
          item={historyFor}
          onClose={() => setHistoryFor(null)}
        />
      )}
    </DashboardLayout>
  );
}

function formatQty(qty: number | string, unit: UnitKind, unitLabel: string) {
  const n = Number(qty);
  return `${Number.isInteger(n) ? n : n.toFixed(2).replace(/\.?0+$/, "")} ${unitLabel}`;
}

function InventoryRow({
  item,
  canManage,
  userId,
  familyId,
  nextSlot,
  queuedAdhoc,
  onEdit,
  onHistory,
}: {
  item: InventoryItem;
  canManage: boolean;
  userId: string | null;
  familyId: string | null;
  nextSlot: ReturnType<typeof nextUpcomingSlot>;
  queuedAdhoc: AdhocItem | null;
  onEdit: () => void;
  onHistory: () => void;
}) {
  const { t } = useTranslation();
  const adjust = useAdjustInventory();
  const del = useDeleteInventoryItem();
  const addAdhoc = useAddAdhocItem();
  const removeAdhoc = useDeleteAdhocItem();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const low = isLowStock(item);
  const exp = expiryStatus(item);
  const unitLabel = t(`inventory.units.${item.unit}`);

  async function bump(delta: number, reason: "manual_add" | "manual_remove") {
    if (!userId) return;
    try {
      await adjust.mutateAsync({
        itemId: item.id,
        familyId: item.family_id,
        performedBy: userId,
        delta,
        reason,
      });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const [receiveOpen, setReceiveOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);

  return (
    <li className="card-soft p-4 flex flex-col sm:flex-row sm:items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold truncate">{item.name}</span>
          {low && !isOnOrder(item) && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              {t("inventory.low")}
            </span>
          )}
          {isOnOrder(item) && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              <Truck className="size-3" />
              {item.expected_at
                ? t("inventory.orderedExpected", { date: item.expected_at })
                : t("inventory.ordered")}
            </span>
          )}
          {exp === "soon" && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              {t("inventory.expiringSoon")}
            </span>
          )}
          {exp === "expired" && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-200 text-red-800">
              {t("inventory.expired")}
            </span>
          )}
          {queuedAdhoc && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              <Zap className="size-3" />
              {t("inventory.queuedForSlot", { time: queuedAdhoc.for_slot_time.slice(0, 5) })}
            </span>
          )}
        </div>
        <div className="text-2xl font-extrabold mt-0.5">
          {formatQty(item.quantity, item.unit, unitLabel)}
        </div>
        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
          {item.low_stock_threshold != null && (
            <span>
              {t("inventory.minLabel")}: {item.low_stock_threshold} {unitLabel}
            </span>
          )}
          {item.days_left_estimate != null && (
            <span className="text-amber-700 font-medium">
              {t("inventory.daysLeftEst", { n: item.days_left_estimate })}
            </span>
          )}
          {item.expiry_date && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3" />
              {item.expiry_date}
            </span>
          )}
          {item.location && (
            <span>{t("inventory.locationLabel")}: {item.location}</span>
          )}
          {item.supplier && <span>{item.supplier}</span>}
        </div>
        {item.notes && (
          <p className="text-xs text-muted-foreground italic mt-1">{item.notes}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-1 flex-none">
        {canManage && (
          <>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              disabled={adjust.isPending || Number(item.quantity) <= 0}
              onClick={() => bump(-1, "manual_remove")}
              aria-label={t("inventory.minusOne")}
            >
              <Minus className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              disabled={adjust.isPending}
              onClick={() => bump(1, "manual_add")}
              aria-label={t("inventory.plusOne")}
            >
              <Plus className="size-4" />
            </Button>
            {low && !isOnOrder(item) && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full gap-1 text-blue-700 border-blue-300 hover:bg-blue-50"
                onClick={() => setOrderOpen(true)}
              >
                <Truck className="size-3.5" />
                {t("inventory.markOrdered")}
              </Button>
            )}
            {low && nextSlot && familyId && userId && !queuedAdhoc && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full gap-1 text-amber-800 border-amber-300 hover:bg-amber-50"
                disabled={addAdhoc.isPending}
                onClick={async () => {
                  try {
                    await addAdhoc.mutateAsync({
                      familyId,
                      inventoryItemId: item.id,
                      label: item.name,
                      forSlotDate: nextSlot.date,
                      forSlotTime: nextSlot.time,
                      createdBy: userId,
                    });
                    toast.success(
                      t("inventory.addedToNextRound", {
                        time: nextSlot.time.slice(0, 5),
                      }),
                    );
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
              >
                <Zap className="size-3.5" />
                {t("inventory.addToNextRound")}
              </Button>
            )}
            {queuedAdhoc && (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full gap-1 text-muted-foreground"
                disabled={removeAdhoc.isPending}
                onClick={async () => {
                  try {
                    await removeAdhoc.mutateAsync(queuedAdhoc.id);
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
              >
                <X className="size-3.5" />
                {t("inventory.cancelQueued")}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="rounded-full gap-1"
              onClick={() => setReceiveOpen(true)}
            >
              <PackageCheck className="size-3.5" />
              {t("inventory.markReceived")}
            </Button>
            {item.supplier_url && (
              <a
                href={item.supplier_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold text-blue-700 border-blue-300 hover:bg-blue-50"
              >
                <Truck className="size-3.5" />
                {t("inventory.reorder")}
              </a>
            )}
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={onHistory}
          aria-label={t("inventory.history")}
        >
          <History className="size-4" />
        </Button>
        {canManage && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={onEdit}
              aria-label={t("common.edit")}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
              aria-label={t("common.remove")}
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        )}
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("inventory.confirmDelete")}</DialogTitle>
            <DialogDescription>
              {t("inventory.confirmDeleteSub", { name: item.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={del.isPending}
              onClick={async () => {
                try {
                  await del.mutateAsync(item.id);
                  setConfirmDelete(false);
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              {t("common.remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {orderOpen && userId && (
        <MarkOrderedDialog
          item={item}
          userId={userId}
          onClose={() => setOrderOpen(false)}
        />
      )}
      {receiveOpen && userId && (
        <ReceiveStockDialog
          item={item}
          userId={userId}
          onClose={() => setReceiveOpen(false)}
        />
      )}
    </li>
  );
}

function MarkOrderedDialog({
  item,
  userId,
  onClose,
}: {
  item: InventoryItem;
  userId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const mark = useMarkOrdered();
  const clear = useClearOrder();
  const [expected, setExpected] = useState(item.expected_at ?? "");

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("inventory.markOrderedTitle")}</DialogTitle>
          <DialogDescription>
            {t("inventory.markOrderedSub", { name: item.name })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>{t("inventory.expectedDate")}</Label>
          <Input
            type="date"
            value={expected}
            onChange={(e) => setExpected(e.target.value)}
          />
        </div>
        <DialogFooter className="gap-2 flex-wrap">
          {isOnOrder(item) && (
            <Button
              variant="outline"
              className="text-destructive"
              onClick={async () => {
                try {
                  await clear.mutateAsync(item.id);
                  onClose();
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              <X className="size-4" /> {t("inventory.clearOrder")}
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={mark.isPending}
            onClick={async () => {
              try {
                await mark.mutateAsync({
                  itemId: item.id,
                  userId,
                  expectedAt: expected || null,
                });
                toast.success(t("inventory.markedOrdered"));
                onClose();
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            {mark.isPending && <Loader2 className="size-4 animate-spin" />}
            {t("inventory.markOrdered")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReceiveStockDialog({
  item,
  userId,
  onClose,
}: {
  item: InventoryItem;
  userId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const receive = useReceiveStock();
  const [qty, setQty] = useState(
    item.low_stock_threshold != null
      ? String(Math.max(1, Number(item.low_stock_threshold) * 2 - Number(item.quantity)))
      : "1",
  );
  const [note, setNote] = useState("");

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("inventory.markReceivedTitle")}</DialogTitle>
          <DialogDescription>
            {t("inventory.markReceivedSub", { name: item.name })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>{t("inventory.quantityReceived")}</Label>
            <Input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("inventory.receiveNote")}</Label>
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("inventory.receiveNotePlaceholder")}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={receive.isPending}
            onClick={async () => {
              const n = Number(qty);
              if (!Number.isFinite(n) || n <= 0) {
                toast.error(t("inventory.quantityInvalid"));
                return;
              }
              try {
                await receive.mutateAsync({
                  itemId: item.id,
                  familyId: item.family_id,
                  performedBy: userId,
                  quantity: n,
                  note: note.trim() || null,
                });
                toast.success(t("inventory.markedReceived"));
                onClose();
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            {receive.isPending && <Loader2 className="size-4 animate-spin" />}
            {t("inventory.markReceived")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShoppingListCard({ familyId }: { familyId: string }) {
  const { t } = useTranslation();
  const { data: items = [] } = useInventoryItems(familyId);

  const { toOrder, onOrder } = useMemo(() => {
    const to: InventoryItem[] = [];
    const oo: InventoryItem[] = [];
    for (const it of items) {
      if (!it.active) continue;
      if (isOnOrder(it)) {
        oo.push(it);
      } else if (isLowStock(it)) {
        to.push(it);
      }
    }
    return { toOrder: to, onOrder: oo };
  }, [items]);

  if (toOrder.length === 0 && onOrder.length === 0) return null;

  return (
    <section className="card-soft p-4 space-y-3">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <Truck className="size-4" />
        {t("inventory.shoppingList")}
      </h3>

      {toOrder.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-red-700">
            {t("inventory.toOrder")}
          </div>
          <ul className="space-y-1">
            {toOrder.map((it) => {
              const unitLabel = t(`inventory.units.${it.unit}`);
              return (
                <li
                  key={it.id}
                  className="flex items-center justify-between gap-2 text-sm rounded-md border bg-red-50/60 px-2.5 py-1.5"
                >
                  <span className="min-w-0">
                    <span className="font-semibold">{it.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {formatQty(it.quantity, it.unit, unitLabel)}
                      {it.low_stock_threshold != null && (
                        <> / {it.low_stock_threshold} {unitLabel}</>
                      )}
                      {it.supplier && <> · {it.supplier}</>}
                    </span>
                  </span>
                  {it.supplier_url && (
                    <a
                      href={it.supplier_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-blue-700 hover:underline shrink-0"
                    >
                      {t("inventory.reorder")}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {onOrder.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-blue-700">
            {t("inventory.onOrder")}
          </div>
          <ul className="space-y-1">
            {onOrder.map((it) => (
              <li
                key={it.id}
                className="flex items-center justify-between gap-2 text-sm rounded-md border bg-blue-50/60 px-2.5 py-1.5"
              >
                <span className="font-semibold">{it.name}</span>
                <span className="text-xs text-blue-800">
                  {it.expected_at
                    ? t("inventory.orderedExpected", { date: it.expected_at })
                    : t("inventory.ordered")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function RecentActivityCard({ familyId }: { familyId: string }) {
  const { t } = useTranslation();
  const { data: activity = [] } = useRecentInventoryActivity(familyId, 10);
  const { data: items = [] } = useInventoryItems(familyId);
  const { data: members = [] } = useFamilyMembers(familyId);
  const { data: checks = [] } = useCarePlaceCheckHistory(familyId, 100);

  const memberNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const mem of members) {
      m.set(mem.user_id, mem.profile?.full_name?.trim() || t("inventory.narrate.someone"));
    }
    return m;
  }, [members, t]);

  const checkSlots = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of checks) m.set(c.id, c.scheduled_time.slice(0, 5));
    return m;
  }, [checks]);

  const lines = useMemo(() => {
    // We need "current quantity" per item to walk back deltas correctly.
    // Group activity by item, narrate each group, then merge sorted by date desc.
    const byItem = new Map<string, typeof activity>();
    for (const a of activity) {
      const arr = byItem.get(a.inventory_item_id) ?? [];
      arr.push(a);
      byItem.set(a.inventory_item_id, arr);
    }
    const all: Array<{ id: string; created_at: string; narration: string }> = [];
    for (const [itemId, list] of byItem) {
      const item = items.find((it) => it.id === itemId);
      if (!item) continue;
      const narrated = narrateAdjustments(list, Number(item.quantity), {
        memberNames,
        checkSlots,
        t,
        itemMeta: { name: item.name, unit: item.unit },
      });
      for (const n of narrated) {
        all.push({ id: n.id, created_at: n.created_at, narration: n.narration });
      }
    }
    return all
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 10);
  }, [activity, items, memberNames, checkSlots, t]);

  if (lines.length === 0) return null;

  return (
    <section className="card-soft p-4 space-y-3">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <History className="size-4" />
        {t("inventory.recentActivity")}
      </h3>
      <ul className="space-y-1.5 text-sm">
        {lines.map((l) => (
          <li key={l.id} className="text-muted-foreground">
            <span className="text-xs text-muted-foreground/80 font-mono mr-2">
              {new Date(l.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {l.narration}
          </li>
        ))}
      </ul>
    </section>
  );
}

function InventoryDialog({
  familyId,
  userId,
  item,
  onClose,
}: {
  familyId: string;
  userId: string;
  item: InventoryItem | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const upsert = useUpsertInventoryItem();
  const adjust = useAdjustInventory();

  const [name, setName] = useState(item?.name ?? "");
  const [unit, setUnit] = useState<UnitKind>(item?.unit ?? "pcs");
  const [quantity, setQuantity] = useState(
    item ? String(item.quantity) : "0",
  );
  const [threshold, setThreshold] = useState(
    item?.low_stock_threshold != null ? String(item.low_stock_threshold) : "",
  );
  const [expiry, setExpiry] = useState(item?.expiry_date ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [location, setLocation] = useState(item?.location ?? "");
  const [supplier, setSupplier] = useState(item?.supplier ?? "");
  const [supplierUrl, setSupplierUrl] = useState(item?.supplier_url ?? "");

  const editing = !!item;
  const saving = upsert.isPending || adjust.isPending;

  async function save() {
    if (!name.trim()) {
      toast.error(t("inventory.nameRequired"));
      return;
    }
    const q = Number(quantity);
    if (!Number.isFinite(q) || q < 0) {
      toast.error(t("inventory.quantityInvalid"));
      return;
    }
    const thr = threshold === "" ? null : Number(threshold);
    if (thr != null && (!Number.isFinite(thr) || thr < 0)) {
      toast.error(t("inventory.thresholdInvalid"));
      return;
    }

    try {
      if (editing && item) {
        await upsert.mutateAsync({
          id: item.id,
          family_id: item.family_id,
          created_by: item.created_by,
          name: name.trim(),
          unit,
          low_stock_threshold: thr,
          expiry_date: expiry || null,
          notes: notes.trim() || null,
          active: item.active,
          location: location.trim() || null,
          supplier: supplier.trim() || null,
          supplier_url: supplierUrl.trim() || null,
        });
        if (q !== Number(item.quantity)) {
          await adjust.mutateAsync({
            itemId: item.id,
            familyId: item.family_id,
            performedBy: userId,
            delta: q,
            reason: "manual_set",
            note: t("inventory.reason.manual_set"),
          });
        }
      } else {
        // Insert with quantity=0 first, then log an opening-stock adjustment.
        const { data: created, error } = await import("@/integrations/supabase/client").then(
          async ({ supabase }) =>
            supabase
              .from("inventory_items")
              .insert({
                family_id: familyId,
                created_by: userId,
                name: name.trim(),
                unit,
                quantity: 0,
                low_stock_threshold: thr,
                expiry_date: expiry || null,
                notes: notes.trim() || null,
                active: true,
                location: location.trim() || null,
                supplier: supplier.trim() || null,
                supplier_url: supplierUrl.trim() || null,
              })
              .select()
              .single(),
        );
        if (error) throw error;
        if (q > 0 && created) {
          await adjust.mutateAsync({
            itemId: created.id,
            familyId,
            performedBy: userId,
            delta: q,
            reason: "manual_add",
            note: t("inventory.reason.opening"),
          });
        }
      }
      toast.success(t(editing ? "inventory.saved" : "inventory.created"));
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? t("inventory.edit") : t("inventory.add")}
          </DialogTitle>
          <DialogDescription>{t("inventory.dialogSub")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{t("inventory.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("inventory.quantityLabel")}</Label>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("inventory.unit")}</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v as UnitKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_GROUPS.map((g) => (
                    <SelectGroup key={g.group}>
                      <SelectLabel>{t(`inventory.unitGroup.${g.group}`)}</SelectLabel>
                      {g.units.map((u) => (
                        <SelectItem key={u} value={u}>
                          {t(`inventory.units.${u}`)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("inventory.threshold")}</Label>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder={t("inventory.thresholdPlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("inventory.expiry")}</Label>
            <Input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("inventory.notes")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("inventory.location")}</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t("inventory.locationPlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("inventory.supplier")}</Label>
              <Input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder={t("inventory.supplierPlaceholder")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("inventory.supplierUrl")}</Label>
            <Input
              type="url"
              value={supplierUrl}
              onChange={(e) => setSupplierUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
        </div>


        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HistoryDialog({
  item,
  onClose,
}: {
  item: InventoryItem;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { data: history = [], isLoading } = useInventoryHistory(item.id, 100);
  const { data: members = [] } = useFamilyMembers(item.family_id);
  const { data: checks = [] } = useCarePlaceCheckHistory(item.family_id, 200);
  const unitLabel = t(`inventory.units.${item.unit}`);

  const narrated = useMemo(() => {
    const memberNames = new Map<string, string>();
    for (const m of members) {
      memberNames.set(m.user_id, m.profile?.full_name?.trim() || t("inventory.narrate.someone"));
    }
    const checkSlots = new Map<string, string>();
    for (const c of checks) checkSlots.set(c.id, c.scheduled_time.slice(0, 5));
    return narrateAdjustments(history, Number(item.quantity), {
      memberNames,
      checkSlots,
      t,
      itemMeta: { name: item.name, unit: item.unit },
    });
  }, [history, members, checks, item, t]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("inventory.history")}</DialogTitle>
          <DialogDescription>{item.name}</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : narrated.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {t("inventory.noHistory")}
          </p>
        ) : (
          <ul className="space-y-2">
            {narrated.map((h) => {
              const positive = Number(h.delta) >= 0;
              return (
                <li
                  key={h.id}
                  className="flex items-start justify-between gap-3 p-2 rounded-lg bg-muted/40"
                >
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">
                      {new Date(h.created_at).toLocaleString()}
                    </div>
                    <div className="text-sm">{h.narration}</div>
                  </div>
                  <div
                    className={cn(
                      "font-mono font-bold text-sm whitespace-nowrap",
                      positive ? "text-green-700" : "text-red-700",
                    )}
                  >
                    {positive ? "+" : ""}
                    {h.delta} {unitLabel}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <DialogFooter>
          <Button onClick={onClose}>{t("common.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

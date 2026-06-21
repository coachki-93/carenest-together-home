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
import { useCarePlaceCheckHistory } from "@/lib/data/care-place-checks";
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
                onEdit={() => setEditing(it)}
                onHistory={() => setHistoryFor(it)}
              />
            ))}
          </ul>
        )}
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
  onEdit,
  onHistory,
}: {
  item: InventoryItem;
  canManage: boolean;
  userId: string | null;
  onEdit: () => void;
  onHistory: () => void;
}) {
  const { t } = useTranslation();
  const adjust = useAdjustInventory();
  const del = useDeleteInventoryItem();
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

  return (
    <li className="card-soft p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold truncate">{item.name}</span>
          {low && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              {t("inventory.low")}
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
        </div>
        <div className="text-2xl font-extrabold mt-0.5">
          {formatQty(item.quantity, item.unit, unitLabel)}
        </div>
        <div className="text-xs text-muted-foreground space-x-2">
          {item.low_stock_threshold != null && (
            <span>
              {t("inventory.minLabel")}: {item.low_stock_threshold} {unitLabel}
            </span>
          )}
          {item.expiry_date && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3" />
              {item.expiry_date}
            </span>
          )}
        </div>
        {item.notes && (
          <p className="text-xs text-muted-foreground italic mt-1">{item.notes}</p>
        )}
      </div>
      <div className="flex gap-1 flex-none">
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
    </li>
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
  const unitLabel = t(`inventory.units.${item.unit}`);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("inventory.history")}</DialogTitle>
          <DialogDescription>{item.name}</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {t("inventory.noHistory")}
          </p>
        ) : (
          <ul className="space-y-2">
            {history.map((h) => {
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
                    <div className="text-sm font-medium">
                      {t(`inventory.reason.${h.reason}`)}
                    </div>
                    {h.note && (
                      <div className="text-xs text-muted-foreground italic">
                        {h.note}
                      </div>
                    )}
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

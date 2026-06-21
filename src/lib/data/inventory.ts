import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type InventoryItem =
  Database["public"]["Tables"]["inventory_items"]["Row"];
export type InventoryItemInsert =
  Database["public"]["Tables"]["inventory_items"]["Insert"];
export type InventoryItemUpdate =
  Database["public"]["Tables"]["inventory_items"]["Update"];
export type InventoryAdjustment =
  Database["public"]["Tables"]["inventory_adjustments"]["Row"];
export type InventoryAdjustmentInsert =
  Database["public"]["Tables"]["inventory_adjustments"]["Insert"];
export type UnitKind = Database["public"]["Enums"]["unit_kind"];
export type AdjustmentReason =
  Database["public"]["Enums"]["inventory_adjustment_reason"];

export const UNIT_GROUPS: { group: "count" | "volume" | "weight"; units: UnitKind[] }[] = [
  { group: "count", units: ["pcs", "box", "pack"] },
  { group: "volume", units: ["ml", "l"] },
  { group: "weight", units: ["g", "kg"] },
];

export function useInventoryItems(familyId: string | undefined | null) {
  return useQuery({
    queryKey: ["inventory-items", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("family_id", familyId!)
        .order("name", { ascending: true });
      if (error) throw error;
      return data as InventoryItem[];
    },
  });
}

export function useInventoryItem(itemId: string | undefined | null) {
  return useQuery({
    queryKey: ["inventory-item", itemId],
    enabled: !!itemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("id", itemId!)
        .maybeSingle();
      if (error) throw error;
      return data as InventoryItem | null;
    },
  });
}

export function useUpsertInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: (InventoryItemInsert & { id?: string }) | (InventoryItemUpdate & { id: string }),
    ) => {
      if ("id" in input && input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase
          .from("inventory_items")
          .update(rest)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("inventory_items")
          .insert(input as InventoryItemInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-items"] });
      qc.invalidateQueries({ queryKey: ["inventory-item"] });
    },
  });
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory-items"] }),
  });
}

export interface AdjustInventoryInput {
  itemId: string;
  familyId: string;
  performedBy: string;
  /** Signed delta. Negative for usage. */
  delta: number;
  reason: AdjustmentReason;
  note?: string | null;
  sourceCheckId?: string | null;
}

/** Performs a quantity change + writes an audit row. Clamps quantity at 0. */
export async function adjustInventory(input: AdjustInventoryInput): Promise<void> {
  const { data: item, error: getErr } = await supabase
    .from("inventory_items")
    .select("quantity")
    .eq("id", input.itemId)
    .maybeSingle();
  if (getErr) throw getErr;
  if (!item) throw new Error("Inventory item not found");

  const current = Number(item.quantity ?? 0);
  let next: number;
  let effectiveDelta = input.delta;
  if (input.reason === "manual_set") {
    next = Math.max(0, input.delta);
    effectiveDelta = next - current;
  } else {
    next = Math.max(0, current + input.delta);
    effectiveDelta = next - current;
  }

  const { error: upErr } = await supabase
    .from("inventory_items")
    .update({ quantity: next })
    .eq("id", input.itemId);
  if (upErr) throw upErr;

  if (effectiveDelta !== 0 || input.reason === "manual_set") {
    const { error: logErr } = await supabase.from("inventory_adjustments").insert({
      family_id: input.familyId,
      inventory_item_id: input.itemId,
      delta: effectiveDelta,
      reason: input.reason,
      note: input.note ?? null,
      performed_by: input.performedBy,
      source_check_id: input.sourceCheckId ?? null,
    });
    if (logErr) throw logErr;
  }
}

export function useAdjustInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adjustInventory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-items"] });
      qc.invalidateQueries({ queryKey: ["inventory-item"] });
      qc.invalidateQueries({ queryKey: ["inventory-history"] });
    },
  });
}

export function useInventoryHistory(itemId: string | undefined | null, limit = 50) {
  return useQuery({
    queryKey: ["inventory-history", itemId, limit],
    enabled: !!itemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_adjustments")
        .select("*")
        .eq("inventory_item_id", itemId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as InventoryAdjustment[];
    },
  });
}

export function useRecentInventoryActivity(
  familyId: string | undefined | null,
  limit = 20,
) {
  return useQuery({
    queryKey: ["inventory-activity", familyId, limit],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_adjustments")
        .select("*, item:inventory_items(name, unit)")
        .eq("family_id", familyId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as (InventoryAdjustment & {
        item: { name: string; unit: UnitKind } | null;
      })[];
    },
  });
}

export interface LowStockSummary {
  lowCount: number;
  expiringCount: number;
  expiredCount: number;
}

const EXPIRY_SOON_DAYS = 30;

export function isLowStock(item: InventoryItem): boolean {
  if (!item.active) return false;
  if (item.low_stock_threshold == null) return false;
  return Number(item.quantity) <= Number(item.low_stock_threshold);
}

export function expiryStatus(
  item: InventoryItem,
  now = new Date(),
): "ok" | "soon" | "expired" {
  if (!item.expiry_date) return "ok";
  const exp = new Date(item.expiry_date + "T00:00:00");
  const diffDays = Math.floor((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "expired";
  if (diffDays <= EXPIRY_SOON_DAYS) return "soon";
  return "ok";
}

export function summarizeStock(items: InventoryItem[]): LowStockSummary {
  let low = 0;
  let soon = 0;
  let expired = 0;
  const now = new Date();
  for (const it of items) {
    if (!it.active) continue;
    if (isLowStock(it)) low++;
    const e = expiryStatus(it, now);
    if (e === "soon") soon++;
    if (e === "expired") expired++;
  }
  return { lowCount: low, expiringCount: soon, expiredCount: expired };
}

export function useLowStockSummary(familyId: string | undefined | null) {
  const { data: items = [] } = useInventoryItems(familyId);
  return summarizeStock(items);
}

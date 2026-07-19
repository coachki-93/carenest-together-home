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
    meta: { suppressGlobalError: true },
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
    meta: { suppressGlobalError: true },
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
    meta: { suppressGlobalError: true },
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

export function isOnOrder(item: InventoryItem): boolean {
  return !!item.ordered_at;
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
    // Items on order don't count toward the red "low" badge — they're acknowledged.
    if (isLowStock(it) && !isOnOrder(it)) low++;
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

export interface MarkOrderedInput {
  itemId: string;
  userId: string;
  expectedAt?: string | null; // YYYY-MM-DD
}

export function useMarkOrdered() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (input: MarkOrderedInput) => {
      const { error } = await supabase
        .from("inventory_items")
        .update({
          ordered_at: new Date().toISOString(),
          ordered_by: input.userId,
          expected_at: input.expectedAt ?? null,
        })
        .eq("id", input.itemId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory-items"] }),
  });
}

export function useClearOrder() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("inventory_items")
        .update({ ordered_at: null, ordered_by: null, expected_at: null })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory-items"] }),
  });
}

export interface ReceiveStockInput {
  itemId: string;
  familyId: string;
  performedBy: string;
  quantity: number;
  note?: string | null;
}

export function useReceiveStock() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (input: ReceiveStockInput) => {
      if (input.quantity <= 0) throw new Error("Quantity must be greater than 0");
      await adjustInventory({
        itemId: input.itemId,
        familyId: input.familyId,
        performedBy: input.performedBy,
        delta: input.quantity,
        reason: "received",
        note: input.note ?? null,
      });
      // Clear the on-order flags now that stock has arrived.
      const { error } = await supabase
        .from("inventory_items")
        .update({ ordered_at: null, ordered_by: null, expected_at: null })
        .eq("id", input.itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-items"] });
      qc.invalidateQueries({ queryKey: ["inventory-item"] });
      qc.invalidateQueries({ queryKey: ["inventory-history"] });
      qc.invalidateQueries({ queryKey: ["inventory-activity"] });
    },
  });
}

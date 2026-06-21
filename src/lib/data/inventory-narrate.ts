import type { InventoryAdjustment, UnitKind } from "./inventory";

export interface NarrationContext {
  /** Map from user_id → display name. */
  memberNames: Map<string, string>;
  /** Map from care_place_check id → "HH:MM" scheduled time string. */
  checkSlots: Map<string, string>;
  /** Translator. */
  t: (key: string, opts?: Record<string, unknown>) => string;
  /** Item meta (name + unit) — used when the adjustment row doesn't have it. */
  itemMeta?: { name: string; unit: UnitKind } | null;
}

interface AdjustmentLike extends InventoryAdjustment {
  item?: { name: string; unit: UnitKind } | null;
}

/**
 * Walks adjustments newest-first and computes the running "from → to" by
 * back-stepping through the deltas. Returns the same list but enriched with
 * a `narration` string and `before` / `after` quantities (computed).
 */
export function narrateAdjustments(
  adjustments: AdjustmentLike[],
  currentQuantity: number,
  ctx: NarrationContext,
): Array<AdjustmentLike & { narration: string; before: number; after: number }> {
  // Adjustments are newest-first. `after` for the newest one is currentQuantity.
  // Walking backward in time: before(i) = after(i) - delta(i); after(i-1) = before(i).
  let after = Number(currentQuantity);
  return adjustments.map((adj) => {
    const delta = Number(adj.delta);
    const before = after - delta;
    const itemName = adj.item?.name ?? ctx.itemMeta?.name ?? "";
    const who = adj.performed_by
      ? ctx.memberNames.get(adj.performed_by) ?? ctx.t("inventory.narrate.someone")
      : ctx.t("inventory.narrate.system");
    const slot = adj.source_check_id ? ctx.checkSlots.get(adj.source_check_id) ?? null : null;

    const narration = buildSentence({
      reason: adj.reason,
      delta,
      before,
      after,
      who,
      slot,
      itemName,
      note: adj.note,
      t: ctx.t,
    });

    const entry = { ...adj, narration, before, after };
    after = before;
    return entry;
  });
}

function buildSentence(args: {
  reason: string;
  delta: number;
  before: number;
  after: number;
  who: string;
  slot: string | null;
  itemName: string;
  note: string | null;
  t: NarrationContext["t"];
}): string {
  const { reason, delta, before, after, who, slot, itemName, t } = args;
  const range = `${formatQty(before)} → ${formatQty(after)}`;
  const item = itemName || t("inventory.narrate.itemFallback");

  switch (reason) {
    case "care_place_check":
      return slot
        ? t("inventory.narrate.carePlaceAtSlot", { who, slot, item, range })
        : t("inventory.narrate.carePlace", { who, item, range });
    case "received":
      return t("inventory.narrate.received", { who, item, range });
    case "manual_add":
      return t("inventory.narrate.added", { who, item, range, n: Math.abs(delta) });
    case "manual_remove":
      return t("inventory.narrate.used", { who, item, range, n: Math.abs(delta) });
    case "manual_set":
      return t("inventory.narrate.set", { who, item, range });
    case "expiry_writeoff":
      return t("inventory.narrate.expired", { who, item, range });
    default:
      return t("inventory.narrate.generic", { who, item, range });
  }
}

function formatQty(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/\.?0+$/, "");
}

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Truck } from "lucide-react";
import {
  useInventoryItems,
  isLowStock,
  isOnOrder,
  type InventoryItem,
} from "@/lib/data/inventory";

function formatQty(quantity: number, _unit: string, unitLabel: string) {
  return `${quantity} ${unitLabel}`;
}

interface Props {
  familyId: string;
  /** When true, render an empty-state message instead of returning null. */
  showEmpty?: boolean;
}

export function ShoppingListCard({ familyId, showEmpty = false }: Props) {
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

  if (toOrder.length === 0 && onOrder.length === 0) {
    if (!showEmpty) return null;
    return (
      <section className="card-soft p-4 text-sm text-muted-foreground">
        {t("inventory.shoppingEmpty")}
      </section>
    );
  }

  return (
    <section className="card-soft p-4 space-y-3" id="shopping">
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

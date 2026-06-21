## Inventory page — plan

A new "Förråd" (Inventory) page where the owner and appointed **Material­ansvariga** can manage supplies. Checklist count-items link to inventory items and auto-decrement by 1 when a caregiver answers **Nej**.

### Navigation & access

- New route `src/routes/_authenticated/inventory.tsx`, sidebar entry "Förråd / Inventory" (i18n).
- Visible to all family members (read-only for caregivers without the role).
- **Write access** (add/edit/delete items, manual adjust, refill): family **owner** OR caregiver with the new `material_responsible` flag.

### "Material­ansvarig" role

- New boolean column `family_members.material_responsible` (default false).
- Owner manages this on the Caregivers page: each caregiver row gets a "Material­ansvarig" toggle.
- New helper `is_material_manager(_family_id, _user_id)` → `owner OR material_responsible`. Used by RLS on inventory tables.

### Units (fixed list, grouped)

Stored as enum `unit_kind`:
- **Count**: `pcs`, `box`, `pack`
- **Volume**: `ml`, `l`
- **Weight**: `g`, `kg`

UI shows them grouped in a Select. Display always renders `{quantity} {unit}` localized.

### Inventory item fields

- `name` (e.g. "Kompresslådor")
- `unit` (enum above)
- `quantity` (numeric, allows decimals for ml/g/kg)
- `low_stock_threshold` (numeric, optional) → red badge + page-level alert when `quantity ≤ threshold`
- `expiry_date` (date, optional) → amber when ≤ 30 days, red when expired
- `notes` (optional short text)
- `active` (soft hide)
- standard `created_by/at`, `updated_at`

### Checklist ↔ inventory link

- Add nullable `inventory_item_id` to `care_place_checklist_items` (only meaningful for `count` type).
- In CarePlaceCheckSettings, when editing a count item, owner picks an inventory item from a Select (or "None").
- On check submission, for each count answer where `yesno_value = false` AND item is linked, decrement that inventory item by **1 unit** (clamped at 0) and write an adjustment-log row.

### Adjustment history log

New table `inventory_adjustments`:
- `inventory_item_id`, `delta` (signed numeric), `reason` enum (`manual_set`, `manual_add`, `manual_remove`, `care_place_check`, `expiry_writeoff`), `note`, `performed_by`, `source_check_id` (nullable FK → `care_place_checks`), `created_at`.
- Shown as a collapsible "Historik" panel per item and a global "Recent activity" tab.

### UI layout (`/inventory`)

```text
┌─ Förråd ────────────────────────── [+ Lägg till] ┐
│ Alert: 3 items low · 1 expiring soon            │
│                                                  │
│ Filter: [All] [Low stock] [Expiring]  Sort: ▾   │
│                                                  │
│ ┌──────────────────────────────────────────┐    │
│ │ Kompresslådor          9 box   [Low!]    │    │
│ │ Exp: 2027-03-01                          │    │
│ │ [−1] [+1] [Set…] [Edit] [History ▾]      │    │
│ └──────────────────────────────────────────┘    │
│ … more cards …                                  │
└──────────────────────────────────────────────────┘
```

- Card grid on desktop, single column on mobile.
- Quick `−1 / +1` buttons (writes an adjustment); "Set…" opens a dialog to set exact quantity with required reason note.
- Banner at top summarizing low-stock and expiring items.
- Empty state explaining the page.

### Dashboard surface

Small low-stock chip on the dashboard ("3 supplies low") linking to `/inventory`. No noisy modal.

### Database migration

New enums: `unit_kind`, `inventory_adjustment_reason`.
New tables: `inventory_items`, `inventory_adjustments`.
Column adds: `family_members.material_responsible`, `care_place_checklist_items.inventory_item_id`.
New SECURITY DEFINER function: `is_material_manager(family_id, user_id)`.
RLS:
- Read: any family member.
- Write on `inventory_items` and `inventory_adjustments`: `is_material_manager`.
- Update `family_members.material_responsible`: owner only.
Standard GRANTs to `authenticated` + `service_role`. `set_updated_at` trigger on `inventory_items`.

### Server / data layer

- All reads/writes via the browser supabase client + React Query hooks (matches existing pattern in `care-place-checks.ts`).
- New file `src/lib/data/inventory.ts` with: `useInventoryItems`, `useUpsertInventoryItem`, `useDeleteInventoryItem`, `useAdjustInventory({itemId, delta, reason, note})`, `useInventoryHistory(itemId)`, `useLowStockSummary`.
- Decrement-on-Nej: extend `useSubmitCarePlaceCheck` to, after insert, loop linked Nej answers and call adjust with `reason='care_place_check'` + `source_check_id`. Done client-side in a single React Query mutation; clamp at 0.

### i18n

New `inventory` namespace in `en.ts` / `sv.ts`: page title, unit labels, action buttons, alerts, history reasons, role label "Material­ansvarig" / "Material responsible", validation messages.

### Files

- `supabase/migrations/<new>.sql` — enums, tables, columns, function, RLS, grants.
- `src/lib/data/inventory.ts` — hooks.
- `src/routes/_authenticated/inventory.tsx` — page.
- `src/components/carenest/InventoryItemCard.tsx`, `InventoryItemDialog.tsx`, `InventoryAdjustDialog.tsx`, `InventoryHistoryList.tsx`.
- `src/components/carenest/AppSidebar.tsx` — nav entry.
- `src/components/carenest/CarePlaceCheckSettings.tsx` — inventory link Select on count items.
- `src/lib/data/care-place-checks.ts` — extend submit to decrement linked items.
- `src/routes/_authenticated/caregivers.tsx` — Material­ansvarig toggle.
- `src/routes/_authenticated/dashboard.tsx` — low-stock chip.
- `src/lib/i18n/en.ts`, `src/lib/i18n/sv.ts`.

### Out of scope (later, if you want)

Categories/locations, supplier/reorder notes, barcode scan, CSV import, push notification on low stock.

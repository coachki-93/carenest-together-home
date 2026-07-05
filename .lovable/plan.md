## Feature: Maintenance page — revised plan

### Corrections about how the system actually works (before diving in)

You had it right on all four points, with one nuance:

- **Roles**: `family_members.role` is an enum (`member_role`) with `owner` and `caregiver`. Owners are also full members. `is_family_member(family_id, uid)` returns true for **any** row in `family_members` — including caregivers — so caregivers already get read access under our standard SELECT policy. `is_material_manager(family_id, uid)` = `role = 'owner' OR material_responsible = true`. So the desired split (caregivers can read + mark done, only managers can create/edit/delete) maps cleanly onto the existing helpers — no new role plumbing needed.
- **Today's page** (`/_authenticated/dashboard.tsx`) builds its task list in a single `useMemo` (around line 538) by merging: scheduled medication doses, appointment occurrences + completions, and vitals. It's derived at read time from the underlying data — no "tasks" table. Perfect fit for adding a "maintenance-due" kind derived from `maintenance_items`.
- **Live helpers used everywhere**: `private.is_family_member`, `public.is_material_manager`, and the standard SELECT-family-member / INSERT-with-manager / UPDATE-with-manager / DELETE-with-manager pattern. Migration will follow this exactly.

Everything else you described matches the codebase.

---

### 1. Atomic "mark done"

Replaced the two-write client mutation with a single Postgres RPC:

```sql
CREATE FUNCTION public.mark_maintenance_done(
  _item_id uuid,
  _note text DEFAULT NULL
) RETURNS uuid  -- returns the new log row id
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_family uuid;
  v_log_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT family_id INTO v_family
    FROM public.maintenance_items WHERE id = _item_id;
  IF v_family IS NULL THEN RAISE EXCEPTION 'Item not found'; END IF;
  IF NOT public.is_family_member(v_family, v_uid) THEN
    RAISE EXCEPTION 'Not a family member';
  END IF;

  INSERT INTO public.maintenance_logs
    (maintenance_item_id, family_id, performed_by, note)
    VALUES (_item_id, v_family, v_uid, _note)
    RETURNING id INTO v_log_id;

  UPDATE public.maintenance_items
    SET last_done_at = now(), last_done_by = v_uid, updated_at = now()
    WHERE id = _item_id;

  RETURN v_log_id;
END $$;

REVOKE ALL ON FUNCTION public.mark_maintenance_done(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_maintenance_done(uuid, text) TO authenticated, service_role;
```

Chose RPC over a trigger because the RPC also enforces the "must be a family member" check up-front and lets us return the log id in one round trip. Client calls `supabase.rpc("mark_maintenance_done", { _item_id, _note })`. Both the Maintenance page and Today's page use `useMarkMaintenanceDone()` which wraps this RPC.

### 2. `machine_type` — DB stays free text, UI presents presets

- DB: `machine_type text NOT NULL` (unchanged).
- Client writes a stable slug (`'respiratory' | 'feeding' | 'suction' | 'oxygen' | 'monitoring' | 'other'`) or a free-text string when a user picks "Other" and types one in.
- i18n renders the slug via `t(\`maintenance.type.\${slug}\`)` when it matches a known preset, otherwise renders the raw string.
- No enum, no migration lock-in — families that later need a new preset just get a new i18n key, no schema change.

### 3. Caregiver access & RLS (final policies)

Both caregivers and owners can read and mark done. Only material managers (owner or `material_responsible = true`) can add/edit/delete/archive machines and maintenance items. Logs are immutable.

**`public.machines`**
- SELECT: `is_family_member(family_id, auth.uid())` ✅ caregivers included.
- INSERT: `is_material_manager(family_id, auth.uid()) AND created_by = auth.uid()`.
- UPDATE: `is_material_manager(...)` (using + with check).
- DELETE: `is_material_manager(...)`.

**`public.maintenance_items`** — same four policies as `machines`.

**`public.maintenance_logs`**
- SELECT: `is_family_member(family_id, auth.uid())` ✅ caregivers see history.
- INSERT: `is_family_member(family_id, auth.uid()) AND performed_by = auth.uid()` — any caregiver can log a completion. (The RPC is the canonical path; direct inserts stay blocked to non-members.)
- No UPDATE policy.
- DELETE: `is_family_owner(family_id, auth.uid())` only, so audit trail stays intact except for owner-driven cleanup.

**GRANTs**: `authenticated` = SELECT/INSERT/UPDATE/DELETE on all three (RLS gates the rest); `service_role` = ALL. No `anon`.

**UI mirror**: `useMyMembership()` already exposes role + `material_responsible`. A `canManageMaintenance = membership.role === 'owner' || membership.material_responsible === true` helper hides add/edit/delete/archive buttons for caregivers. Mark-done and history are always visible.

### 4. Today's page integration — derived, not persisted

Add a new task kind alongside `dose | appt | vital` in `dashboard.tsx`:

```ts
type TaskSource =
  | { kind: "dose"; dose: ScheduledDose }
  | { kind: "appt"; appt: ExpandedAppointment; completion?: AppointmentCompletion }
  | { kind: "vital"; vital: Vital }
  | { kind: "maintenance"; item: MaintenanceItem; machine: Machine };  // NEW
```

New hook `useDueMaintenanceItems(familyId)` in `src/lib/data/maintenance.ts`:

```ts
// pseudo
const items = await supabase
  .from("maintenance_items")
  .select("*, machine:machines!inner(id,name,active,family_id)")
  .eq("family_id", familyId)
  .eq("active", true)
  .not("interval_days", "is", null);   // "as needed" never appears on Today

// client-side filter using the same pure helper the Maintenance page uses:
return items.filter(i => {
  const s = maintenanceStatus(i, now);
  return s === "overdue" || (s === "due_soon" && isDueToday(i, now));
});
```

Where `isDueToday(item, now)` returns true when `nextDueAt(item) <= endOfToday(now)`. So:

- Filter, 7-day interval, last done **June 28** → `nextDueAt` = **July 5** → shows on July 5 as *Due today*.
- Not marked → July 6 onward it stays visible marked **Overdue** until completed.
- Marked done July 5 → resets, next shows July 12.

The dashboard `useMemo` merges these into the same `tasks` array. Rendering:
- Icon: `Wrench` from `lucide-react`.
- Title: `${machine.name} — ${item.name}`.
- Status pill: "Due today" / "Overdue" (red).
- Action: single "Mark done" button using `useMarkMaintenanceDone()` (same RPC → same cache invalidation → Maintenance page updates instantly).
- Clicking the row navigates to `/maintenance` and (nice-to-have) scrolls to that item; safe first pass is just navigate.

`useMarkMaintenanceDone` invalidates: `["maintenance-items"]`, `["maintenance-machines"]`, `["maintenance-history", itemId]`, `["maintenance-due", familyId]`. That keeps both views consistent.

### 5. Dashboard summary card

Deferred. `useMaintenanceSummary(familyId)` will still be shipped in `src/lib/data/maintenance.ts` (returns `{ overdueCount, dueSoonCount }`), unused for now, so wiring the card later is a one-file change.

### 6. Approved as originally proposed

- Tables/columns: `machines`, `maintenance_items` (with `scope`, nullable `interval_days`, `last_done_at`, `last_done_by`, `active`), `maintenance_logs` (immutable).
- Denormalized `family_id` on items and logs for fast RLS.
- Soft-delete via `active` on both machines and items; hard delete allowed for managers.
- `DUE_SOON_DAYS = 7`.
- Indexes: `machines(family_id, active)`, `maintenance_items(machine_id)`, `maintenance_items(family_id, active, interval_days)` (helps Today's filter), `maintenance_logs(maintenance_item_id, performed_at desc)`.
- `updated_at` triggers via existing `public.set_updated_at()`.

### Route, components, i18n

Unchanged from the previous plan except:
- `useMarkMaintenanceDone` wraps the RPC.
- `canManageMaintenance` gates add/edit/delete/archive UI on the page.
- New i18n keys: `maintenance.type.respiratory|feeding|suction|oxygen|monitoring|other`, `maintenance.dueToday`, `maintenance.overdue`, plus everything from the earlier list.
- Sidebar entry uses `Wrench` icon, added to the **Care** group after **Inventory**, added to both English and Swedish `nav.maintenance`.

### Out of scope (unchanged)

Push notifications, photo attachments, warranty/expiry on the machine itself, dashboard summary tile (deferred, ready to wire).

---

### Rollout order

1. **This turn: database migration only.** Three tables + policies + GRANTs + indexes + `updated_at` triggers + `mark_maintenance_done` RPC. Shown for review before running.
2. After migration approval: data hooks (`src/lib/data/maintenance.ts`), Maintenance route + components, i18n keys, sidebar entry.
3. Today's page integration (new task kind + hook).
4. (Later) dashboard summary card.

I'll now prepare the migration and surface it for you to review before running.

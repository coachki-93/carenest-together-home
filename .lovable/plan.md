# Plan: Inventory + Care Place Control v2

Your six points reframe this from "track stock better" to "make the system notice and tell the right person, in the right tone, at the right time." I'm reorganizing around that.

I'll group the work into three stages so we can stop or re-prioritize between them. Stage 1 covers your highest-signal items (severity, missed checks, ordered status, readable history). Stage 2 closes the inventory↔checklist loop. Stage 3 adds the flexible question shapes and the workflow polish from earlier (shopping list, locations, supplier).

---

## Stage 1 — Signal, not noise

### 1A. Severity per checklist question (your #1)
Every checklist item gets a **severity**: `routine` (default) or `critical`.
- Owner picks it when creating/editing the question in Care Place Control Settings.
- A "Nej" on a `critical` item triggers an **immediate push notification to the owner and any material ansvarig** ("⚠️ Anna reported 08:00: Syrgastub är inte full"), regardless of inventory link.
- The check itself still saves normally; the alert is additive.
- Critical questions render with a red border in the checklist dialog so caregivers feel the weight.
- Reuses the existing `push_subscriptions` infrastructure.

### 1B. Missed-check detection + notification (your #3)
Today a slot stays "pending" forever inside its 30-minute window and then silently vanishes. Instead:
- A scheduled job runs every ~5 minutes and looks at care_place_check_times whose window closed ≥ grace period ago with no `care_place_checks` row for today.
- Owner-configurable **grace period** per family (default 30 min after the window ends).
- When tripped: writes a `missed` marker (new `status` column on `care_place_checks` OR a small `care_place_missed_checks` table — I'll use a marker table to keep audit clean) and sends one push to the owner + material ansvarig: "⚠️ 13:00-kontrollen missades idag."
- Dashboard shows today's missed checks as a separate red strip above the normal banner.
- Implementation: pg_cron calling a public webhook at `/api/public/hooks/care-place-missed-sweep` that verifies a shared secret and dispatches notifications.

### 1C. "Already ordered" state (your #5)
New optional fields on `inventory_items`:
- `ordered_at timestamptz`
- `expected_at date`
- `ordered_by uuid` (member who marked it)

Behavior:
- A low-stock item with `ordered_at` set renders as **blue "Beställd, väntas {date}"** instead of red, and is excluded from the dashboard's red low-stock count (moved to a quieter "On order" sub-section).
- When a `received` adjustment (see 1D / Stage 3) lands, ordered fields auto-clear.
- "Mark ordered" button on each low item; "Edit expected date" in the dialog.

### 1D. Narrated history (your #6)
Adjustments get an automatic human sentence at render time, not stored — keep the raw data, format on display:
- Joins `performed_by` → profile name, `source_check_id` → slot time, `reason` → verb, and existing `note`.
- Example outputs:
  - "Anna flaggade lågt vid 08:00-kontrollen — Handskar gick från 12 → 11."
  - "Erik fyllde på efter inköp — Sond­sprutor gick från 2 → 20."
  - "Systemet justerade efter borttagen kontroll — Kompresser gick från 5 → 6."
- Applied in the item History dialog AND in a new **"Recent activity"** card on the inventory page top (last 10 events across all items, family-wide).
- The narration helper lives in `src/lib/data/inventory-narrate.ts` and reads quantity-before/after by walking deltas — already possible from the audit log.

---

## Stage 2 — Two-way loop between checklist and inventory (your #2)

### 2A. Checklist surfaces current shortages
When the checklist dialog opens at a scheduled slot:
- For each question linked to an inventory item, look up live stock.
- If stock is **already at/below threshold**, the question renders with an amber "⚠️ Redan lågt: 8 kvar (gräns 10)" strip above the Yes/No buttons.
- Caregiver still answers normally, but they're primed and the "No" answer is pre-selected (they can override).

### 2B. Ad-hoc spot-check from low stock
When any inventory item drops below threshold (whether by scheduled check, manual −1, or "Mark used" outside a round):
- The dashboard shows a small **"Add to next round"** action on that low-stock item.
- Clicking it creates a transient `ad_hoc` question attached to the very next scheduled slot only (lives in a new `care_place_adhoc_items` table with a `for_slot_date`/`for_slot_time` pointer; auto-expires after that slot).
- Owner can also dismiss it.
- Caregiver sees the question appear in the next checklist with a "Akut tillagd" badge.

This closes the loop: shortages discovered outside a round still get verified at the next one, instead of waiting for the *scheduled* question to come around.

---

## Stage 3 — Right shape, right place

### 3A. Question types (your #4)
Extend `care_place_item_type` enum from `yesno | count` to:
- `yesno` — current behavior.
- `count` — current "how many?" with min.
- `days_left` — caregiver enters an estimate in days ("~3 dagar kvar"); triggers a critical-style alert if below an owner-set threshold (default 2). Good for formula, feeding bags, oxygen consumables.
- `quantity_estimate` — three-button quick pick: **Mycket / Lite / Slut** (much / little / empty). Lower friction than a number when nobody's going to actually count.

Each linked to inventory if relevant. `days_left` doesn't decrement stock; it overwrites a new `days_left_estimate` field on the item that the dashboard can display alongside quantity.

### 3B. Workflow polish (from previous plan, kept brief)
- **Shopping list tab** — auto-populates from low-stock + manual adds + "ordered but not received yet" section.
- **Location + supplier/order URL** on items — re-order link button straight from low-stock rows.
- **"Mark received"** dialog (the inverse of −1) with a new `received` audit reason.
- **Smarter checklist decrement**: instead of always −1 on "Nej", use `max(decrement_amount, min_count − reported_count)` so the audit reflects what was actually used.

---

## Technical details (skip if not interested)

**Schema changes (one migration):**
- `care_place_checklist_items`: + `severity` (enum `routine|critical`, default `routine`), + `decrement_amount` (int default 1)
- `care_place_check_times`: + `grace_minutes` (int default 30)
- `care_place_checks`: + `status` (enum `completed|missed`, default `completed`)
- New table `care_place_adhoc_items` (family_id, item_id, for_slot_date, for_slot_time, created_by, created_at)
- `inventory_items`: + `location`, `supplier`, `supplier_url`, `ordered_at`, `expected_at`, `ordered_by`, `days_left_estimate`
- `inventory_adjustment_reason` enum: + `received`, + `days_left_update`
- `care_place_item_type` enum: + `days_left`, + `quantity_estimate`

**Server pieces:**
- `src/routes/api/public/hooks/care-place-missed-sweep.ts` — pg_cron-triggered endpoint, HMAC-verified, scans missed slots, writes `missed` markers, dispatches pushes.
- Reuses existing `push_subscriptions` + dispatch helpers from `dispatch-task-notifications.ts`.
- Critical "Nej" notifications: triggered inside `useSubmitCarePlaceCheck` via a new `notify_critical_no` server fn (so the bearer/role check happens server-side).

**Frontend:**
- `inventory-narrate.ts` — pure function `(adjustments, members, checks) → string[]`.
- `CarePlaceCheckBanner.tsx` — render shortage strip + ad-hoc questions + critical styling.
- `CarePlaceCheckSettings.tsx` — severity selector, question-type selector, grace period.
- `inventory.tsx` — Recent activity card, ordered state UI, days-left badge.
- `dashboard.tsx` — missed-check strip, "Add to next round" on low items.

All new strings via `t()` in both `en.ts` and `sv.ts`.

---

## What I'd build first if you say "go"

Just Stage 1 (severity + missed-check + ordered state + narrated history). It's the part that changes the system's *behavior* rather than adding fields, and each piece is independently shippable. Stages 2 and 3 build cleanly on top once Stage 1 is live.

Reply **"Implement Stage 1"** to start, or tell me to reshuffle the order.

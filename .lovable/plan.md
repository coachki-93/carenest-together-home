# Admin support diagnostics (read-only)

Notification-subscription health, recent send-attempts, and last-active for a looked-up family. No schema changes, no writes.

## Files

| File | Change |
| --- | --- |
| `src/lib/data/analytics-admin.functions.ts` | NEW fn `adminGetFamilyDiagnostics({ familyId })` |
| `src/routes/_authenticated/admin.tsx` | Diagnostics block inside the existing `AccountDetailDialog` (per membership, enabled only while open) |
| `src/lib/i18n/en.ts`, `src/lib/i18n/sv.ts` | `admin.analytics.diag.*` labels + honesty note |
| `scripts/check-admin-minimization.sh` | Narrow, documented exception so the diagnostics fn may read timestamp-only columns |

## 1. Server function

Same contract as the rest of the module: `createServerFn` + `requireSupabaseAuth` → `assertCallerIsPlatformAdmin` on the caller's RLS client → `supabaseAdmin` → explicit columns → one `admin_audit_log` row with `target_family_id`. Strictly read-only.

Returns:

- `members[]` — from `family_members(user_id)` + `profiles(id, full_name)` joined with `push_subscriptions(user_id, user_agent, created_at, last_seen_at)`: `{ userId, name, hasPush, devices: [{ userAgent, createdAt, lastSeenAt }] }`
- `recentAttempts[]` — last 20 `appointment_notifications(appointment_id, occurrence_at, pass, notified_at)` for the family's appointment ids (ids fetched with `appointments.select("id").eq("family_id", …)`), sorted `notified_at` desc
- `lastActiveAt` — max of: latest `push_subscriptions.last_seen_at`, latest `vitals.logged_at`, latest `care_events.occurred_at`, latest `handovers.created_at`, each fetched as a single `order(...).limit(1)` row selecting only that one timestamp column

No health content is read — only `id`/timestamp columns used to compute one "last active" datetime.

## 2. Minimization guard

`check-admin-minimization.sh` currently forbids `push_subscriptions`, `vitals`, `care_events`, `handovers`, `appointments`, `maintenance_logs`-style names in every guarded file. The diagnostics fn must name four of them, so the script gets a per-file exception list (mirroring the existing `BUG_TABLE_OWNER` pattern):

```
DIAG_OWNER="src/lib/data/analytics-admin.functions.ts"
DIAG_ALLOWED=(push_subscriptions vitals care_events handovers appointments)
```

skipped only for that file, with a comment stating the contract: these tables may be referenced **only** for existence/timestamp columns, never for content columns. `admin.functions.ts` stays fully locked — no drift there. Everything else (no `select("*")`, rpc gate) still applies to the diagnostics file.

## 3. UI

Inside `AccountDetailDialog`, next to the existing subscription block, a `Diagnostics` section per family membership:

- **Last active** — relative time
- **Push subscriptions** — one row per member: name, registered / not registered badge, device string (truncated user agent), last seen relative
- **Recent notification attempts** — compact list of `pass` + occurrence/notified time, max 20, scrollable
- **Honesty note** (muted, always visible): "Shows subscription state and what was sent. Web push has no delivery receipt — this cannot confirm a notification reached the device." / sv: "Visar prenumerationsstatus och vad som skickats. Webbpush saknar leveranskvitto — detta kan inte bekräfta att en notis nådde enheten."

Query uses `useServerFn` + `useQuery` with `enabled: open`.

## 4. i18n

`admin.analytics.diag.*` in en + sv, exact parity, natural Swedish.

## Verify

`bash scripts/check-admin-minimization.sh` green, en/sv parity, `tsgo --noEmit`, live query cross-check of the diagnostics payload against the DB, and an audit-log row with the right `target_family_id`.

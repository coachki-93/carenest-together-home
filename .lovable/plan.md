# Admin support diagnostics (read-only) — revised

Notification-subscription health, recent send-attempts, and last-active for a looked-up family. No schema changes to tables; two read-only SQL functions. No writes, no CI exception for health tables.

## Files

| File | Change |
| --- | --- |
| migration | NEW `public.family_last_active()` + `public.family_notification_attempts()` (both SECURITY DEFINER, read-only) |
| `src/lib/data/analytics-admin.functions.ts` | NEW fn `adminGetFamilyDiagnostics({ familyId })` |
| `src/routes/_authenticated/admin.tsx` | Diagnostics block in the existing `AccountDetailDialog`, enabled only while open |
| `src/lib/i18n/en.ts`, `src/lib/i18n/sv.ts` | `admin.analytics.diag.*` labels + honesty note |
| `scripts/check-admin-minimization.sh` | Narrow per-file allow-list: `push_subscriptions`, `appointment_notifications` only, plus the two new RPC names |

## 1. Migration (shown before applying)

```sql
-- Last-active timestamp for a family. Reads health tables under definer
-- rights but returns ONLY a timestamptz — never any content column.
CREATE OR REPLACE FUNCTION public.family_last_active(_family_id uuid)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(
    (SELECT max(last_seen_at) FROM public.push_subscriptions WHERE family_id = _family_id),
    (SELECT max(logged_at)    FROM public.vitals            WHERE family_id = _family_id),
    (SELECT max(occurred_at)  FROM public.care_events       WHERE family_id = _family_id),
    (SELECT max(created_at)   FROM public.handovers         WHERE family_id = _family_id)
  );
$$;

REVOKE ALL ON FUNCTION public.family_last_active(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.family_last_active(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.family_last_active(uuid) TO service_role;

-- Recent notification send-ATTEMPTS for a family. Joins appointments only to
-- scope by family_id; returns delivery metadata only (no title/notes/child).
CREATE OR REPLACE FUNCTION public.family_notification_attempts(_family_id uuid, _limit int DEFAULT 20)
RETURNS TABLE(occurrence_at timestamptz, pass text, notified_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT n.occurrence_at, n.pass, n.notified_at
  FROM public.appointment_notifications n
  JOIN public.appointments a ON a.id = n.appointment_id
  WHERE a.family_id = _family_id
  ORDER BY n.notified_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 100);
$$;

REVOKE ALL ON FUNCTION public.family_notification_attempts(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.family_notification_attempts(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.family_notification_attempts(uuid, int) TO service_role;
```

Both are `STABLE`, read-only, and return only timestamps / the `pass` label. `family_last_active` exposes a single `timestamptz`. Neither returns a content column. The second one exists so the admin file never names `appointments` either — only `appointment_notifications` in the RPC name.

Note: these are `authenticated`-executable, but the only caller is the admin fn, which is platform-admin gated before it runs. The functions leak nothing beyond "when was this family last active" / "when did we try to send".

## 2. Server function

`adminGetFamilyDiagnostics({ familyId })` in `analytics-admin.functions.ts`, same contract as the rest of the module: `requireSupabaseAuth` → `assertCallerIsPlatformAdmin` on the caller's RLS client → `supabaseAdmin` → explicit columns → one `admin_audit_log` row with `target_family_id`. Read-only.

Returns:

- `members[]` — `family_members(user_id)` + `profiles(id, full_name)` joined with `push_subscriptions(user_id, user_agent, created_at, last_seen_at)`: `{ userId, name, hasPush, devices: [{ userAgent, createdAt, lastSeenAt }] }`
- `recentAttempts[]` — `supabaseAdmin.rpc("family_notification_attempts", { _family_id, _limit: 20 })`
- `lastActiveAt` — `supabaseAdmin.rpc("family_last_active", { _family_id })`

`vitals`, `care_events`, `handovers`, `appointments` are never named in this file.

## 3. CI minimization

`check-admin-minimization.sh` gets a narrow, documented per-file allow-list (same shape as the existing `BUG_TABLE_OWNER`):

```
DIAG_OWNER="src/lib/data/analytics-admin.functions.ts"
DIAG_ALLOWED=(push_subscriptions)   # delivery/device metadata, not health content
```

`appointment_notifications` isn't on the deny-list today; it gets added to the deny-list and to `DIAG_ALLOWED` so the intent is explicit rather than accidental. `vitals`, `care_events`, `handovers`, `appointments` stay forbidden everywhere — including this file. `admin.functions.ts` keeps zero exceptions.

The rpc gate widens from "only `is_platform_admin`" to an explicit allowed set (`is_platform_admin`, `family_last_active`, `family_notification_attempts`); any other `.rpc(` still fails.

Regression check: temporarily insert `.from("vitals")` into the diagnostics file and confirm the script exits 1, then revert.

## 4. UI + i18n

`Diagnostics` section inside `AccountDetailDialog`, per family membership:

- **Last active** — relative time
- **Push subscriptions** — per member: name, registered / not-registered badge, truncated device string, last seen relative
- **Recent notification attempts** — compact list of `pass` + times, max 20, scrollable
- **Honesty note** (muted, always visible) — en: "Shows subscription state and what was sent. Web push has no delivery receipt — this cannot confirm a notification reached the device." / sv: "Visar prenumerationsstatus och vad som skickats. Webbpush saknar leveranskvitto — detta kan inte bekräfta att en notis nådde enheten."

`useServerFn` + `useQuery` with `enabled: open`. No write actions anywhere in the block.

`admin.analytics.diag.*` keys in en + sv, exact parity, natural Swedish.

## Verify

Diagnostics file names no health-content table; `family_last_active` returns only a timestamptz; `check-admin-minimization.sh` green and still fails when a health table is injected; admin-gated + audit-logged with `target_family_id`; en/sv parity; `tsgo --noEmit` clean; live cross-check of the payload against the DB.

# Bug reports: user submission + admin triage

## 1. Migration

New file `supabase/migrations/<timestamp>_bug_reports.sql` (standard timestamp naming).

Confirmed helper signature (from migration `20260726213148…`): `public.is_platform_admin(_uid uuid) returns boolean`, SECURITY DEFINER, EXECUTE granted to `authenticated` + `service_role`. Policies use `public.is_platform_admin(auth.uid())` exactly.

```sql
CREATE TABLE IF NOT EXISTS public.bug_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  reporter_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  family_id       UUID REFERENCES public.families(id) ON DELETE SET NULL,
  submitter_email TEXT,
  page_context    TEXT,
  body            TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','resolved')),
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS bug_reports_status_created_idx
  ON public.bug_reports (status, created_at DESC);

-- Data API grants (required; RLS alone is not enough)
GRANT SELECT, INSERT, UPDATE ON public.bug_reports TO authenticated;
GRANT ALL ON public.bug_reports TO service_role;

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bug_reports_insert_self" ON public.bug_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "bug_reports_select_admin" ON public.bug_reports
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "bug_reports_update_admin" ON public.bug_reports
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- No DELETE policy, no DELETE grant: resolve-only, audit trail preserved.
```

### Convention flags (not worked around silently)
- **GRANTs added.** Your SQL had none. On this stack PostgREST needs explicit grants or every call fails with a permission error. Added `SELECT, INSERT, UPDATE` for `authenticated` (RLS still narrows SELECT/UPDATE to admins) and `ALL` for `service_role`. No `DELETE` grant.
- **Index added** for the admin list (status filter + newest-first). Purely additive.
- **No `updated_at`/trigger.** Project convention adds them, but this table is append-plus-status-only; `resolved_at` covers it. Say the word if you want the standard pair.
- Anon gets nothing.

## 2. User-facing "Report a bug" (Settings)

- New `src/components/carenest/ReportBugCard.tsx`: card in the **Your account** block of `src/routes/_authenticated/settings.tsx` (after Help & onboarding, before Sign out). Textarea (required, 1–5000 chars, counter), submit, success confirmation state.
- Insert goes through the caller's RLS-scoped browser client (`supabase.from("bug_reports").insert(...)`) — no server fn needed, matching how other user-side writes work.
- Auto-populated: `reporter_id` = session user id, `family_id` = active membership family, `submitter_email` = session user email, `page_context` = the route the user came from (previous router location, falling back to `/settings`).

## 3. Admin tab

- `src/lib/data/bug-admin.functions.ts` (new): `adminListBugReports` (status filter, newest first, explicit columns) and `adminUpdateBugReportStatus` (`read` / `resolved`; sets `resolved_at` when resolved, clears it otherwise). Both: `requireSupabaseAuth` → `assertCallerIsPlatformAdmin` via the caller's RLS client → then `supabaseAdmin` → one `admin_audit_log` row per view/action. No `select("*")`, no delete path.
- `src/components/carenest/AdminBugReports.tsx`: list + status filter (all/new/read/resolved) + "Mark read" / "Mark resolved" buttons.
- `src/routes/_authenticated/admin.tsx`: extend `AdminTab` union with `"bugs"`, `validateSearch`, title map, render branch.
- `src/components/carenest/AdminSidebar.tsx`: new nav item (Bug icon), plus its local tab union.

## 4. CI guard

`admin.functions.ts` will not reference `bug_reports`. I'll also add `bug_reports` to the deny-list in `scripts/check-admin-minimization.sh` for `admin.functions.ts` — but that script checks **both** files, so `bug-admin.functions.ts` (which must name the table) would fail. Fix: make the deny-list per-file — the shared health list applies to both, plus `bug_reports` only to `admin.functions.ts`; `bug-admin.functions.ts` keeps the `select("*")` and rpc checks.

## 5. i18n

New keys under `settings.bugReport.*` and `admin.bugs.*` (+ `admin.nav.bugs`) in both `en.ts` and `sv.ts`, exact parity.

## File list
- `supabase/migrations/<ts>_bug_reports.sql` (new)
- `src/lib/data/bug-admin.functions.ts` (new)
- `src/components/carenest/AdminBugReports.tsx` (new)
- `src/components/carenest/ReportBugCard.tsx` (new)
- `src/routes/_authenticated/admin.tsx`
- `src/routes/_authenticated/settings.tsx`
- `src/components/carenest/AdminSidebar.tsx`
- `scripts/check-admin-minimization.sh`
- `src/lib/i18n/en.ts`, `src/lib/i18n/sv.ts`

## Verification
Migration applies clean; RLS spot-check that a non-admin SELECT returns nothing; submit flow writes the auto-populated row; admin tab lists and transitions status; `bash scripts/check-admin-minimization.sh` green; `tsgo --noEmit` clean.

Out of scope, as specified: email notifications, marketing contact form.

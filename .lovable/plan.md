# L3 Admin Analytics tab (v1: numbers + lists)

Read-only subscription/revenue aggregates for the platform owner. No new tables, no charts.

## Files

| File | Change |
| --- | --- |
| `src/lib/data/analytics-admin.functions.ts` | NEW — `adminGetSubscriptionAnalytics` + `adminGetFamilySubscription` |
| `src/components/carenest/AdminAnalytics.tsx` | NEW — stat cards + short lists |
| `src/routes/_authenticated/admin.tsx` | Add `analytics` to `AdminTab` union + render; show subscription block in account detail |
| `src/components/carenest/AdminSidebar.tsx` | Add "Analytics" nav item (BarChart3 icon) + activeTab union |
| `src/lib/i18n/en.ts`, `src/lib/i18n/sv.ts` | `admin.analytics.*` + `admin.nav.analytics` |
| `scripts/check-admin-minimization.sh` | Add the new file to `FILES` so it's guarded too |

## 1. Server function

New module (kept out of `admin.functions.ts` to preserve the minimization contract, mirroring bug-admin / billing-admin). Same pattern: `createServerFn` + `requireSupabaseAuth`, `assertCallerIsPlatformAdmin` against the caller's RLS client BEFORE `supabaseAdmin`, explicit columns only, one `admin_audit_log` write per call.

`adminGetSubscriptionAnalytics()` reads `family_subscriptions` (`family_id, status, plan, trial_ends_at, current_period_end, cancel_at_period_end, created_at, stripe_customer_id, stripe_subscription_id`) plus `families` (`id, name, founding_member`) and aggregates in JS:

- counts by status: active / trialing / canceled / past_due / none
- among active: founding vs standard (from `families.founding_member`)
- `mrrSek = activeFounding * 199 + activeStandard * 299`; `arrSek = mrrSek * 12`
- signups last 30d (count of `created_at >= now-30d`)
- trials ending next 7d: count + list `{ familyId, familyName, trialEndsAt }`
- scheduled cancels (`cancel_at_period_end = true`): count + list `{ familyId, familyName, currentPeriodEnd }`

Lists capped at 50 and sorted by date. Strictly read-only.

`adminGetFamilySubscription({ familyId })` — support lookup: status, plan, `stripe_customer_id`, `stripe_subscription_id`, `current_period_end`, `trial_ends_at`, `cancel_at_period_end`. Also audit-logged with `target_family_id`.

## 2. Analytics tab

`AdminAnalytics.tsx`, styled like the other sections (`card-soft`, `useServerFn` + `useQuery`):

- Row of stat cards: MRR, ARR, active, trialing, past due, canceled, founding/standard split, signups (30d)
- Two small tables: trials ending within 7 days; scheduled cancellations with period end
- Loading spinner / error text conventions copied from `FamiliesSection`

Route gate is unchanged — the whole `/admin` page already bails unless `useIsAdmin()` is true, and the server fn re-checks.

## 3. Per-family subscription in account lookup

Reuse the existing `AccountDetailDialog`: for each membership the account has, render a compact subscription block fed by `adminGetFamilySubscription` (query enabled only while the dialog is open). No new search UI.

## 4. i18n

`admin.analytics.*` in en + sv, exact parity, natural Swedish (Analys, Aktiva, Provperioder, Uppsägningar…). Currency shown as `kr`.

## Verify

`bash scripts/check-admin-minimization.sh` green, en/sv parity, `tsgo --noEmit`, live query cross-check of counts/MRR against the DB.

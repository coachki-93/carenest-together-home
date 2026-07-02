
# CareNest Site & Infrastructure Audit

Full audit complete. Below are 19 findings, prioritized. The plan is to fix them in the order shown so the highest-impact issues (iOS push, a public security hole, and cron correctness) land first.

## Critical

**C-1 · iOS push broken: permission asked before service worker is ready**
`src/lib/push/use-push-subscription.ts` calls `Notification.requestPermission()` on line 68, then registers the SW on lines 74–76. iOS 16.4+ Safari requires the opposite order: the SW must be registered and `navigator.serviceWorker.ready` must resolve *before* `requestPermission()`. This is almost certainly why iOS never subscribes.
**Fix:** Register + await `ready` first, then request permission, then subscribe.

**C-2 · Manifest missing `id` — installed iOS PWA identity is fragile**
`public/manifest.webmanifest` has no `"id"` field. iOS derives an implicit ID from `start_url`; any future change orphans push subscriptions on installed devices.
**Fix:** Add `"id": "/"`.

**C-3 · Cron endpoints authenticated with the public anon key**
`dispatch-task-notifications.ts`, `oxygen-low-sweep.ts`, `care-place-missed-sweep.ts` all check `apikey === SUPABASE_PUBLISHABLE_KEY`. That key ships in every browser bundle — anyone can trigger push fan-out to every family.
**Fix:** Add a `CRON_SECRET` secret, verify a custom header (e.g. `x-cron-secret`) against it, and update the pg_cron HTTP calls to send it. Ask you for the value or generate one.

## High

**H-1 · Push `notificationclick` navigates the wrong window**
`public/push-sw.js` navigates the first available client regardless of URL, disrupting a user mid-flow. Fix: prefer a client already on the target URL, else open a new window.

**H-2 · `dispatch-task-notifications` fetches unbounded past appointments**
PASS 2 (late) and PASS 3 (missed) query with no lower time bound. Adds hundreds of Supabase round-trips per cron tick as data grows. Fix: `.gte("starts_at", now - 7 days)`.

**H-3 · PASS 3 missing `all_day` filter** — all-day events accumulate false "missed" pushes. Fix: add `.eq("all_day", false)`.

**H-4 · Oxygen-low sweep ignores "at hospital" families** — they still get low-tank pushes while the tank is paused. Fix: skip families where `at_hospital_since IS NOT NULL`, mirroring the care-place sweep.

**H-5 · `getRegistration("/push-sw.js")` uses the script URL, not the scope**
Works today by accident. Fix: pass `"/"` at all three call sites so `disable()` always finds the registration.

## Medium

- **M-1** Hardcoded English diagnostic strings in `EnableNotificationsCard.tsx` — move through `t()` in both `en.ts` and `sv.ts`.
- **M-2** `CarePlaceCheckSettings.tsx` trash buttons missing `aria-label` — add `t("common.delete")`.
- **M-3** `care-place-missed-sweep.ts` adds a hardcoded 30 min *on top of* `grace_minutes`, doubling the intended grace. Fix: remove the constant; `grace_minutes` is the total post-slot grace.
- **M-4** Misleading comment in `src/lib/oxygen/tanks.ts` — cosmetic only.
- **M-5** `DashboardLayout.tsx` uses `min-h-screen`; switch to `min-h-dvh` so installed iOS PWA doesn't overflow.
- **M-6** Client-side `supabase.auth.getUser()` in the auth guard causes a brief unauthenticated flash. Document as a known tradeoff; no code change unless you want SSR auth.

## Low

- **L-1** Push `badge` uses the full-colour 192 icon — swap for a monochrome 72×72 (I'll generate one).
- **L-2** `hasCompletion()` uses a hand-rolled cast chain — replace with the typed `supabaseAdmin` client.
- **L-3** Duplicate `<meta description>` and `og:description` in `__root.tsx` — remove the extras.
- **L-4** `src/components/ui/sidebar.tsx` hardcodes `<SheetTitle>Sidebar</SheetTitle>` — wrap in VisuallyHidden.
- **L-5** `src/lib/data/emergency-steps.ts` uses `(supabase as any)` although types exist — drop the cast.

## Execution order

1. **C-1, C-2, H-1, H-5, L-1** — one push/PWA pass (fixes iOS end-to-end).
2. **C-3** — introduce `CRON_SECRET`, update three hooks + pg_cron jobs. I'll ask you to approve a generated secret.
3. **H-2, H-3, H-4, L-2** — cron correctness/perf sweep.
4. **M-3** — care-place grace fix (behaviour change; confirms in-hospital flow).
5. **M-1, M-2, M-5, L-3, L-4, L-5** — a11y + i18n + cleanup sweep.
6. **M-4, M-6** — cosmetic/doc; skip unless you want them.

## Verification

After each batch I'll:
- run `tsgo` + build,
- for push: drive the preview in Playwright (Chromium, service-worker-friendly) and confirm registration + `pushManager.getSubscription()` returns non-null after enable,
- for cron: `stack_modern--invoke-server-function` on the three hook paths with and without the new secret to prove they 401 without it and 200 with it,
- for RLS-touching changes: read back with `supabase--read_query` on the affected tables.

## Not in scope for this pass

- Rebuilding the auth guard to be SSR-aware (M-6).
- The 10 `warn` security-linter findings about SECURITY DEFINER functions being executable by anon/authenticated — those functions are intentionally callable (they're your RPCs like `accept_invite`, `set_family_hospital_mode`, `lookup_invite`); they're warnings, not vulnerabilities. Flag separately if you want them revoked and re-granted.

Approve and I'll start with batch 1 (iOS push + PWA identity).

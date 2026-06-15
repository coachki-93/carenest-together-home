## Goal
Every appointment/task in CareNest fires a push notification on the caregiver's iPad (and any other device that installed the app to its home screen), with zero setup work for you.

## Provider choice: Web Push (VAPID) — no work for you
Comparison:
- **Web Push + VAPID** — I generate the keys, store them as backend secrets, done. No third-party account, no console, no billing. Works on iOS 16.4+ installed PWAs, Android Chrome, desktop. **← Recommended**
- **Firebase Cloud Messaging** — you'd need to create a Firebase project, generate a server key, paste config. More steps for you. No real benefit here since we already have a backend.

Going with **Web Push + VAPID**.

## Prerequisites (iOS reality check)
- iPad must run iPadOS 16.4 or newer.
- The app must be added to the Home Screen (you already did this) and opened from that icon — Safari tabs cannot receive push.
- The user must tap "Allow" on the permission prompt once, from inside the installed app.

## What I'll build

### 1. Make it an installable PWA (manifest only, no offline)
- `public/manifest.webmanifest` with name, theme color, `display: "standalone"`, icons.
- App icons (192, 512, maskable, Apple touch icon) generated and dropped in `public/`.
- `<link rel="manifest">`, `theme-color`, `apple-touch-icon` tags in `__root.tsx` head.

### 2. Push service worker
- `public/push-sw.js` — handles `push` and `notificationclick` events only (not an app-shell cache, safe for Lovable preview).
- Shows the notification, and on click focuses the app and navigates to `/dashboard` or the specific task.

### 3. Subscription flow
- New `usePushSubscription` hook + a "Enable notifications" button in Settings (and a soft prompt on Dashboard for first-time caregivers).
- Registers the SW, calls `pushManager.subscribe({ applicationServerKey: VAPID_PUBLIC })`, stores the subscription in a new `push_subscriptions` table keyed by `user_id` + `family_id`.
- Bilingual strings (EN + SV) for the prompt, button, success/error toasts.

### 4. Database
Migration adds:
```
public.push_subscriptions (
  id, user_id, family_id, endpoint unique, p256dh, auth,
  user_agent, created_at, last_seen_at
)
```
With RLS + grants per your rules (users manage their own rows; service_role full access for the sender).

### 5. Sending notifications for every task
Two trigger points so **every** task gets one:
- **Scheduled trigger** — `pg_cron` runs every minute, calls a `/api/public/hooks/dispatch-task-notifications` server route. Route finds appointments due in the next minute that haven't been notified yet, sends a web-push to every subscription in that family, marks them sent (`notified_at` column added to `appointments`).
- **Configurable lead time** — defaults to "at start time"; later we can add per-family settings (e.g. 10 min before). Out of scope for v1.

### 6. Secrets I'll add for you
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (a `mailto:` placeholder, you can change later).
- I'll generate the keys and add them via the secrets tool — you just confirm the prompt.

## Files touched
- `public/manifest.webmanifest`, `public/push-sw.js`, `public/icon-*.png`
- `src/routes/__root.tsx` (head tags)
- `src/lib/push/` (subscribe hook, server fn to save subscription, helpers)
- `src/routes/api/public/hooks/dispatch-task-notifications.ts`
- `src/components/carenest/EnableNotificationsCard.tsx` + integration in Dashboard/Settings
- `src/lib/i18n/en.ts`, `src/lib/i18n/sv.ts`
- Migration for `push_subscriptions` + `appointments.notified_at`
- cron schedule (via supabase insert tool, not migration)

## Out of scope for v1
- Per-user quiet hours, snooze, custom lead times.
- Action buttons inside the notification (Done/Postpone) — can add later.
- Offline app-shell caching.

Approve and I'll build it.
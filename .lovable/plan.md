## Goal

Replace the current sonner-based toast system with a custom banner component matching the reference image: collapsed title row with chevron + close, expandable body for description/actions, 10s auto-dismiss with a colored variant-matched progress bar.

## Component

New `src/components/carenest/NotifyBanner.tsx` + provider/hook `src/lib/notify/notify.tsx` exposing:

```ts
notify.success(title, { description?, action?, duration? })
notify.error(...)
notify.warning(...)
notify.info(...)
```

Variants → icon + accent color (semantic tokens, not hardcoded):
- success → CheckCircle, green
- error → AlertCircle, destructive/red
- warning → AlertTriangle, amber
- info → Info, blue

Layout per banner:
- Top row: icon, title (bold), spacer, chevron-down (only if description/action present), X
- Expanded: description text, optional action button (e.g. "Go to inventory")
- Bottom: thin progress bar that depletes over `duration` (default 10000ms), with small caption "This message will close in Ns. Click to stop." that pauses the timer when clicked
- Hover also pauses; closing animates out

Stacking: fixed top-right (top-center on mobile), newest on top, max ~5 visible. Slide-in + fade animation using existing `animate-fade-in` / `slide-in-right`.

Fully bilingual — all built-in strings ("Click to stop", "This message will close in {n}s") go through `t()` with new keys in `en.ts` and `sv.ts`.

## Integration

1. Mount `<NotifyProvider />` in `src/routes/__root.tsx` alongside (then replacing) the existing `<Toaster />` from sonner.
2. Add a thin shim: `import { notify as toast } from "@/lib/notify"` so existing `toast.success(...)` call sites keep working without a sweep. Map sonner's `{ description, action }` shape 1:1.
3. Remove `<Toaster />` (sonner) from the root once shim is verified.
4. Push notifications received while the app is open (currently surfaced via `push-sw.js` / EnableNotificationsCard path): route the foreground message through `notify.warning(...)` or `notify.error(...)` with the alert details in the expanded body and a "View" action button linking to the relevant page.

## Out of scope (will remind later, per request)

- Editing thresholds for existing checklist items
- One-click "Mark received" from shopping list
- Notification preferences UI

## Files

- new: `src/lib/notify/notify.tsx` (provider, hook, store, shim export)
- new: `src/components/carenest/NotifyBanner.tsx`
- edit: `src/routes/__root.tsx` (mount provider, remove sonner Toaster)
- edit: `src/lib/i18n/en.ts`, `src/lib/i18n/sv.ts` (new keys)
- edit: foreground push handler path to call `notify.*` instead of any current toast

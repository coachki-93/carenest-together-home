import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { savePushSubscription, deletePushSubscription } from "./subscriptions.functions";
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "./keys";

export type PushStatus =
  | "unsupported"
  | "denied"
  | "default"
  | "granted-subscribed"
  | "granted-unsubscribed";

const SW_PATH = "/push-sw.js";

export function usePushSubscription(familyId: string | null | undefined) {
  const [status, setStatus] = useState<PushStatus>("default");
  const [loading, setLoading] = useState(false);
  const save = useServerFn(savePushSubscription);
  const remove = useServerFn(deletePushSubscription);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setStatus("unsupported");
      return;
    }
    const perm = Notification.permission;
    if (perm === "denied") {
      setStatus("denied");
      return;
    }
    if (perm === "default") {
      setStatus("default");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      setStatus(sub ? "granted-subscribed" : "granted-unsubscribed");
    } catch {
      setStatus("granted-unsubscribed");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    if (!familyId) throw new Error("No family selected");
    if (typeof window === "undefined") throw new Error("Window unavailable");
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      throw new Error("Push notifications are not supported on this device.");
    }
    // iOS Safari only allows push from an installed PWA (home-screen app).
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS-only
      window.navigator.standalone === true;
    if (isIos && !isStandalone) {
      throw new Error(
        "On iPad/iPhone, add CareNest to your Home Screen first, then open it from the icon and tap Enable.",
      );
    }
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "default");
        throw new Error("Notification permission was not granted.");
      }

      let reg = await navigator.serviceWorker.getRegistration(SW_PATH);
      if (!reg) {
        reg = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
      }
      // Wait until the worker controlling this scope is fully active — iOS
      // Safari often rejects subscribe() when the SW is still installing.
      await navigator.serviceWorker.ready;
      if (reg.installing || reg.waiting) {
        await new Promise<void>((resolve) => {
          const w = reg!.installing || reg!.waiting;
          if (!w) return resolve();
          w.addEventListener("statechange", () => {
            if (w.state === "activated") resolve();
          });
        });
      }

      const existing = await reg.pushManager.getSubscription();
      let sub = existing;
      if (!sub) {
        try {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            // iOS Safari is picky: pass a BufferSource (Uint8Array), NOT an ArrayBuffer.
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
          });
        } catch (err) {
          const msg = (err as Error)?.message || String(err);
          throw new Error(`Subscribe failed: ${msg}`);
        }
      }

      const json = sub.toJSON();
      await save({
        data: {
          family_id: familyId,
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
          user_agent: navigator.userAgent || null,
        },
      });
      setStatus("granted-subscribed");
    } finally {
      setLoading(false);
    }
  }, [familyId, save]);


  const disable = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await remove({ data: { endpoint: sub.endpoint } }).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
      setStatus("granted-unsubscribed");
    } finally {
      setLoading(false);
    }
  }, [remove]);

  return { status, loading, enable, disable, refresh };
}

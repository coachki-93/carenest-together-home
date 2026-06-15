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
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "default");
        throw new Error("Notification permission was not granted.");
      }

      const reg =
        (await navigator.serviceWorker.getRegistration(SW_PATH)) ||
        (await navigator.serviceWorker.register(SW_PATH, { scope: "/" }));
      // Ensure it's active before subscribing
      if (reg.installing || reg.waiting) {
        await new Promise<void>((resolve) => {
          const w = reg.installing || reg.waiting;
          if (!w) return resolve();
          w.addEventListener("statechange", () => {
            if (w.state === "activated") resolve();
          });
        });
      }

      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));

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

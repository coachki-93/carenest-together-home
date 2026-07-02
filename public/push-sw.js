// CareNest push service worker
// Only handles push + notification clicks. No app-shell caching, no offline.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { title: "CareNest", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "CareNest";
  const options = {
    body: payload.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.tag || undefined,
    renotify: !!payload.tag,
    data: { url: payload.url || "/dashboard" },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Prefer a window already on the target URL.
      for (const client of clients) {
        try {
          const u = new URL(client.url);
          if (u.pathname === url && "focus" in client) return client.focus();
        } catch (_) {
          // ignore malformed client URL
        }
      }
      // Otherwise open a fresh window at the target URL — safer than
      // navigating an unrelated window the user was mid-flow in.
      if (self.clients.openWindow) return self.clients.openWindow(url);
      // Fallback: focus something so the click isn't lost.
      const anyClient = clients.find((c) => "focus" in c);
      if (anyClient) return anyClient.focus();
    }),
  );
});

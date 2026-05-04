/* eslint-disable */
/**
 * Brightroots service worker.
 *
 * Handles Web Push API events: when /api/push/send dispatches a push,
 * the browser wakes this worker (even if the tab is closed) and we
 * show a system notification. Click → focus existing tab if open,
 * otherwise open a new tab at the deep link.
 *
 * Stays minimal: no caching strategies (Vercel CDN handles asset
 * caching), no offline support (out of scope for v1). If we add
 * offline lesson downloads later, that logic goes here.
 */

self.addEventListener("install", (event) => {
  // Activate immediately on install — don't wait for the user to
  // close all tabs. Standard PWA push pattern.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Take control of all open tabs immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Brightroots", body: event.data.text() };
  }

  const title = payload.title || "Brightroots";
  const options = {
    body: payload.body || "",
    icon: "/symbol.svg",
    badge: "/symbol.svg",
    tag: payload.tag || "brightroots",
    data: { url: payload.url || "/dashboard/notifications" },
    // Vibration is best-effort; ignored on desktop.
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) ||
    "/dashboard/notifications";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Reuse an existing tab if one's already open at our origin
        for (const client of clientList) {
          if ("focus" in client) {
            return client.focus().then((c) => {
              if (c && "navigate" in c) {
                return c.navigate(targetUrl);
              }
            });
          }
        }
        // Otherwise open a new tab
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

/// <reference lib="webworker" />
// Custom service worker (injectManifest strategy) — replaces the previous
// auto-generated one because push notifications need a real `push` event
// listener, which vite-plugin-pwa's generateSW strategy has no hook for.
// Precaching/offline-API-caching behavior is carried over unchanged from
// the old generateSW config in vite.config.ts.

import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ url }) => url.pathname.startsWith("/rest/") || url.hostname.includes("supabase"),
  new NetworkFirst({ cacheName: "api-cache", networkTimeoutSeconds: 3 }),
);

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
}

self.addEventListener("push", (event) => {
  let data: PushPayload = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { body: event.data?.text() };
  }

  const title = data.title ?? "Batchkeeper";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body ?? "",
      icon: "/apple-touch-icon.png",
      badge: "/apple-touch-icon.png",
      data: { url: data.url ?? "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => c.url.startsWith(self.location.origin));
      if (existing) {
        existing.navigate(url);
        return existing.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});

self.skipWaiting();
self.addEventListener("activate", () => self.clients.claim());

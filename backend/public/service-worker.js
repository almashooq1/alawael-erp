// KILL-SWITCH service worker — Al-Awael ERP backend (backend/public).
//
// The backend serves this at /service-worker.js (startup/middleware.js), though
// nginx shadows it by serving the frontend build's copy — so it is effectively
// dormant. It previously cached navigation responses into `alawael-v1`
// (the same fixed cache name as the old aggressive frontend SW), i.e. the same
// stale-app-shell class. Closed here too: purge every cache + unregister +
// reload, then network-only. No caching = never a stale shell. (See W1586.)

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      await self.clients.claim();
      await self.registration.unregister();
      const windows = await self.clients.matchAll({ type: 'window' });
      for (const client of windows) {
        try {
          client.navigate(client.url);
        } catch {
          /* navigate unsupported — next manual load recovers */
        }
      }
    })()
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});

/**
 * KILL-SWITCH service worker.
 *
 * Supersedes the old cache-first SW (CACHE_NAME 'alawael-v1') that precached
 * '/index.html' and served it cache-first with a version string that NEVER
 * changed — so once a browser registered it, every later deploy's new routes
 * 404'd (it kept serving the stale app shell + old chunk hashes; e.g. the
 * /student-management "404"). Because the old activate handler only deleted
 * caches != 'alawael-v1', the stale shell survived forever.
 *
 * This replacement purges EVERY cache, unregisters itself, and reloads any open
 * page — so any browser still running the old SW recovers on its next visit and
 * all subsequent loads go straight to the network (content-hashed assets are
 * already immutable-cached by HTTP; index.html is served no-cache by nginx).
 *
 * It intentionally does NO caching. This app is an online admin tool; correctness
 * (never a stale shell) outweighs offline support.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 1. Nuke every cache (busts the stale 'alawael-v1' app shell).
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      // 2. Take control of open pages, then remove this registration entirely.
      await self.clients.claim();
      await self.registration.unregister();
      // 3. Force open tabs to reload — they come back with fresh network content.
      const windows = await self.clients.matchAll({ type: 'window' });
      for (const client of windows) {
        try {
          client.navigate(client.url);
        } catch {
          /* navigate not supported on this client — next manual load recovers */
        }
      }
    })()
  );
});

// Pure network passthrough while this SW is briefly alive.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

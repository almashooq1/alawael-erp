/* eslint-disable no-undef, no-restricted-globals */
/**
 * KILL-SWITCH service worker (supply-chain-management frontend).
 *
 * The previous SW precached '/index.html' under FIXED cache names
 * (`erp-app-v1` / `erp-runtime-v1`) and kept them across deploys — the same
 * stale-app-shell class that made routes 404 in the main frontend once a
 * browser had registered the SW. This module is currently dormant (the SCM
 * frontend is not served on a public route), but the pattern is closed here
 * too so it can never resurface if SCM is deployed later.
 *
 * On activate it purges EVERY cache, unregisters itself, and reloads open tabs,
 * so any browser still running the old SW recovers and all loads go to the
 * network. No caching = never a stale shell.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
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

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

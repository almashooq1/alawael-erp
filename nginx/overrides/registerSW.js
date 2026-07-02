/* Al-Awael - service-worker CLEANUP shim (replaces vite-plugin-pwa registerSW).
 *
 * ROOT CAUSE of the recurring "404 on most of the site" (incl. /rehab, /admin):
 * an OLD cache-first service worker registered at scope "/" served a stale
 * legacy app-shell for EVERY navigation, so the legacy SPA rendered its own
 * 404 for routes it does not own (/rehab/, deep links, etc.).
 *
 * This shim registers NO service worker. It unregisters ANY existing SW and
 * purges ALL caches for this origin, then reloads once (sessionStorage-guarded
 * so it can never loop). Served by nginx via an exact-match location, so a
 * frontend rebuild/deploy can never revert it. Combined with the kill-switch
 * at /service-worker.js this closes the stale-shell-404 class permanently.
 */
(function () {
  try {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      var had = regs.length > 0;
      return Promise.all(regs.map(function (r) { return r.unregister(); })).then(function () {
        if (window.caches && caches.keys) {
          return caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (k) { return caches.delete(k); }));
          }).then(function () { return had; });
        }
        return had;
      });
    }).then(function (had) {
      if (had && !sessionStorage.getItem('__sw_purged_v1__')) {
        sessionStorage.setItem('__sw_purged_v1__', '1');
        location.reload();
      }
    }).catch(function () {});
  } catch (e) { /* no-op */ }
})();

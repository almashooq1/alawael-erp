/**
 * Service Worker CLEANUP (formerly registration).
 * تنظيف Service Worker — لم يعد يُسجّل أي SW.
 *
 * ROOT CAUSE this file used to cause: it registered a service worker at the
 * ROOT scope ('/'). An old cache-first version of that SW served the stale
 * legacy app-shell for EVERY navigation — including sibling apps like /rehab
 * and /admin — so the legacy SPA rendered its own 404 for any route it does
 * not own. That produced the recurring "404 on most of the site".
 *
 * This module now registers NO service worker. `register()` actively UNREGISTERS
 * any existing SW and purges all caches (sessionStorage-guarded single reload so
 * it can never loop). Kept the `register`/`unregister` export names so existing
 * callers (App.js) keep working. This app is an online tool — correctness (never
 * a stale shell) outweighs offline support.
 *
 * Belt-and-suspenders: nginx also serves /registerSW.js as a cleanup shim and
 * /service-worker.js as a kill-switch, so already-poisoned browsers recover even
 * before this build reaches them.
 */

function purgeServiceWorkersAndCaches() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker
    .getRegistrations()
    .then(registrations => {
      const hadSw = registrations.length > 0;
      return Promise.all(registrations.map(r => r.unregister()))
        .then(() => {
          if (typeof caches !== 'undefined' && caches.keys) {
            return caches
              .keys()
              .then(keys => Promise.all(keys.map(k => caches.delete(k))))
              .then(() => hadSw);
          }
          return hadSw;
        });
    })
    .then(hadSw => {
      // Reload ONCE if we actually removed a SW — so a page currently controlled
      // by a stale SW comes back with fresh network content. Guarded so it can
      // never loop (a clean browser has no registrations → hadSw is false).
      try {
        if (hadSw && !sessionStorage.getItem('__sw_purged_v1__')) {
          sessionStorage.setItem('__sw_purged_v1__', '1');
          window.location.reload();
        }
      } catch {
        /* sessionStorage unavailable — skip the reload, cleanup already ran */
      }
    })
    .catch(() => {
      /* no-op — cleanup must never break the app */
    });
}

// Historically registered a SW; now it CLEANS UP. Named `register` for callers.
export function register() {
  if (typeof window === 'undefined') return;
  window.addEventListener('load', purgeServiceWorkersAndCaches);
}

export function unregister() {
  purgeServiceWorkersAndCaches();
}

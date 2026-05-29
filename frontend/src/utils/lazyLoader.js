/**
 * Lazy Loading Utility with Retry Logic
 * أداة التحميل الكسول مع إعادة المحاولة
 */

import { lazy } from 'react';
import logger from 'utils/logger';

/**
 * Lazy load component with retry logic
 * @param {Function} importFunc - Dynamic import function
 * @param {number} retries - Number of retry attempts
 * @returns {React.LazyExoticComponent}
 */
export const lazyWithRetry = (importFunc, retries = 3) => {
  return lazy(() => {
    return new Promise((resolve, reject) => {
      const attempt = n => {
        importFunc()
          .then(mod => {
            // A clean load means the current build is reachable — reset the reload
            // guard so a LATER deploy in this same tab gets its own fresh reload.
            try {
              sessionStorage.removeItem('chunk_reload_at');
            } catch {
              /* sessionStorage may be unavailable (private mode) */
            }
            resolve(mod);
          })
          .catch(error => {
            const msg = (error && error.message) || '';
            const isChunkError =
              !!error &&
              (error.name === 'ChunkLoadError' ||
                /loading chunk|dynamically imported module|module script failed/i.test(msg));

            if (n === 1) {
              // All retries exhausted.
              if (isChunkError) {
                // A new deploy almost always rotates the content-hashed chunk
                // names, so this tab's index.html points at chunks the server no
                // longer serves. Force ONE reload to pull the fresh index.html.
                //
                // Guard with a short TIME WINDOW (not a permanent session flag):
                // if we already reloaded in the last 10s and still fail, the chunk
                // is genuinely gone (offline / broken build) — surface the error
                // boundary instead of looping. Unlike the old permanent flag, the
                // window lets a future deploy in this tab trigger a clean reload.
                try {
                  const now = Date.now();
                  const last = parseInt(sessionStorage.getItem('chunk_reload_at') || '0', 10);
                  if (!last || now - last > 10000) {
                    sessionStorage.setItem('chunk_reload_at', String(now));
                    logger.warn('ChunkLoadError after retries — reloading to fetch fresh build');
                    window.location.reload();
                    return;
                  }
                  logger.error('ChunkLoadError persists after reload — surfacing error boundary');
                } catch {
                  /* sessionStorage unavailable — fall through to reject */
                }
              }
              reject(error);
              return;
            }

            logger.warn(`Import failed. Retrying... (${retries - n + 1}/${retries})`);

            // Wait before retry (exponential backoff)
            setTimeout(
              () => {
                attempt(n - 1);
              },
              1000 * (retries - n + 1)
            );
          });
      };

      attempt(retries);
    });
  });
};

export default lazyWithRetry;

/**
 * Prefetch route chunks during idle time
 * استباق تحميل الصفحات أثناء وقت الخمول
 * @param {Array<Function>} importFunctions - Array of dynamic import functions
 */
export const prefetchRoutes = importFunctions => {
  if (typeof window === 'undefined') return;

  const prefetch = () => {
    importFunctions.forEach(importFn => {
      try {
        importFn();
      } catch {
        // Silently ignore prefetch failures
      }
    });
  };

  // Use requestIdleCallback if available, otherwise setTimeout
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(prefetch, { timeout: 5000 });
  } else {
    setTimeout(prefetch, 2000);
  }
};

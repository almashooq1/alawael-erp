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
          .then(resolve)
          .catch(error => {
            const isChunkError =
              error && (error.name === 'ChunkLoadError' || /loading chunk/i.test(error.message));

            if (n === 1) {
              // All retries exhausted
              if (isChunkError) {
                // Chunk hash mismatch — force full page reload (once)
                const reloadKey = 'chunk_reload_' + Date.now();
                if (!sessionStorage.getItem('chunk_force_reload')) {
                  sessionStorage.setItem('chunk_force_reload', reloadKey);
                  logger.warn('ChunkLoadError after all retries — forcing page reload');
                  window.location.reload();
                  return;
                }
                sessionStorage.removeItem('chunk_force_reload');
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

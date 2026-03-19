/**
 * Lazy Loading Utility with Retry Logic
 * أداة التحميل الكسول مع إعادة المحاولة
 */

import { lazy } from 'react';

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
            if (n === 1) {
              reject(error);
              return;
            }

            console.warn(`Import failed. Retrying... (${retries - n + 1}/${retries})`);

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

/**
 * Preload component
 * @param {Function} importFunc - Dynamic import function
 */
export const preloadComponent = importFunc => {
  importFunc().catch(error => {
    console.error('Preload failed:', error);
  });
};

/**
 * Code splitting by route
 */
export const routes = {
  // Lazy load pages
  Dashboard: lazyWithRetry(() => import('../components/dashboard/AdvancedDashboard')),
  StudentReports: lazyWithRetry(() => import('../pages/StudentReports')),
  StudentPortal: lazyWithRetry(() => import('../pages/StudentPortal')),
  AdminDashboard: lazyWithRetry(() => import('../pages/AdminDashboard')),
  // Add more routes as needed
};

export default lazyWithRetry;

import { lazy, ComponentType } from 'react';

/**
 * Lazy load components with retry logic
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  maxRetries: number = 3
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await componentImport();
      } catch (error) {
        lastError = error as Error;
        console.warn(`Failed to load component, attempt ${i + 1}/${maxRetries}`, error);

        // انتظر قليلاً قبل إعادة المحاولة
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }

    throw lastError || new Error('Failed to load component after retries');
  });
}

/**
 * Preload component for better UX
 */
export function preloadComponent<T extends ComponentType<any>>(
  LazyComponent: React.LazyExoticComponent<T>
): void {
  // @ts-ignore - accessing internal _payload
  const payload = (LazyComponent as any)._payload;
  if (payload && payload._status === -1) {
    // Component not loaded yet, trigger load
    payload._result();
  }
}

/**
 * Create route-based code splitting
 */
export const LazyRoutes = {
  Dashboard: lazyWithRetry(() => import('../pages/Dashboard')),
  Users: lazyWithRetry(() => import('../pages/Users')),
  Reports: lazyWithRetry(() => import('../pages/Reports')),
  Settings: lazyWithRetry(() => import('../pages/Settings')),
  Profile: lazyWithRetry(() => import('../pages/Profile')),
  Analytics: lazyWithRetry(() => import('../pages/Analytics')),
};

export default lazyWithRetry;

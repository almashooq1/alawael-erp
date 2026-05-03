/**
 * Sentry Error Tracking Configuration
 * تكوين تتبع الأخطاء عبر Sentry
 *
 * Setup:
 * 1. Create a Sentry project at https://sentry.io
 * 2. Set REACT_APP_SENTRY_DSN in your .env file
 * 3. Sentry will automatically capture errors from ErrorBoundary + unhandled exceptions
 */

// Lazy-load Sentry to avoid blocking initial bundle
let SentryModule = null;
let isInitialized = false;

const SENTRY_DSN = process.env.REACT_APP_SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const RELEASE = process.env.REACT_APP_VERSION || '1.0.0';

/**
 * Initialize Sentry SDK
 * Only loads in production or when DSN is explicitly set
 */
export async function initSentry() {
  if (isInitialized) return;

  // Skip if no DSN configured
  if (!SENTRY_DSN) {
    if (ENVIRONMENT === 'development') {
      console.info(
        '[Sentry] No DSN configured. Set REACT_APP_SENTRY_DSN to enable error tracking.'
      );
    }
    return;
  }

  try {
    SentryModule = await import(/* webpackIgnore: true */ '@sentry/react');

    SentryModule.init({
      dsn: SENTRY_DSN,
      environment: ENVIRONMENT,
      release: `alawael-erp@${RELEASE}`,

      // Performance monitoring
      tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

      // Session replay for error reproduction
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: ENVIRONMENT === 'production' ? 1.0 : 0,

      // Filter out noisy errors
      ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        'originalCreateNotification',
        'canvas.contentDocument',
        // ResizeObserver
        'ResizeObserver loop',
        // Network errors
        'Network request failed',
        'Failed to fetch',
        'Load failed',
        // Chunk loading errors (handled by lazyWithRetry)
        'ChunkLoadError',
        'Loading chunk',
        'Loading CSS chunk',
      ],

      // Don't send PII
      sendDefaultPii: false,

      // Breadcrumbs configuration
      beforeBreadcrumb(breadcrumb) {
        // Filter out noisy console breadcrumbs
        if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
          return null;
        }
        return breadcrumb;
      },

      // Enrich error data before sending
      beforeSend(event, hint) {
        const error = hint.originalException;

        // Skip chunk loading errors (handled by retry logic)
        if (error && error.name === 'ChunkLoadError') {
          return null;
        }

        // Add custom context
        event.tags = {
          ...event.tags,
          app: 'alawael-erp-frontend',
          language: document.documentElement.lang || 'ar',
          direction: document.documentElement.dir || 'rtl',
        };

        return event;
      },
    });

    isInitialized = true;
    console.info(`[Sentry] Initialized for ${ENVIRONMENT}`);
  } catch (err) {
    console.warn('[Sentry] Failed to initialize:', err.message);
  }
}

/**
 * Capture an exception in Sentry
 * Falls back to console.error if Sentry is not available
 */
export function captureException(error, context = {}) {
  if (SentryModule && isInitialized) {
    SentryModule.captureException(error, {
      extra: context,
    });
  }

  // Always log to console in development
  if (ENVIRONMENT !== 'production') {
    console.error('[Error]', error, context);
  }
}

/**
 * Capture a message in Sentry
 */
export function captureMessage(message, level = 'info', context = {}) {
  if (SentryModule && isInitialized) {
    SentryModule.captureMessage(message, {
      level,
      extra: context,
    });
  }
}

/**
 * Set user context for Sentry
 * Call this after login
 */
export function setUser(user) {
  if (SentryModule && isInitialized && user) {
    SentryModule.setUser({
      id: user.id || user._id,
      email: user.email,
      username: user.name,
      role: user.role,
    });
  }
}

/**
 * Clear user context from Sentry
 * Call this after logout
 */
export function clearUser() {
  if (SentryModule && isInitialized) {
    SentryModule.setUser(null);
  }
}

/**
 * Add breadcrumb for navigation tracking
 */
export function addBreadcrumb(category, message, data = {}) {
  if (SentryModule && isInitialized) {
    SentryModule.addBreadcrumb({
      category,
      message,
      data,
      level: 'info',
    });
  }
}

export default {
  initSentry,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
};

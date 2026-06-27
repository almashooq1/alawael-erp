/**
 * CSRF Token Manager
 * إدارة رموز CSRF للحماية من هجمات Cross-Site Request Forgery
 *
 * Reads the CSRF token from a meta tag injected by the backend:
 *   <meta name="csrf-token" content="..." />
 * Falls back to a cookie-based token if the meta tag is absent.
 */

const CSRF_META_SELECTOR = 'meta[name="csrf-token"]';
const CSRF_COOKIE_NAME = 'XSRF-TOKEN';

/**
 * Get the current CSRF token from the DOM or cookies.
 * @returns {string|null}
 */
export function getCsrfToken() {
  // 1. Try meta tag (preferred — injected by backend on full-page loads)
  const meta = document.querySelector(CSRF_META_SELECTOR);
  if (meta) {
    const token = meta.getAttribute('content');
    if (token) return token;
  }

  // 2. Fallback to cookie (set by backend on API responses)
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Refresh the CSRF token from a backend response header.
 * Call this after any API request that returns a new CSRF token.
 * @param {Headers} headers — Response headers object
 */
export function refreshCsrfTokenFromHeaders(headers) {
  const newToken = headers.get('X-CSRF-Token');
  if (newToken) {
    let meta = document.querySelector(CSRF_META_SELECTOR);
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'csrf-token';
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', newToken);
  }
}

/**
 * Attach the CSRF token to a request config object (for axios).
 * @param {Object} config — Axios request config
 * @returns {Object} — Config with X-CSRF-Token header added
 */
export function attachCsrfToken(config) {
  const token = getCsrfToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers['X-CSRF-Token'] = token;
  }
  return config;
}

const csrf = {
  getCsrfToken,
  refreshCsrfTokenFromHeaders,
  attachCsrfToken,
};

export default csrf;

/**
 * CSRF Token Manager — TypeScript Version
 * إدارة رموز CSRF للحماية من هجمات Cross-Site Request Forgery
 */

const CSRF_META_SELECTOR = 'meta[name="csrf-token"]';
const CSRF_COOKIE_NAME = 'XSRF-TOKEN';

/**
 * Get the current CSRF token from the DOM or cookies.
 */
export function getCsrfToken(): string | null {
  const meta = document.querySelector<HTMLMetaElement>(CSRF_META_SELECTOR);
  if (meta) {
    const token = meta.getAttribute('content');
    if (token) return token;
  }

  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Refresh the CSRF token from a backend response header.
 */
export function refreshCsrfTokenFromHeaders(headers: Headers): void {
  const newToken = headers.get('X-CSRF-Token');
  if (newToken) {
    let meta = document.querySelector<HTMLMetaElement>(CSRF_META_SELECTOR);
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'csrf-token';
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', newToken);
  }
}

interface AxiosConfig {
  headers?: Record<string, string>;
}

/**
 * Attach the CSRF token to a request config object (for axios).
 */
export function attachCsrfToken(config: AxiosConfig): AxiosConfig {
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

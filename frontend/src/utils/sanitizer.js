/**
 * Input Sanitizer
 * طبقة تطهير المدخلات للحماية من XSS
 *
 * Uses DOMPurify to sanitize HTML strings, and provides helpers
 * for plain-text sanitization and URL validation.
 */

import DOMPurify from 'dompurify';

// ── DOMPurify configuration (strict, no scripts/events) ───────────────────
const PURIFY_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  FORBID_ATTR: ['onerror', 'onload', 'onmouseover', 'onclick'],
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
  ALLOW_DATA_ATTR: false,
  SANITIZE_DOM: true,
  KEEP_CONTENT: true,
};

/**
 * Sanitize an HTML string, allowing only safe tags and attributes.
 * @param {string} dirty — Raw HTML string
 * @returns {string} — Sanitized HTML string
 */
export function sanitizeHtml(dirty) {
  if (!dirty || typeof dirty !== 'string') return '';
  return DOMPurify.sanitize(dirty, PURIFY_CONFIG);
}

/**
 * Sanitize a plain text string (removes ALL HTML tags).
 * @param {string} dirty — Raw string
 * @returns {string} — Plain text with no HTML
 */
export function sanitizeText(dirty) {
  if (!dirty || typeof dirty !== 'string') return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

/**
 * Validate and sanitize a URL string.
 * Only allows http:, https:, mailto:, and tel: schemes.
 * @param {string} dirty — Raw URL string
 * @returns {string|null} — Sanitized URL or null if invalid
 */
export function sanitizeUrl(dirty) {
  if (!dirty || typeof dirty !== 'string') return null;
  const sanitized = dirty.trim();
  try {
    const url = new URL(sanitized, window.location.href);
    const allowedSchemes = ['http:', 'https:', 'mailto:', 'tel:'];
    if (!allowedSchemes.includes(url.protocol)) return null;
    // Block javascript: and data: schemes explicitly
    if (url.protocol === 'javascript:' || url.protocol === 'data:') return null;
    return url.href;
  } catch {
    // If it's a relative URL starting with /, allow it
    if (sanitized.startsWith('/') && !sanitized.startsWith('//')) return sanitized;
    return null;
  }
}

/**
 * Sanitize an object recursively (deep sanitization for form data).
 * Only sanitizes string values; preserves numbers, booleans, dates, arrays.
 * @param {any} obj — Object to sanitize
 * @returns {any} — Sanitized clone
 */
export function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return sanitizeText(obj);
  if (typeof obj === 'number' || typeof obj === 'boolean' || obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeObject(value);
    }
    return result;
  }
  return obj;
}

const sanitizer = {
  sanitizeHtml,
  sanitizeText,
  sanitizeUrl,
  sanitizeObject,
};

export default sanitizer;

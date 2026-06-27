/**
 * Input Sanitizer — TypeScript Version
 * طبقة تطهير المدخلات للحماية من XSS
 */

import DOMPurify from 'dompurify';

const PURIFY_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  FORBID_ATTR: ['onerror', 'onload', 'onmouseover', 'onclick'],
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
  ALLOW_DATA_ATTR: false,
  SANITIZE_DOM: true,
  KEEP_CONTENT: true,
};

export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty || typeof dirty !== 'string') return '';
  return DOMPurify.sanitize(dirty, PURIFY_CONFIG);
}

export function sanitizeText(dirty: string | null | undefined): string {
  if (!dirty || typeof dirty !== 'string') return '';
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [], KEEP_CONTENT: true });
}

export function sanitizeUrl(dirty: string | null | undefined): string | null {
  if (!dirty || typeof dirty !== 'string') return null;
  const sanitized = dirty.trim();
  try {
    const url = new URL(sanitized, window.location.href);
    const allowedSchemes = ['http:', 'https:', 'mailto:', 'tel:'];
    if (!allowedSchemes.includes(url.protocol)) return null;
    if (url.protocol === 'javascript:' || url.protocol === 'data:') return null;
    return url.href;
  } catch {
    if (sanitized.startsWith('/') && !sanitized.startsWith('//')) return sanitized;
    return null;
  }
}

export function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return sanitizeText(obj);
  if (typeof obj === 'number' || typeof obj === 'boolean' || obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
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

/**
 * Tests for CSRF Utility
 * فحوصات أداة CSRF
 */

import { getCsrfToken, attachCsrfToken, refreshCsrfTokenFromHeaders } from '../utils/csrf';

describe('CSRF Utility', () => {
  beforeEach(() => {
    // Clean up meta tags and cookies
    document.querySelectorAll('meta[name="csrf-token"]').forEach((el) => el.remove());
    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  test('getCsrfToken should return null when no token exists', () => {
    expect(getCsrfToken()).toBeNull();
  });

  test('getCsrfToken should read from meta tag', () => {
    const meta = document.createElement('meta');
    meta.name = 'csrf-token';
    meta.content = 'test-meta-token';
    document.head.appendChild(meta);

    expect(getCsrfToken()).toBe('test-meta-token');
  });

  test('getCsrfToken should fallback to cookie', () => {
    document.cookie = 'XSRF-TOKEN=test-cookie-token; path=/';

    expect(getCsrfToken()).toBe('test-cookie-token');
  });

  test('meta tag should take precedence over cookie', () => {
    const meta = document.createElement('meta');
    meta.name = 'csrf-token';
    meta.content = 'meta-wins';
    document.head.appendChild(meta);
    document.cookie = 'XSRF-TOKEN=cookie-loses; path=/';

    expect(getCsrfToken()).toBe('meta-wins');
  });

  test('attachCsrfToken should add header when token exists', () => {
    const meta = document.createElement('meta');
    meta.name = 'csrf-token';
    meta.content = 'attached-token';
    document.head.appendChild(meta);

    const config = { headers: {} };
    attachCsrfToken(config);

    expect(config.headers['X-CSRF-Token']).toBe('attached-token');
  });

  test('attachCsrfToken should not modify config when no token', () => {
    const config = { headers: {} };
    attachCsrfToken(config);

    expect(config.headers['X-CSRF-Token']).toBeUndefined();
  });

  test('refreshCsrfTokenFromHeaders should update meta tag', () => {
    const headers = new Map();
    headers.set('X-CSRF-Token', 'refreshed-token');

    refreshCsrfTokenFromHeaders(headers);

    const meta = document.querySelector('meta[name="csrf-token"]');
    expect(meta).not.toBeNull();
    expect(meta.getAttribute('content')).toBe('refreshed-token');
  });
});

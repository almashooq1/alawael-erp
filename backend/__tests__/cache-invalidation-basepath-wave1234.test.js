'use strict';

/**
 * cache-invalidation-basepath-wave1234.test.js — write-side cache
 * invalidation must reach action-suffix mutations.
 *
 * The global cacheMiddleware(300,'api') caches every GET in Redis. Before
 * W1234 its write-side invalidation stripped only a TRAILING /:objectId,
 * so the ~720 action-suffix mutations in this codebase
 * (`POST /x/:id/approve`, `PATCH /x/:id/status`, …) cleared a pattern that
 * matched nothing — list + detail GETs served the pre-action state for the
 * full 300s TTL. The W1229 letter-revoke bug (revoked letter kept
 * verifying VALID) was one live instance of this class.
 *
 * Pure-function tests on `invalidationBasePath` + a drift guard that the
 * middleware actually uses it.
 */

const fs = require('fs');
const path = require('path');
const { invalidationBasePath } = require('../config/performance');

const OID = '6a2b07c0e116d3721151df3c';
const OID2 = '69bcdcb6ddc7900f2a738c03';
const UUID = '3f2b8c1a-9d4e-4b7a-8c2d-1e5f6a7b8c9d';

describe('W1234 invalidationBasePath — id + action-suffix stripping', () => {
  test('plain trailing ObjectId (the old behavior, preserved)', () => {
    expect(invalidationBasePath(`/api/accounting/expenses/${OID}`)).toBe(
      '/api/accounting/expenses'
    );
  });

  test('action suffix after the id — the W1234 class', () => {
    expect(invalidationBasePath(`/api/v1/hr/official-letters/${OID}/revoke`)).toBe(
      '/api/v1/hr/official-letters'
    );
    expect(invalidationBasePath(`/api/v1/form-templates/submissions/${OID}/status`)).toBe(
      '/api/v1/form-templates/submissions'
    );
  });

  test('nested ids with deeper action segments strip from the FIRST id', () => {
    expect(invalidationBasePath(`/api/v1/care-plans/${OID}/goals/${OID2}/complete`)).toBe(
      '/api/v1/care-plans'
    );
  });

  test('UUID ids are recognized too', () => {
    expect(invalidationBasePath(`/api/v1/jobs/${UUID}/cancel`)).toBe('/api/v1/jobs');
  });

  test('query strings are dropped before deriving', () => {
    expect(invalidationBasePath(`/api/v1/items/${OID}/approve?notify=1`)).toBe('/api/v1/items');
  });

  test('id-less URLs pass through unchanged (creates, logins, bulk ops)', () => {
    expect(invalidationBasePath('/api/v1/hr/official-letters')).toBe(
      '/api/v1/hr/official-letters'
    );
    expect(invalidationBasePath('/api/v1/auth/login')).toBe('/api/v1/auth/login');
    expect(invalidationBasePath('/api/v1/items/bulk-import')).toBe('/api/v1/items/bulk-import');
  });

  test('short hex segments are NOT mistaken for ids', () => {
    expect(invalidationBasePath('/api/v1/reports/2026/summary')).toBe(
      '/api/v1/reports/2026/summary'
    );
    expect(invalidationBasePath('/api/v1/codes/abc123/activate')).toBe(
      '/api/v1/codes/abc123/activate'
    );
  });

  test('trailing slash after the action is tolerated', () => {
    expect(invalidationBasePath(`/api/v1/items/${OID}/approve/`)).toBe('/api/v1/items');
  });

  test('null/undefined input degrades to empty string, never throws', () => {
    expect(invalidationBasePath(undefined)).toBe('');
    expect(invalidationBasePath(null)).toBe('');
  });
});

describe('W1234 drift guard — middleware wiring', () => {
  const perfSrc = fs.readFileSync(path.join(__dirname, '..', 'config', 'performance.js'), 'utf8');

  test('cacheMiddleware derives the clear pattern via invalidationBasePath', () => {
    expect(perfSrc).toMatch(/const basePath = invalidationBasePath\(req\.originalUrl \|\| req\.url\)/);
    // The old inline strip (trailing-id-only) must not silently return.
    expect(perfSrc).not.toMatch(/\.replace\(\/\\\/\[a-f0-9\]\{24\}\$\/i, ''\)/);
  });

  test('invalidationBasePath is exported for reuse + tests', () => {
    expect(perfSrc).toMatch(/invalidationBasePath,/);
  });
});

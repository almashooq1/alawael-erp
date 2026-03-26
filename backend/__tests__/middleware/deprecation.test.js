/**
 * Tests for Deprecation Middleware (RFC 8594)
 * اختبارات وسيط تحذير إيقاف الواجهات البرمجية
 */

'use strict';

const express = require('express');
const request = require('supertest');
const { deprecate } = require('../../middleware/deprecation');

function buildApp(opts) {
  const app = express();
  app.get('/old', deprecate(opts), (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe('Deprecation Middleware (RFC 8594)', () => {
  // ── 1. Always sets Deprecation: true ─────────────────────────
  test('should set Deprecation: true header', async () => {
    const app = buildApp({});
    const res = await request(app).get('/old');

    expect(res.status).toBe(200);
    expect(res.headers['deprecation']).toBe('true');
  });

  // ── 2. Valid sunset date → Sunset header in RFC 7231 format ──
  test('should set Sunset header for valid date', async () => {
    const app = buildApp({ sunset: '2026-12-31' });
    const res = await request(app).get('/old');

    expect(res.headers['sunset']).toBeDefined();
    // Should be a valid HTTP-date
    const parsed = new Date(res.headers['sunset']);
    expect(isNaN(parsed.getTime())).toBe(false);
    expect(parsed.getUTCFullYear()).toBe(2026);
  });

  // ── 3. Invalid sunset date → no Sunset header ────────────────
  test('should NOT set Sunset header for invalid date', async () => {
    const app = buildApp({ sunset: 'not-a-date' });
    const res = await request(app).get('/old');

    expect(res.headers['deprecation']).toBe('true');
    expect(res.headers['sunset']).toBeUndefined();
  });

  // ── 4. Successor → Link header with rel=successor-version ────
  test('should set Link header when successor is provided', async () => {
    const app = buildApp({ successor: '/api/v2/new-endpoint' });
    const res = await request(app).get('/old');

    expect(res.headers['link']).toContain('/api/v2/new-endpoint');
    expect(res.headers['link']).toContain('rel="successor-version"');
  });

  // ── 5. No successor → no Link header ─────────────────────────
  test('should NOT set Link header when no successor', async () => {
    const app = buildApp({});
    const res = await request(app).get('/old');

    expect(res.headers['link']).toBeUndefined();
  });

  // ── 6. Message → X-Deprecation-Notice header ─────────────────
  test('should set X-Deprecation-Notice when message provided', async () => {
    const app = buildApp({ message: 'Use v2 instead' });
    const res = await request(app).get('/old');

    expect(res.headers['x-deprecation-notice']).toBe('Use v2 instead');
  });

  // ── 7. No options → only Deprecation header ───────────────────
  test('should work with no options at all', async () => {
    const app = express();
    app.get('/old', deprecate(), (_req, res) => res.json({ ok: true }));

    const res = await request(app).get('/old');
    expect(res.headers['deprecation']).toBe('true');
    expect(res.headers['sunset']).toBeUndefined();
    expect(res.headers['link']).toBeUndefined();
    expect(res.headers['x-deprecation-notice']).toBeUndefined();
  });

  // ── 8. Full options → all headers present ─────────────────────
  test('should set all headers when fully configured', async () => {
    const app = buildApp({
      sunset: '2027-06-15',
      successor: '/api/v3/resource',
      message: 'Migrating to v3',
    });
    const res = await request(app).get('/old');

    expect(res.headers['deprecation']).toBe('true');
    expect(res.headers['sunset']).toBeDefined();
    expect(res.headers['link']).toContain('/api/v3/resource');
    expect(res.headers['x-deprecation-notice']).toBe('Migrating to v3');
  });
});

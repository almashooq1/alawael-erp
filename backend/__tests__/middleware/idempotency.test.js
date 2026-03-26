/**
 * Tests for Idempotency Middleware
 * اختبارات وسيط حماية التكرار
 */

'use strict';

const express = require('express');
const request = require('supertest');

// ── Mock Redis before requiring the module ───────────────────────
let mockRedisStore = {};
jest.mock(
  '../../config/redis',
  () => ({
    get: jest.fn(async key => mockRedisStore[key] || null),
    set: jest.fn(async (key, value, _ex, _ttl) => {
      mockRedisStore[key] = value;
      return 'OK';
    }),
  }),
  { virtual: true }
);

const { idempotent } = require('../../middleware/idempotency');

/**
 * Create a tiny Express app with idempotency middleware on POST /test
 */
function buildApp() {
  const app = express();
  app.use(express.json());

  let callCount = 0;
  app.post('/test', idempotent(), (req, res) => {
    callCount++;
    res.status(201).json({ id: callCount, message: 'created' });
  });

  // Expose call count for assertions
  app.__getCallCount = () => callCount;
  return app;
}

describe('Idempotency Middleware', () => {
  beforeEach(() => {
    mockRedisStore = {};
  });

  // ── 1. No key → normal processing ──────────────────────────────
  test('should process normally when no Idempotency-Key is provided', async () => {
    const app = buildApp();
    const res = await request(app).post('/test').send({ data: 'hello' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 1, message: 'created' });
  });

  // ── 2. First request with key → processes and caches ───────────
  test('should process first request with Idempotency-Key', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/test')
      .set('Idempotency-Key', 'key-001')
      .send({ data: 'hello' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 1, message: 'created' });
    expect(res.headers['idempotent-replayed']).toBeUndefined();
  });

  // ── 3. Duplicate key → returns cached response without calling handler ──
  test('should return cached response for duplicate keys', async () => {
    const app = buildApp();

    // First call
    await request(app).post('/test').set('Idempotency-Key', 'key-dup').send({});

    // Second call — same key
    const res = await request(app).post('/test').set('Idempotency-Key', 'key-dup').send({});

    // Should still report id: 1 (cached) — handler was NOT called again
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 1, message: 'created' });
    expect(res.headers['idempotent-replayed']).toBe('true');
    expect(app.__getCallCount()).toBe(1);
  });

  // ── 4. Invalid key format → 400 ───────────────────────────────
  test('should reject keys with invalid characters', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/test')
      .set('Idempotency-Key', 'bad key with spaces!')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_IDEMPOTENCY_KEY');
  });

  // ── 5. Key too long → 400 ─────────────────────────────────────
  test('should reject keys longer than 128 characters', async () => {
    const app = buildApp();
    const longKey = 'a'.repeat(129);
    const res = await request(app).post('/test').set('Idempotency-Key', longKey).send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_IDEMPOTENCY_KEY');
  });

  // ── 6. Different keys → different responses ────────────────────
  test('should process independently for different keys', async () => {
    const app = buildApp();

    const res1 = await request(app).post('/test').set('Idempotency-Key', 'key-A').send({});

    const res2 = await request(app).post('/test').set('Idempotency-Key', 'key-B').send({});

    expect(res1.body.id).toBe(1);
    expect(res2.body.id).toBe(2);
    expect(app.__getCallCount()).toBe(2);
  });

  // ── 7. Valid key format with dashes and underscores ────────────
  test('should accept keys with dashes and underscores', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/test')
      .set('Idempotency-Key', 'uuid_v4-test-key_123')
      .send({});

    expect(res.status).toBe(201);
  });
});

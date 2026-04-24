/**
 * idempotency-middleware.test.js — covers the Express middleware + the
 * in-memory store that backs it.
 *
 * Scenarios:
 *   • passthrough when no Idempotency-Key header
 *   • passthrough on GET regardless of key
 *   • first POST executes handler, caches response body + status
 *   • second POST with same key replays cached response without re-invoking handler
 *   • concurrent second POST (reservation still pending) gets 409
 *   • 5xx results are NOT cached (the provider should retry cleanly)
 *   • malformed keys (too short / too long) get 400
 *   • scope fn isolates keys per tenant
 */

'use strict';

const express = require('express');
const request = require('supertest');

const idempotency = require('../middleware/idempotency.middleware');
const {
  InMemoryIdempotencyStore,
  setStore,
  getStore,
} = require('../infrastructure/idempotencyStore');

function buildApp({ scope, handler } = {}) {
  const app = express();
  app.use(express.json());
  app.use(idempotency({ scope }));
  app.get('/resource', (_req, res) => res.json({ ok: true, get: true }));
  app.post(
    '/resource',
    handler || ((req, res) => res.status(201).json({ ok: true, received: req.body, t: Date.now() }))
  );
  return app;
}

describe('idempotency middleware', () => {
  beforeEach(() => {
    setStore(new InMemoryIdempotencyStore());
  });

  it('passes through when Idempotency-Key is absent', async () => {
    let calls = 0;
    const app = buildApp({
      handler: (_req, res) => {
        calls++;
        res.status(201).json({ n: calls });
      },
    });
    await request(app).post('/resource').send({ a: 1 }).expect(201);
    await request(app).post('/resource').send({ a: 1 }).expect(201);
    expect(calls).toBe(2);
  });

  it('ignores non-mutating GET even with a key', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/resource')
      .set('Idempotency-Key', 'aaaaaaaa-1111')
      .expect(200);
    expect(res.body.get).toBe(true);
    expect(res.headers['idempotent-replay']).toBeUndefined();
  });

  it('caches the first response and replays on a second call with the same key', async () => {
    let calls = 0;
    const app = buildApp({
      handler: (_req, res) => {
        calls++;
        res.status(201).json({ n: calls });
      },
    });
    const key = 'zatca-post-2026-04-24-aaaa';
    const first = await request(app)
      .post('/resource')
      .set('Idempotency-Key', key)
      .send({ v: 1 })
      .expect(201);
    const second = await request(app)
      .post('/resource')
      .set('Idempotency-Key', key)
      .send({ v: 1 })
      .expect(201);
    expect(calls).toBe(1);
    expect(second.body).toEqual(first.body);
    expect(second.headers['idempotent-replay']).toBe('true');
  });

  it('rejects keys that are too short', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/resource')
      .set('Idempotency-Key', 'short')
      .send({})
      .expect(400);
    expect(res.body.error).toBe('INVALID_IDEMPOTENCY_KEY');
  });

  it('returns 409 while the first request is still pending', async () => {
    const store = new InMemoryIdempotencyStore();
    setStore(store);
    const key = 'long-running-payment-aaaa';
    // Pre-reserve to simulate "in flight on another worker".
    await store.reserve(`global:POST:/resource:${key}`);

    const app = buildApp();
    const res = await request(app)
      .post('/resource')
      .set('Idempotency-Key', key)
      .send({})
      .expect(409);
    expect(res.body.error).toBe('IDEMPOTENT_REQUEST_IN_PROGRESS');
  });

  it('does not cache 5xx responses', async () => {
    let calls = 0;
    const app = buildApp({
      handler: (_req, res) => {
        calls++;
        res.status(503).json({ error: 'DOWNSTREAM_DOWN', n: calls });
      },
    });
    const key = 'retryable-call-aaaa';
    await request(app).post('/resource').set('Idempotency-Key', key).send({}).expect(503);
    await request(app).post('/resource').set('Idempotency-Key', key).send({}).expect(503);
    expect(calls).toBe(2);
  });

  it('isolates keys per scope so two tenants can reuse the same client-side key', async () => {
    let calls = 0;
    const app = buildApp({
      scope: req => req.get('X-Tenant') || 'none',
      handler: (_req, res) => {
        calls++;
        res.status(201).json({ n: calls });
      },
    });
    const key = 'shared-client-key-aaaa';
    await request(app)
      .post('/resource')
      .set('Idempotency-Key', key)
      .set('X-Tenant', 'branch-A')
      .send({})
      .expect(201);
    await request(app)
      .post('/resource')
      .set('Idempotency-Key', key)
      .set('X-Tenant', 'branch-B')
      .send({})
      .expect(201);
    expect(calls).toBe(2);
    expect(getStore()._size()).toBe(2);
  });
});

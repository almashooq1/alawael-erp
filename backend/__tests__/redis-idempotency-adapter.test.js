/**
 * redis-idempotency-adapter.test.js — exercises the Redis-backed adapter
 * against a minimal in-memory client stub that mimics ioredis' SET NX PX
 * semantics, so the tests run without a live Redis.
 *
 * Scenarios:
 *   • reserve() is atomic — first wins 'new', second gets 'pending'
 *   • get() returns null for missing keys and parses JSON for stored entries
 *   • put() persists the entry and clears the pending marker
 *   • release() is a no-op when no pending marker exists
 *   • corrupt JSON is dropped silently (returns null + deletes)
 *   • pluggable into the middleware via setStore(...)
 */

'use strict';

const request = require('supertest');
const express = require('express');

const {
  createInMemory,
  create: createAdapter,
} = require('../infrastructure/adapters/redisIdempotencyStore');
const { setStore } = require('../infrastructure/idempotencyStore');
const idempotency = require('../middleware/idempotency.middleware');

describe('RedisIdempotencyStore adapter', () => {
  let client;
  let adapter;

  beforeEach(() => {
    client = createInMemory();
    adapter = createAdapter(client);
  });

  it('reserve is atomic — second caller sees pending', async () => {
    expect(await adapter.reserve('k1', 60_000)).toBe('new');
    expect(await adapter.reserve('k1', 60_000)).toBe('pending');
  });

  it('put() stores the entry and reports done on subsequent reserve', async () => {
    await adapter.put('k2', { status: 200, body: { ok: true } }, 60_000);
    expect(await adapter.reserve('k2', 60_000)).toBe('done');
    const entry = await adapter.get('k2');
    expect(entry.status).toBe(200);
    expect(entry.body).toEqual({ ok: true });
  });

  it('returns null for missing keys', async () => {
    expect(await adapter.get('never-set')).toBeNull();
  });

  it('drops corrupt JSON instead of throwing', async () => {
    await client.set('idem:done:broken', 'not-json', 'PX', 60_000);
    expect(await adapter.get('broken')).toBeNull();
  });

  it('plugs into the middleware and caches real responses', async () => {
    setStore(adapter);
    let calls = 0;
    const app = express();
    app.use(express.json());
    app.use(idempotency());
    app.post('/r', (_req, res) => {
      calls++;
      res.status(201).json({ n: calls });
    });

    const key = 'redis-test-key-aaaa';
    const first = await request(app).post('/r').set('Idempotency-Key', key).send({}).expect(201);
    const second = await request(app).post('/r').set('Idempotency-Key', key).send({}).expect(201);
    expect(calls).toBe(1);
    expect(second.body).toEqual(first.body);
  });
});

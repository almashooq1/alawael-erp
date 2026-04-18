/**
 * rate-limit-to-429.test.js — end-to-end proof that the three layers
 * (adapterRateLimiter → RateLimitError → safeError → HTTP 429 +
 * Retry-After header) actually work together.
 *
 * Each layer is unit-tested independently; this file locks the
 * contract by driving them through a fake express response.
 *
 * Scenario modeled: ops/SRE sees spike in traffic, hits the rate
 * limit cap, wants an HTTP client (Axios/Retrofit) to back off
 * automatically via the standard Retry-After header.
 */

'use strict';

const audit = require('../services/adapterAuditLogger');
const rateLimiter = require('../services/adapterRateLimiter');
const safeError = require('../utils/safeError');

function mockRes() {
  const res = {
    _status: null,
    _headers: {},
    _body: null,
    status(code) {
      this._status = code;
      return this;
    },
    set(name, value) {
      this._headers[name.toLowerCase()] = value;
      return this;
    },
    json(payload) {
      this._body = payload;
      return this;
    },
  };
  return res;
}

describe('rate-limit → 429 + Retry-After end-to-end', () => {
  beforeEach(() => rateLimiter._resetAll());

  it('wrap() throws RateLimitError → safeError emits 429 + Retry-After', async () => {
    // Tight bucket: 1 request, refill 1/min → 2nd request denied.
    process.env.GOSI_RL_CAPACITY = '1';
    process.env.GOSI_RL_REFILL_PER_MIN = '1';
    process.env.GOSI_RL_ACTOR_CAP = '5';
    try {
      const fakeAdapter = async () => ({
        status: 'active',
        mode: 'live',
        latencyMs: 10,
      });

      // 1st call — consumes the single token
      await audit.wrap({ provider: 'gosi', operation: 'verify', target: 'x' }, fakeAdapter);

      // 2nd call — must throw RateLimitError
      let caught;
      try {
        await audit.wrap({ provider: 'gosi', operation: 'verify', target: 'y' }, fakeAdapter);
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeDefined();
      expect(caught.name).toBe('RateLimitError');
      expect(caught.statusCode).toBe(429);
      expect(caught.code).toBe('RATE_LIMITED');
      expect(caught.retryAfterMs).toBeGreaterThan(0);
      expect(caught.provider).toBe('gosi');

      // Route-layer: feed the RateLimitError into safeError and verify
      // the wire contract (the part Axios/Retrofit + Retry-After honor).
      const res = mockRes();
      safeError(res, caught, 'test.route');

      expect(res._status).toBe(429);
      expect(res._headers['retry-after']).toBeDefined();
      // Header MUST be integer seconds (RFC 9110 §10.2.3)
      expect(res._headers['retry-after']).toMatch(/^\d+$/);
      // Seconds value corresponds to ms/1000 rounded up
      const headerSec = parseInt(res._headers['retry-after'], 10);
      expect(headerSec).toBeGreaterThanOrEqual(1);
      expect(headerSec).toBeLessThanOrEqual(Math.ceil(caught.retryAfterMs / 1000));

      // JSON body carries the same retryAfterMs as the header (but in ms)
      expect(res._body).toMatchObject({
        success: false,
        code: 'RATE_LIMITED',
        retryAfterMs: caught.retryAfterMs,
        scope: expect.any(String),
        provider: 'gosi',
      });
    } finally {
      delete process.env.GOSI_RL_CAPACITY;
      delete process.env.GOSI_RL_REFILL_PER_MIN;
      delete process.env.GOSI_RL_ACTOR_CAP;
    }
  });

  it('per-actor cap trips before provider pool (scope=actor)', async () => {
    process.env.ABSHER_RL_CAPACITY = '10';
    process.env.ABSHER_RL_REFILL_PER_MIN = '60';
    process.env.ABSHER_RL_ACTOR_CAP = '2';
    try {
      const actor = { id: 'u1', email: 'u1@x.com' };
      const req = { user: actor, ip: '10.0.0.1', get: () => 'jest' };
      const fakeAdapter = async () => ({ status: 'match', mode: 'live', latencyMs: 5 });

      await audit.wrap({ req, provider: 'absher', operation: 'verify' }, fakeAdapter);
      await audit.wrap({ req, provider: 'absher', operation: 'verify' }, fakeAdapter);

      let caught;
      try {
        await audit.wrap({ req, provider: 'absher', operation: 'verify' }, fakeAdapter);
      } catch (err) {
        caught = err;
      }
      expect(caught?.name).toBe('RateLimitError');
      expect(caught.scope).toBe('actor');

      // Different actor still has budget — proves the actor-cap isn't
      // shared across users.
      const otherReq = { user: { id: 'u2', email: 'u2@x.com' }, ip: '10.0.0.2' };
      const ok = await audit.wrap(
        { req: otherReq, provider: 'absher', operation: 'verify' },
        fakeAdapter
      );
      expect(ok.status).toBe('match');
    } finally {
      delete process.env.ABSHER_RL_CAPACITY;
      delete process.env.ABSHER_RL_REFILL_PER_MIN;
      delete process.env.ABSHER_RL_ACTOR_CAP;
    }
  });

  it('skipRateLimit=true bypasses the gate even under pressure', async () => {
    process.env.NPHIES_RL_CAPACITY = '1';
    process.env.NPHIES_RL_REFILL_PER_MIN = '1';
    try {
      const fakeAdapter = async () => ({ status: 'eligible', mode: 'live', latencyMs: 3 });

      // Drain the pool
      await audit.wrap({ provider: 'nphies', operation: 'check' }, fakeAdapter);

      // Normal call would 429 — but skipRateLimit wins.
      const ok = await audit.wrap(
        { provider: 'nphies', operation: 'test-connection', skipRateLimit: true },
        fakeAdapter
      );
      expect(ok.status).toBe('eligible');
    } finally {
      delete process.env.NPHIES_RL_CAPACITY;
      delete process.env.NPHIES_RL_REFILL_PER_MIN;
    }
  });
});

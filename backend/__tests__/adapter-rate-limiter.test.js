/**
 * adapter-rate-limiter.test.js — unit tests for the per-adapter
 * token-bucket rate limiter.
 *
 * Covers:
 *   • default config per provider (gosi/absher/nphies/fatoora)
 *   • env override via {PROVIDER}_RL_* variables
 *   • provider-pool exhaustion returns retryAfterMs + scope='provider'
 *   • per-actor cap triggers scope='actor' before pool exhaustion
 *   • refill restores tokens over time
 *   • status() snapshot shape for dashboard consumption
 *   • reset() clears bucket state
 *   • RateLimitError integration via adapterAuditLogger.wrap
 */

'use strict';

const rl = require('../services/adapterRateLimiter');
const audit = require('../services/adapterAuditLogger');

beforeEach(() => rl._resetAll());

describe('configFor', () => {
  it('returns sensible defaults for known providers', () => {
    expect(rl.configFor('gosi')).toEqual({ capacity: 60, refillPerMinute: 30, actorCap: 20 });
    expect(rl.configFor('absher')).toEqual({ capacity: 30, refillPerMinute: 10, actorCap: 5 });
    expect(rl.configFor('nphies')).toEqual({ capacity: 120, refillPerMinute: 60, actorCap: 30 });
    expect(rl.configFor('fatoora')).toEqual({ capacity: 600, refillPerMinute: 600, actorCap: 200 });
  });

  it('falls back to 60/30/20 for unknown providers', () => {
    expect(rl.configFor('xxx')).toEqual({ capacity: 60, refillPerMinute: 30, actorCap: 20 });
  });

  it('honors env overrides', () => {
    process.env.GOSI_RL_CAPACITY = '5';
    process.env.GOSI_RL_REFILL_PER_MIN = '2';
    process.env.GOSI_RL_ACTOR_CAP = '3';
    try {
      expect(rl.configFor('gosi')).toEqual({ capacity: 5, refillPerMinute: 2, actorCap: 3 });
    } finally {
      delete process.env.GOSI_RL_CAPACITY;
      delete process.env.GOSI_RL_REFILL_PER_MIN;
      delete process.env.GOSI_RL_ACTOR_CAP;
    }
  });
});

describe('take() — provider pool', () => {
  it('allows up to capacity then denies with scope=provider', () => {
    // Tight env override for a deterministic test
    process.env.BALADY_RL_CAPACITY = '3';
    process.env.BALADY_RL_REFILL_PER_MIN = '1';
    process.env.BALADY_RL_ACTOR_CAP = '100';
    try {
      // Different actors to stay under per-actor cap
      expect(rl.take('balady', { actorId: 'a' }).allowed).toBe(true);
      expect(rl.take('balady', { actorId: 'b' }).allowed).toBe(true);
      expect(rl.take('balady', { actorId: 'c' }).allowed).toBe(true);
      const denied = rl.take('balady', { actorId: 'd' });
      expect(denied.allowed).toBe(false);
      expect(denied.scope).toBe('provider');
      expect(denied.retryAfterMs).toBeGreaterThan(0);
      expect(denied.reason).toMatch(/exhausted/);
    } finally {
      delete process.env.BALADY_RL_CAPACITY;
      delete process.env.BALADY_RL_REFILL_PER_MIN;
      delete process.env.BALADY_RL_ACTOR_CAP;
    }
  });

  it('per-actor cap denies before provider pool is drained', () => {
    process.env.MUQEEM_RL_CAPACITY = '100';
    process.env.MUQEEM_RL_REFILL_PER_MIN = '60';
    process.env.MUQEEM_RL_ACTOR_CAP = '2';
    try {
      expect(rl.take('muqeem', { actorId: 'same' }).allowed).toBe(true);
      expect(rl.take('muqeem', { actorId: 'same' }).allowed).toBe(true);
      const denied = rl.take('muqeem', { actorId: 'same' });
      expect(denied.allowed).toBe(false);
      expect(denied.scope).toBe('actor');
      expect(denied.retryAfterMs).toBeLessThanOrEqual(60_000);
    } finally {
      delete process.env.MUQEEM_RL_CAPACITY;
      delete process.env.MUQEEM_RL_REFILL_PER_MIN;
      delete process.env.MUQEEM_RL_ACTOR_CAP;
    }
  });

  it('different actors share provider pool but have independent caps', () => {
    process.env.QIWA_RL_CAPACITY = '10';
    process.env.QIWA_RL_REFILL_PER_MIN = '1';
    process.env.QIWA_RL_ACTOR_CAP = '2';
    try {
      expect(rl.take('qiwa', { actorId: 'alice' }).allowed).toBe(true);
      expect(rl.take('qiwa', { actorId: 'alice' }).allowed).toBe(true);
      expect(rl.take('qiwa', { actorId: 'alice' }).allowed).toBe(false); // alice capped
      expect(rl.take('qiwa', { actorId: 'bob' }).allowed).toBe(true); // bob fresh
      expect(rl.take('qiwa', { actorId: 'bob' }).allowed).toBe(true);
      expect(rl.take('qiwa', { actorId: 'bob' }).allowed).toBe(false); // bob capped
    } finally {
      delete process.env.QIWA_RL_CAPACITY;
      delete process.env.QIWA_RL_REFILL_PER_MIN;
      delete process.env.QIWA_RL_ACTOR_CAP;
    }
  });

  it('falls back to ipHash when actorId is absent', () => {
    process.env.NAFATH_RL_ACTOR_CAP = '1';
    try {
      expect(rl.take('nafath', { ipHash: 'deadbeef' }).allowed).toBe(true);
      expect(rl.take('nafath', { ipHash: 'deadbeef' }).allowed).toBe(false);
      expect(rl.take('nafath', { ipHash: 'other' }).allowed).toBe(true);
    } finally {
      delete process.env.NAFATH_RL_ACTOR_CAP;
    }
  });
});

describe('refill', () => {
  it('refills tokens as time passes', () => {
    process.env.SCFHS_RL_CAPACITY = '2';
    process.env.SCFHS_RL_REFILL_PER_MIN = '60';
    try {
      expect(rl.take('scfhs', { actorId: 'x' }).allowed).toBe(true);
      expect(rl.take('scfhs', { actorId: 'y' }).allowed).toBe(true);
      expect(rl.take('scfhs', { actorId: 'z' }).allowed).toBe(false);

      // Fast-forward clock by 1.1s (=> ~1.1 tokens at 60/min)
      const realNow = Date.now;
      const jumped = realNow() + 1100;
      Date.now = () => jumped;
      try {
        expect(rl.take('scfhs', { actorId: 'z' }).allowed).toBe(true);
      } finally {
        Date.now = realNow;
      }
    } finally {
      delete process.env.SCFHS_RL_CAPACITY;
      delete process.env.SCFHS_RL_REFILL_PER_MIN;
    }
  });
});

describe('status', () => {
  it('returns full snapshot shape for unused provider', () => {
    const s = rl.status('gosi');
    expect(s).toMatchObject({
      provider: 'gosi',
      configured: true,
      capacity: expect.any(Number),
      refillPerMinute: expect.any(Number),
      actorCap: expect.any(Number),
      available: expect.any(Number),
      utilization: expect.any(Number),
      activeActors: expect.any(Number),
    });
  });

  it('reports utilization after takes', () => {
    rl.take('wasel', { actorId: 'x' });
    rl.take('wasel', { actorId: 'y' });
    const s = rl.status('wasel');
    expect(s.activeActors).toBeGreaterThanOrEqual(2);
    expect(s.available).toBeLessThan(s.capacity);
    expect(s.utilization).toBeGreaterThan(0);
  });
});

describe('reset', () => {
  it('clears bucket state', () => {
    process.env.ABSHER_RL_CAPACITY = '2';
    try {
      rl.take('absher', { actorId: 'a' });
      rl.take('absher', { actorId: 'b' });
      expect(rl.take('absher', { actorId: 'c' }).allowed).toBe(false);
      rl.reset('absher');
      expect(rl.take('absher', { actorId: 'c' }).allowed).toBe(true);
    } finally {
      delete process.env.ABSHER_RL_CAPACITY;
    }
  });
});

describe('integration with adapterAuditLogger.wrap', () => {
  it('throws RateLimitError with statusCode=429 when pool exhausted', async () => {
    process.env.FATOORA_RL_CAPACITY = '1';
    process.env.FATOORA_RL_REFILL_PER_MIN = '1';
    process.env.FATOORA_RL_ACTOR_CAP = '5';
    try {
      const fakeReq = { user: { id: 'u1', email: 'u1@x.com' }, ip: '127.0.0.1', get: () => 'jest' };
      const fakeAdapter = async () => ({ status: 'ok', mode: 'mock', latencyMs: 1 });

      await audit.wrap(
        { req: fakeReq, provider: 'fatoora', operation: 'test', target: '1' },
        fakeAdapter
      );

      let err;
      try {
        await audit.wrap(
          {
            req: { ...fakeReq, user: { id: 'u2', email: 'u2@x.com' } },
            provider: 'fatoora',
            operation: 'test',
            target: '2',
          },
          fakeAdapter
        );
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(audit.RateLimitError);
      expect(err.statusCode).toBe(429);
      expect(err.code).toBe('RATE_LIMITED');
      expect(err.provider).toBe('fatoora');
      expect(err.retryAfterMs).toBeGreaterThan(0);
    } finally {
      delete process.env.FATOORA_RL_CAPACITY;
      delete process.env.FATOORA_RL_REFILL_PER_MIN;
      delete process.env.FATOORA_RL_ACTOR_CAP;
    }
  });

  it('skipRateLimit=true bypasses the check', async () => {
    process.env.NPHIES_RL_CAPACITY = '1';
    process.env.NPHIES_RL_REFILL_PER_MIN = '1';
    try {
      const fakeAdapter = async () => ({ status: 'ok', mode: 'mock', latencyMs: 1 });
      // Drain
      await audit.wrap({ provider: 'nphies', operation: 'x', skipRateLimit: false }, fakeAdapter);
      // Second should bypass
      const r = await audit.wrap(
        { provider: 'nphies', operation: 'x', skipRateLimit: true },
        fakeAdapter
      );
      expect(r.status).toBe('ok');
    } finally {
      delete process.env.NPHIES_RL_CAPACITY;
      delete process.env.NPHIES_RL_REFILL_PER_MIN;
    }
  });
});

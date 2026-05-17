/**
 * mfa-bruteforce-wave37.test.js — Wave 37.
 *
 * Closes red-team finding #4 from the authorization challenger pass:
 * per-challenge MAX_VERIFY_ATTEMPTS=5 resets when the attacker creates
 * a fresh challenge, so without per-USER ceilings the brute-force is
 * just a speedbump.
 *
 * This suite covers:
 *
 *   1. Per-user failed-attempts counter spans challenges:
 *      • Failures on challenge A count toward the user's 24h ceiling
 *      • Hitting the ceiling locks the user
 *      • While locked, createChallenge AND verifyChallenge are refused
 *      • Successful verify clears the counter
 *      • Lockout expires after userLockoutMs (clock-injected)
 *
 *   2. Challenge-creation rate limit:
 *      • After maxChallengesPerHour, createChallenge returns
 *        CHALLENGE_RATE_LIMITED with retryAfterMs
 *      • Sliding 1h window — oldest challenge dropping unlocks creation
 *
 *   3. Exponential backoff:
 *      • Verify too soon after a failure → VERIFY_TOO_SOON with
 *        retryAfterMs
 *      • After waiting enough, verify is accepted again
 *      • Backoff grows 2^(attempt-1): 2s / 4s / 8s / 16s
 *
 *   4. Admin unlock:
 *      • unlockUser clears lockout + failure history
 *      • Audit event emitted
 *
 *   5. Routes pass through the new reasons:
 *      • 429 status code
 *      • Retry-After header set
 *      • lockedUntil surfaced in body
 */

'use strict';

const express = require('express');
const request = require('supertest');

const {
  createMfaChallengeService,
  REASON,
  DEFAULT_USER_MAX_FAILED_PER_24H,
  DEFAULT_MAX_CHALLENGES_PER_HOUR,
  DEFAULT_BACKOFF_BASE_MS,
  DEFAULT_USER_LOCKOUT_MS,
} = require('../intelligence/mfa-challenge.service');
const createMfaChallengeRouter = require('../routes/mfa-challenge.routes');

function clock(initial) {
  const ref = { t: initial.getTime() };
  return {
    now: () => new Date(ref.t),
    advance: ms => {
      ref.t += ms;
    },
    set: d => {
      ref.t = d.getTime();
    },
  };
}

// ─── 1. Per-user failed-attempts counter ───────────────────────────

describe('Wave 37 — per-user failed-attempts counter', () => {
  test('failures span challenges and lock the user at the ceiling', async () => {
    const c = clock(new Date('2026-05-17T10:00:00Z'));
    const audit = { log: jest.fn(async () => {}) };
    const svc = createMfaChallengeService({
      totpVerifier: async ({ token }) => token === '123456',
      userMaxFailedPer24h: 3,
      backoffBaseMs: 0,
      now: c.now,
      auditLogger: audit,
      logger: { warn: () => {}, info: () => {} },
    });

    // 3 failures spread across 2 separate challenges
    const ch1 = await svc.createChallenge({ userId: 'U-1', requiredTier: 2 });
    await svc.verifyChallenge({ challengeId: ch1.challengeId, token: '000000' });
    await svc.verifyChallenge({ challengeId: ch1.challengeId, token: '000000' });

    const ch2 = await svc.createChallenge({ userId: 'U-1', requiredTier: 2 });
    const third = await svc.verifyChallenge({ challengeId: ch2.challengeId, token: '000000' });

    // 3rd cumulative failure trips the user-lockout
    expect(third.ok).toBe(false);
    expect(third.reason).toBe(REASON.USER_TEMP_LOCKED);
    expect(third.lockedUntil).toBeInstanceOf(Date);

    // Subsequent createChallenge refuses
    const ch3 = await svc.createChallenge({ userId: 'U-1', requiredTier: 2 });
    expect(ch3.ok).toBe(false);
    expect(ch3.reason).toBe(REASON.USER_TEMP_LOCKED);

    // Audit emitted
    const actions = audit.log.mock.calls.map(cc => cc[0].action);
    expect(actions).toContain('mfa.user.locked');
  });

  test('successful verify clears the failure counter', async () => {
    const c = clock(new Date('2026-05-17T10:00:00Z'));
    const svc = createMfaChallengeService({
      totpVerifier: async ({ token }) => token === '123456',
      userMaxFailedPer24h: 3,
      backoffBaseMs: 0,
      now: c.now,
      auditLogger: { log: jest.fn(async () => {}) },
      logger: { warn: () => {}, info: () => {} },
    });

    const ch1 = await svc.createChallenge({ userId: 'U-2', requiredTier: 2 });
    await svc.verifyChallenge({ challengeId: ch1.challengeId, token: '000000' });
    await svc.verifyChallenge({ challengeId: ch1.challengeId, token: '000000' });

    // 2 failures so far — succeed before ceiling
    const ch2 = await svc.createChallenge({ userId: 'U-2', requiredTier: 2 });
    const ok = await svc.verifyChallenge({ challengeId: ch2.challengeId, token: '123456' });
    expect(ok.ok).toBe(true);

    // Counter should be cleared — 3 new failures shouldn't lock
    const ch3 = await svc.createChallenge({ userId: 'U-2', requiredTier: 2 });
    await svc.verifyChallenge({ challengeId: ch3.challengeId, token: '000000' });
    await svc.verifyChallenge({ challengeId: ch3.challengeId, token: '000000' });
    const state = svc.getUserState('U-2');
    expect(state.locked).toBe(false);
  });

  test('lockout expires after userLockoutMs', async () => {
    const c = clock(new Date('2026-05-17T10:00:00Z'));
    const svc = createMfaChallengeService({
      totpVerifier: async ({ token }) => token === '123456',
      userMaxFailedPer24h: 2,
      userLockoutMs: 30 * 60 * 1000,
      backoffBaseMs: 0,
      now: c.now,
      auditLogger: { log: jest.fn(async () => {}) },
      logger: { warn: () => {}, info: () => {} },
    });

    const ch = await svc.createChallenge({ userId: 'U-3', requiredTier: 2 });
    await svc.verifyChallenge({ challengeId: ch.challengeId, token: '000000' });
    await svc.verifyChallenge({ challengeId: ch.challengeId, token: '000000' });
    expect(svc.getUserState('U-3').locked).toBe(true);

    // Fast-forward past lockout window
    c.advance(31 * 60 * 1000);
    expect(svc.getUserState('U-3').locked).toBe(false);

    // createChallenge succeeds again
    const ch2 = await svc.createChallenge({ userId: 'U-3', requiredTier: 2 });
    expect(ch2.ok).toBe(true);
  });

  test('default ceiling is 10/24h', () => {
    expect(DEFAULT_USER_MAX_FAILED_PER_24H).toBe(10);
    expect(DEFAULT_USER_LOCKOUT_MS).toBe(30 * 60 * 1000);
  });
});

// ─── 2. Challenge-creation rate limit ──────────────────────────────

describe('Wave 37 — createChallenge rate limit', () => {
  test('refuses after maxChallengesPerHour', async () => {
    const c = clock(new Date('2026-05-17T10:00:00Z'));
    const svc = createMfaChallengeService({
      totpVerifier: async () => false,
      maxChallengesPerHour: 3,
      userMaxFailedPer24h: Infinity,
      backoffBaseMs: 0,
      now: c.now,
      auditLogger: { log: jest.fn(async () => {}) },
      logger: { warn: () => {}, info: () => {} },
    });

    for (let i = 0; i < 3; i++) {
      const r = await svc.createChallenge({ userId: 'U-R', requiredTier: 2 });
      expect(r.ok).toBe(true);
      c.advance(1000);
    }

    const fourth = await svc.createChallenge({ userId: 'U-R', requiredTier: 2 });
    expect(fourth.ok).toBe(false);
    expect(fourth.reason).toBe(REASON.CHALLENGE_RATE_LIMITED);
    expect(typeof fourth.retryAfterMs).toBe('number');
    expect(fourth.retryAfterMs).toBeGreaterThan(0);
  });

  test('sliding 1h window — oldest entry dropping unblocks creation', async () => {
    const c = clock(new Date('2026-05-17T10:00:00Z'));
    const svc = createMfaChallengeService({
      totpVerifier: async () => false,
      maxChallengesPerHour: 2,
      userMaxFailedPer24h: Infinity,
      backoffBaseMs: 0,
      now: c.now,
      auditLogger: { log: jest.fn(async () => {}) },
      logger: { warn: () => {}, info: () => {} },
    });

    await svc.createChallenge({ userId: 'U-S', requiredTier: 2 });
    c.advance(30 * 60 * 1000); // T+30m
    await svc.createChallenge({ userId: 'U-S', requiredTier: 2 });

    // 3rd within 1h → blocked
    const blocked = await svc.createChallenge({ userId: 'U-S', requiredTier: 2 });
    expect(blocked.reason).toBe(REASON.CHALLENGE_RATE_LIMITED);

    // Wait until the FIRST entry slides out (T+61m → first @ T+0 drops)
    c.advance(31 * 60 * 1000); // T+61m total
    const ok = await svc.createChallenge({ userId: 'U-S', requiredTier: 2 });
    expect(ok.ok).toBe(true);
  });

  test('default rate limit is 6/hour', () => {
    expect(DEFAULT_MAX_CHALLENGES_PER_HOUR).toBe(6);
  });
});

// ─── 3. Exponential backoff between failed verifies ────────────────

describe('Wave 37 — exponential backoff', () => {
  test('rejects verify too soon after a failure', async () => {
    const c = clock(new Date('2026-05-17T10:00:00Z'));
    const svc = createMfaChallengeService({
      totpVerifier: async () => false,
      userMaxFailedPer24h: Infinity,
      backoffBaseMs: 2000,
      now: c.now,
      auditLogger: { log: jest.fn(async () => {}) },
      logger: { warn: () => {}, info: () => {} },
    });

    const ch = await svc.createChallenge({ userId: 'U-B', requiredTier: 2 });
    const first = await svc.verifyChallenge({ challengeId: ch.challengeId, token: 'bad' });
    expect(first.reason).toBe(REASON.OTP_INVALID);

    // Immediately retry — should hit backoff
    const tooSoon = await svc.verifyChallenge({ challengeId: ch.challengeId, token: 'bad' });
    expect(tooSoon.reason).toBe(REASON.VERIFY_TOO_SOON);
    expect(tooSoon.retryAfterMs).toBeGreaterThan(0);
    expect(tooSoon.retryAfterMs).toBeLessThanOrEqual(2000);
  });

  test('accepts verify after backoff window elapses', async () => {
    const c = clock(new Date('2026-05-17T10:00:00Z'));
    const svc = createMfaChallengeService({
      totpVerifier: async ({ token }) => token === '123456',
      userMaxFailedPer24h: Infinity,
      backoffBaseMs: 2000,
      now: c.now,
      auditLogger: { log: jest.fn(async () => {}) },
      logger: { warn: () => {}, info: () => {} },
    });

    const ch = await svc.createChallenge({ userId: 'U-B', requiredTier: 2 });
    await svc.verifyChallenge({ challengeId: ch.challengeId, token: 'bad' });
    c.advance(2100); // wait past 2s backoff
    const ok = await svc.verifyChallenge({ challengeId: ch.challengeId, token: '123456' });
    expect(ok.ok).toBe(true);
  });

  test('backoff doubles each attempt (2/4/8s)', async () => {
    const c = clock(new Date('2026-05-17T10:00:00Z'));
    const svc = createMfaChallengeService({
      totpVerifier: async () => false,
      userMaxFailedPer24h: Infinity,
      backoffBaseMs: 2000,
      now: c.now,
      auditLogger: { log: jest.fn(async () => {}) },
      logger: { warn: () => {}, info: () => {} },
    });

    const ch = await svc.createChallenge({ userId: 'U-B', requiredTier: 2 });

    // Attempt 1 → fail
    await svc.verifyChallenge({ challengeId: ch.challengeId, token: 'bad' });
    // After 2s exactly, attempt 2 should pass the backoff gate and fail again
    c.advance(2100);
    const r2 = await svc.verifyChallenge({ challengeId: ch.challengeId, token: 'bad' });
    expect(r2.reason).toBe(REASON.OTP_INVALID);

    // After 2s wait, attempt 3 should still be blocked (need 4s)
    c.advance(2100);
    const tooSoon = await svc.verifyChallenge({ challengeId: ch.challengeId, token: 'bad' });
    expect(tooSoon.reason).toBe(REASON.VERIFY_TOO_SOON);

    // After another 2s (total 4.2s), attempt 3 should fire
    c.advance(2100);
    const r3 = await svc.verifyChallenge({ challengeId: ch.challengeId, token: 'bad' });
    expect(r3.reason).toBe(REASON.OTP_INVALID);
  });

  test('default backoff base is 2 seconds', () => {
    expect(DEFAULT_BACKOFF_BASE_MS).toBe(2000);
  });
});

// ─── 4. Admin unlockUser ───────────────────────────────────────────

describe('Wave 37 — admin unlockUser', () => {
  test('clears lockout + failure history', async () => {
    const c = clock(new Date('2026-05-17T10:00:00Z'));
    const audit = { log: jest.fn(async () => {}) };
    const svc = createMfaChallengeService({
      totpVerifier: async () => false,
      userMaxFailedPer24h: 2,
      backoffBaseMs: 0,
      now: c.now,
      auditLogger: audit,
      logger: { warn: () => {}, info: () => {} },
    });

    const ch = await svc.createChallenge({ userId: 'U-U', requiredTier: 2 });
    await svc.verifyChallenge({ challengeId: ch.challengeId, token: 'bad' });
    await svc.verifyChallenge({ challengeId: ch.challengeId, token: 'bad' });
    expect(svc.getUserState('U-U').locked).toBe(true);

    const u = await svc.unlockUser({ userId: 'U-U', actor: { userId: 'ADMIN-1' } });
    expect(u.ok).toBe(true);
    expect(svc.getUserState('U-U').locked).toBe(false);
    expect(svc.getUserState('U-U').failedCount).toBe(0);

    const actions = audit.log.mock.calls.map(cc => cc[0].action);
    expect(actions).toContain('mfa.user.unlocked');
  });

  test('USER_REQUIRED when called without userId', async () => {
    const svc = createMfaChallengeService({
      totpVerifier: async () => false,
      logger: { warn: () => {}, info: () => {} },
      auditLogger: { log: jest.fn(async () => {}) },
    });
    const r = await svc.unlockUser({});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(REASON.USER_REQUIRED);
  });
});

// ─── 5. Routes surface 429 + Retry-After ───────────────────────────

describe('Wave 37 — routes surface brute-force denials', () => {
  function makeApp(svc, userId = 'U-1') {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = { id: userId, role: 'therapist' };
      next();
    });
    app.use('/api/v1/mfa', createMfaChallengeRouter({ service: svc }));
    return app;
  }

  test('429 + Retry-After when challenge rate limited', async () => {
    const c = clock(new Date('2026-05-17T10:00:00Z'));
    const svc = createMfaChallengeService({
      totpVerifier: async () => false,
      maxChallengesPerHour: 1,
      userMaxFailedPer24h: Infinity,
      backoffBaseMs: 0,
      now: c.now,
      auditLogger: { log: jest.fn(async () => {}) },
      logger: { warn: () => {}, info: () => {} },
    });
    const app = makeApp(svc);

    await request(app).post('/api/v1/mfa/challenge').send({ requiredTier: 2 });
    const r = await request(app).post('/api/v1/mfa/challenge').send({ requiredTier: 2 });
    expect(r.status).toBe(429);
    expect(r.body.reason).toBe('CHALLENGE_RATE_LIMITED');
    expect(r.headers['retry-after']).toBeDefined();
    expect(Number(r.headers['retry-after'])).toBeGreaterThan(0);
  });

  test('429 + lockedUntil body field when user temp locked', async () => {
    const c = clock(new Date('2026-05-17T10:00:00Z'));
    const svc = createMfaChallengeService({
      totpVerifier: async () => false,
      userMaxFailedPer24h: 1,
      backoffBaseMs: 0,
      now: c.now,
      auditLogger: { log: jest.fn(async () => {}) },
      logger: { warn: () => {}, info: () => {} },
    });
    const app = makeApp(svc, 'U-LOCK');

    const create = await request(app).post('/api/v1/mfa/challenge').send({ requiredTier: 2 });
    const id = create.body.data.challengeId;
    const r = await request(app).post(`/api/v1/mfa/${id}/verify`).send({ token: 'bad' });
    expect(r.status).toBe(429);
    expect(r.body.reason).toBe('USER_TEMP_LOCKED');
    expect(r.body.lockedUntil).toBeDefined();
    expect(r.headers['retry-after']).toBeDefined();
  });

  test('429 VERIFY_TOO_SOON when backoff blocks retry', async () => {
    const c = clock(new Date('2026-05-17T10:00:00Z'));
    const svc = createMfaChallengeService({
      totpVerifier: async () => false,
      userMaxFailedPer24h: Infinity,
      backoffBaseMs: 2000,
      now: c.now,
      auditLogger: { log: jest.fn(async () => {}) },
      logger: { warn: () => {}, info: () => {} },
    });
    const app = makeApp(svc);

    const create = await request(app).post('/api/v1/mfa/challenge').send({ requiredTier: 2 });
    const id = create.body.data.challengeId;
    await request(app).post(`/api/v1/mfa/${id}/verify`).send({ token: 'bad' });
    const r = await request(app).post(`/api/v1/mfa/${id}/verify`).send({ token: 'bad' });
    expect(r.status).toBe(429);
    expect(r.body.reason).toBe('VERIFY_TOO_SOON');
    expect(r.headers['retry-after']).toBeDefined();
  });
});

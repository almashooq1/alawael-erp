/**
 * mfa-challenge-wave36.test.js — Wave 36.
 *
 * Covers the step-up MFA flow that operationalises Constitution §12:
 *
 *   1. Service — createChallenge:
 *      • USER_REQUIRED when no userId
 *      • INVALID_TIER for tiers ≠ 2/3
 *      • Returns id + expiresAt + instructions
 *      • Tier-3 expiry is tighter than tier-2
 *      • Loads enrollment from injected mfaSettingsModel
 *
 *   2. Service — verifyChallenge:
 *      • CHALLENGE_NOT_FOUND for unknown id
 *      • CHALLENGE_EXPIRED when past expiresAt
 *      • CHALLENGE_ALREADY_VERIFIED on repeat verify
 *      • OTP_INVALID with attemptsRemaining
 *      • CHALLENGE_LOCKED after MAX_VERIFY_ATTEMPTS
 *      • Success → sessionUpdater called with new tier + assertedAt
 *      • Success emits mfa.challenge.verified audit event
 *
 *   3. Service — getChallengeStatus:
 *      • verified / expired / locked flags
 *      • attemptsRemaining counter
 *
 *   4. requireMfa(tier) middleware:
 *      • Passes when actor.mfaLevel ≥ tier AND fresh
 *      • 401 STEP_UP_MFA_REQUIRED when tier too low
 *      • 401 MFA_FRESHNESS_REQUIRED when assertion stale
 *
 *   5. Routes:
 *      • POST /challenge with tier 1 → 400 INVALID_TIER
 *      • POST /challenge → 200 with challengeId
 *      • POST /:id/verify success → 200 with sessionUpgrade
 *      • POST /:id/verify wrong token → 401 OTP_INVALID
 *      • GET  /:id → status
 *      • Full integration: create → verify → status verified=true
 */

'use strict';

const express = require('express');
const request = require('supertest');

const {
  createMfaChallengeService,
  REASON,
  DEFAULT_TIER_2_EXPIRY_MS,
  DEFAULT_TIER_3_EXPIRY_MS,
  MAX_VERIFY_ATTEMPTS,
} = require('../intelligence/mfa-challenge.service');
const createMfaChallengeRouter = require('../routes/mfa-challenge.routes');

// ─── helpers ──────────────────────────────────────────────────────

function makeService(opts = {}) {
  return createMfaChallengeService({
    totpVerifier: async ({ token }) => token === '123456',
    auditLogger: { log: jest.fn(async () => {}) },
    logger: { warn: () => {}, info: () => {} },
    ...opts,
  });
}

function makeApp(service, fakeUserId = 'U-1') {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (fakeUserId) req.user = { id: fakeUserId, role: 'therapist' };
    next();
  });
  app.use('/api/v1/mfa', createMfaChallengeRouter({ service }));
  return app;
}

// ─── 1. createChallenge ───────────────────────────────────────────

describe('mfa-challenge.service — createChallenge', () => {
  test('USER_REQUIRED when userId missing', async () => {
    const svc = makeService();
    const r = await svc.createChallenge({ requiredTier: 2 });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(REASON.USER_REQUIRED);
  });

  test('INVALID_TIER for tier 1 or 4', async () => {
    const svc = makeService();
    expect((await svc.createChallenge({ userId: 'U-1', requiredTier: 1 })).reason).toBe(
      REASON.INVALID_TIER
    );
    expect((await svc.createChallenge({ userId: 'U-1', requiredTier: 4 })).reason).toBe(
      REASON.INVALID_TIER
    );
  });

  test('issues a challenge with id + expiresAt + method', async () => {
    const svc = makeService();
    const r = await svc.createChallenge({ userId: 'U-1', requiredTier: 2, method: 'totp' });
    expect(r.ok).toBe(true);
    expect(typeof r.challengeId).toBe('string');
    expect(r.requiredTier).toBe(2);
    expect(r.method).toBe('totp');
    expect(r.expiresAt).toBeInstanceOf(Date);
    expect(typeof r.instructions).toBe('string');
  });

  test('tier-3 expiry is tighter than tier-2', async () => {
    const svc = makeService();
    const t2 = await svc.createChallenge({ userId: 'U-1', requiredTier: 2 });
    const t3 = await svc.createChallenge({ userId: 'U-1', requiredTier: 3 });
    const t2span = t2.expiresAt.getTime() - Date.now();
    const t3span = t3.expiresAt.getTime() - Date.now();
    expect(t3span).toBeLessThan(t2span);
    expect(t2span).toBeLessThanOrEqual(DEFAULT_TIER_2_EXPIRY_MS + 50);
    expect(t3span).toBeLessThanOrEqual(DEFAULT_TIER_3_EXPIRY_MS + 50);
  });

  test('loads enrollment from mfaSettingsModel when provided', async () => {
    const findOne = jest.fn(() => ({
      select: () => ({
        lean: async () => ({ userId: 'U-1', methods: ['totp', 'sms'], totpSecret: 'XYZ' }),
      }),
    }));
    const svc = makeService({ mfaSettingsModel: { findOne } });
    const r = await svc.createChallenge({ userId: 'U-1', requiredTier: 2 });
    expect(r.ok).toBe(true);
    expect(findOne).toHaveBeenCalledWith({ userId: 'U-1' });
  });

  test('emits audit event on creation', async () => {
    const audit = { log: jest.fn(async () => {}) };
    const svc = makeService({ auditLogger: audit });
    await svc.createChallenge({ userId: 'U-1', requiredTier: 2, actor: { userId: 'U-1' } });
    expect(audit.log).toHaveBeenCalled();
    const call = audit.log.mock.calls[0][0];
    expect(call.action).toBe('mfa.challenge.created');
    expect(call.entityType).toBe('MfaChallenge');
  });
});

// ─── 2. verifyChallenge ───────────────────────────────────────────

describe('mfa-challenge.service — verifyChallenge', () => {
  test('CHALLENGE_NOT_FOUND for unknown id', async () => {
    const svc = makeService();
    const r = await svc.verifyChallenge({ challengeId: 'nope', token: '000000' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(REASON.CHALLENGE_NOT_FOUND);
  });

  test('CHALLENGE_EXPIRED when past expiresAt', async () => {
    const svc = makeService();
    const c = await svc.createChallenge({ userId: 'U-1', requiredTier: 2 });
    // Force the challenge to be expired
    svc._store.get(c.challengeId).expiresAt = new Date(Date.now() - 1000);
    const r = await svc.verifyChallenge({ challengeId: c.challengeId, token: '123456' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(REASON.CHALLENGE_EXPIRED);
  });

  test('OTP_INVALID with attemptsRemaining counter', async () => {
    const svc = makeService();
    const c = await svc.createChallenge({ userId: 'U-1', requiredTier: 2 });
    const r = await svc.verifyChallenge({ challengeId: c.challengeId, token: '000000' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(REASON.OTP_INVALID);
    expect(r.attemptsRemaining).toBe(MAX_VERIFY_ATTEMPTS - 1);
  });

  test('CHALLENGE_LOCKED after MAX_VERIFY_ATTEMPTS', async () => {
    const svc = makeService();
    const c = await svc.createChallenge({ userId: 'U-1', requiredTier: 2 });
    for (let i = 0; i < MAX_VERIFY_ATTEMPTS; i++) {
      await svc.verifyChallenge({ challengeId: c.challengeId, token: '000000' });
    }
    const r = await svc.verifyChallenge({ challengeId: c.challengeId, token: '123456' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(REASON.CHALLENGE_LOCKED);
  });

  test('success → marks verified + calls sessionUpdater', async () => {
    const sessionUpdater = jest.fn(async () => {});
    const svc = makeService({ sessionUpdater });
    const c = await svc.createChallenge({ userId: 'U-7', requiredTier: 2 });
    const r = await svc.verifyChallenge({ challengeId: c.challengeId, token: '123456' });
    expect(r.ok).toBe(true);
    expect(r.sessionUpgrade.userId).toBe('U-7');
    expect(r.sessionUpgrade.mfaLevel).toBe(2);
    expect(r.sessionUpgrade.mfaAssertedAt).toBeInstanceOf(Date);
    expect(sessionUpdater).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'U-7', mfaLevel: 2 })
    );
  });

  test('CHALLENGE_ALREADY_VERIFIED on repeat verify', async () => {
    const svc = makeService();
    const c = await svc.createChallenge({ userId: 'U-1', requiredTier: 2 });
    await svc.verifyChallenge({ challengeId: c.challengeId, token: '123456' });
    const r = await svc.verifyChallenge({ challengeId: c.challengeId, token: '123456' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(REASON.CHALLENGE_ALREADY_VERIFIED);
  });

  test('success emits mfa.challenge.verified audit event', async () => {
    const audit = { log: jest.fn(async () => {}) };
    const svc = makeService({ auditLogger: audit });
    const c = await svc.createChallenge({ userId: 'U-1', requiredTier: 2 });
    await svc.verifyChallenge({ challengeId: c.challengeId, token: '123456' });
    const actions = audit.log.mock.calls.map(c2 => c2[0].action);
    expect(actions).toContain('mfa.challenge.verified');
  });

  test('failed verify emits mfa.challenge.failed audit event', async () => {
    const audit = { log: jest.fn(async () => {}) };
    const svc = makeService({ auditLogger: audit });
    const c = await svc.createChallenge({ userId: 'U-1', requiredTier: 2 });
    await svc.verifyChallenge({ challengeId: c.challengeId, token: '000000' });
    const actions = audit.log.mock.calls.map(c2 => c2[0].action);
    expect(actions).toContain('mfa.challenge.failed');
  });

  test('sessionUpdater throw does NOT unwind verification', async () => {
    const sessionUpdater = jest.fn(async () => {
      throw new Error('redis down');
    });
    const svc = makeService({ sessionUpdater });
    const c = await svc.createChallenge({ userId: 'U-1', requiredTier: 2 });
    const r = await svc.verifyChallenge({ challengeId: c.challengeId, token: '123456' });
    expect(r.ok).toBe(true); // verified despite session-store failure
  });
});

// ─── 3. getChallengeStatus ────────────────────────────────────────

describe('mfa-challenge.service — getChallengeStatus', () => {
  test('returns verified=false initially', async () => {
    const svc = makeService();
    const c = await svc.createChallenge({ userId: 'U-1', requiredTier: 2 });
    const s = svc.getChallengeStatus(c.challengeId);
    expect(s.ok).toBe(true);
    expect(s.verified).toBe(false);
    expect(s.expired).toBe(false);
    expect(s.locked).toBe(false);
    expect(s.attemptsRemaining).toBe(MAX_VERIFY_ATTEMPTS);
  });

  test('reflects verified=true after successful verify', async () => {
    const svc = makeService();
    const c = await svc.createChallenge({ userId: 'U-1', requiredTier: 2 });
    await svc.verifyChallenge({ challengeId: c.challengeId, token: '123456' });
    const s = svc.getChallengeStatus(c.challengeId);
    expect(s.verified).toBe(true);
    expect(s.verifiedAt).toBeInstanceOf(Date);
  });

  test('CHALLENGE_NOT_FOUND for unknown id', () => {
    const svc = makeService();
    const s = svc.getChallengeStatus('nope');
    expect(s.ok).toBe(false);
    expect(s.reason).toBe(REASON.CHALLENGE_NOT_FOUND);
  });
});

// ─── 4. requireMfa middleware ─────────────────────────────────────

describe('mfa-challenge.service — requireMfa middleware', () => {
  function runMiddleware(mw, actor) {
    return new Promise(resolve => {
      const req = { actor };
      const res = {
        statusCode: 200,
        body: null,
        status(c) {
          this.statusCode = c;
          return this;
        },
        json(b) {
          this.body = b;
          resolve({ blocked: true, statusCode: this.statusCode, body: this.body });
        },
      };
      mw(req, res, () => resolve({ blocked: false }));
    });
  }

  test('passes when actor.mfaLevel >= tier AND fresh', async () => {
    const svc = makeService();
    const mw = svc.requireMfa(2);
    const r = await runMiddleware(mw, {
      mfaLevel: 2,
      mfaAssertedAt: new Date(),
    });
    expect(r.blocked).toBeFalsy();
  });

  test('401 STEP_UP_MFA_REQUIRED when actor tier too low', async () => {
    const svc = makeService();
    const mw = svc.requireMfa(2);
    const r = await runMiddleware(mw, { mfaLevel: 1 });
    expect(r.blocked).toBe(true);
    expect(r.statusCode).toBe(401);
    expect(r.body.reason).toBe('STEP_UP_MFA_REQUIRED');
    expect(r.body.requiredTier).toBe(2);
    expect(r.body.challengeUrl).toBe('/api/v1/mfa/challenge');
  });

  test('401 MFA_FRESHNESS_REQUIRED when assertion stale', async () => {
    const svc = makeService();
    const mw = svc.requireMfa(2, { freshnessMin: 15 });
    const r = await runMiddleware(mw, {
      mfaLevel: 2,
      mfaAssertedAt: new Date(Date.now() - 60 * 60 * 1000), // 1h ago
    });
    expect(r.blocked).toBe(true);
    expect(r.statusCode).toBe(401);
    expect(r.body.reason).toBe('MFA_FRESHNESS_REQUIRED');
  });

  test('tier-3 enforces tighter freshness window by default', async () => {
    const svc = makeService();
    const mw = svc.requireMfa(3); // default 5 min for tier 3
    const r = await runMiddleware(mw, {
      mfaLevel: 3,
      mfaAssertedAt: new Date(Date.now() - 10 * 60 * 1000),
    });
    expect(r.blocked).toBe(true);
    expect(r.body.reason).toBe('MFA_FRESHNESS_REQUIRED');
  });
});

// ─── 5. Routes ────────────────────────────────────────────────────

describe('mfa-challenge.routes', () => {
  test('POST /challenge requires tier 2 or 3', async () => {
    const svc = makeService();
    const app = makeApp(svc);
    const r = await request(app).post('/api/v1/mfa/challenge').send({ requiredTier: 1 });
    expect(r.status).toBe(400);
    expect(r.body.reason).toBe('INVALID_TIER');
  });

  test('POST /challenge returns challengeId + expiresAt', async () => {
    const svc = makeService();
    const app = makeApp(svc);
    const r = await request(app).post('/api/v1/mfa/challenge').send({ requiredTier: 2 });
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    expect(typeof r.body.data.challengeId).toBe('string');
    expect(r.body.data.requiredTier).toBe(2);
  });

  test('POST /challenge requires authenticated user', async () => {
    const svc = makeService();
    const app = makeApp(svc, null); // no req.user
    const r = await request(app).post('/api/v1/mfa/challenge').send({ requiredTier: 2 });
    expect(r.status).toBe(401);
    expect(r.body.reason).toBe('USER_REQUIRED');
  });

  test('POST /:id/verify success → 200 with sessionUpgrade', async () => {
    const svc = makeService();
    const app = makeApp(svc);
    const create = await request(app).post('/api/v1/mfa/challenge').send({ requiredTier: 2 });
    const id = create.body.data.challengeId;
    const r = await request(app).post(`/api/v1/mfa/${id}/verify`).send({ token: '123456' });
    expect(r.status).toBe(200);
    expect(r.body.data.sessionUpgrade.mfaLevel).toBe(2);
  });

  test('POST /:id/verify wrong token → 401 OTP_INVALID', async () => {
    const svc = makeService();
    const app = makeApp(svc);
    const create = await request(app).post('/api/v1/mfa/challenge').send({ requiredTier: 2 });
    const id = create.body.data.challengeId;
    const r = await request(app).post(`/api/v1/mfa/${id}/verify`).send({ token: 'wrong' });
    expect(r.status).toBe(401);
    expect(r.body.reason).toBe('OTP_INVALID');
    expect(r.body.attemptsRemaining).toBe(MAX_VERIFY_ATTEMPTS - 1);
  });

  test('POST /:id/verify missing token → 400 INVALID_PAYLOAD', async () => {
    const svc = makeService();
    const app = makeApp(svc);
    const create = await request(app).post('/api/v1/mfa/challenge').send({ requiredTier: 2 });
    const id = create.body.data.challengeId;
    const r = await request(app).post(`/api/v1/mfa/${id}/verify`).send({});
    expect(r.status).toBe(400);
    expect(r.body.reason).toBe('INVALID_PAYLOAD');
  });

  test('POST /:id/verify unknown id → 404 CHALLENGE_NOT_FOUND', async () => {
    const svc = makeService();
    const app = makeApp(svc);
    const r = await request(app).post('/api/v1/mfa/nope/verify').send({ token: '123456' });
    expect(r.status).toBe(404);
    expect(r.body.reason).toBe('CHALLENGE_NOT_FOUND');
  });

  test('GET /:id returns status', async () => {
    const svc = makeService();
    const app = makeApp(svc);
    const create = await request(app).post('/api/v1/mfa/challenge').send({ requiredTier: 3 });
    const id = create.body.data.challengeId;
    const r = await request(app).get(`/api/v1/mfa/${id}`);
    expect(r.status).toBe(200);
    expect(r.body.data.verified).toBe(false);
    expect(r.body.data.requiredTier).toBe(3);
  });

  test('integration: create → verify → status verified=true', async () => {
    const sessionUpdater = jest.fn(async () => {});
    const svc = makeService({ sessionUpdater });
    const app = makeApp(svc);
    const create = await request(app).post('/api/v1/mfa/challenge').send({ requiredTier: 2 });
    const id = create.body.data.challengeId;
    await request(app).post(`/api/v1/mfa/${id}/verify`).send({ token: '123456' });
    const status = await request(app).get(`/api/v1/mfa/${id}`);
    expect(status.body.data.verified).toBe(true);
    expect(sessionUpdater).toHaveBeenCalled();
  });
});

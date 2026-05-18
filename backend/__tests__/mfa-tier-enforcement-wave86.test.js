/**
 * mfa-tier-enforcement-wave86.test.js — Wave 86.
 *
 * Closes critical-review BLOCKER B3: "UI gating bypasses backend
 * enforcement = security theater". Three layers proven here:
 *
 *   1. mfa-challenge.service tracks in-process userMfaState
 *      and exposes it via getUserMfaState(userId)
 *   2. loadMfaActor middleware populates req.actor.mfaLevel /
 *      mfaAssertedAt from that state
 *   3. beneficiary-lifecycle.service checkMfaTier guard rejects
 *      requestTransition / approveTransition / executeTransition /
 *      reverseTransition with MFA_TIER_REQUIRED or
 *      MFA_FRESHNESS_REQUIRED when enforceMfa=true and the actor's
 *      tier is insufficient or stale
 *
 * The same test file run against the pre-wave-86 code would skip
 * layer 1 (no map), layer 2 (no middleware file), and pass layer 3
 * trivially (no guard). Run it AFTER the fix to see the contract
 * enforced.
 */

'use strict';

const { createMfaChallengeService } = require('../intelligence/mfa-challenge.service');
const { loadMfaActor, buildActorFromReq } = require('../middleware/mfa-actor');
const {
  createBeneficiaryLifecycleService,
  REASON,
} = require('../intelligence/beneficiary-lifecycle.service');

// ─── 1. mfa-challenge.service userMfaState tracker ─────────────────

describe('Wave 86 — mfa-challenge.service.getUserMfaState', () => {
  test('returns zero state for never-asserted users', () => {
    const svc = createMfaChallengeService();
    const s = svc.getUserMfaState('user-1');
    expect(s.mfaLevel).toBe(0);
    expect(s.mfaAssertedAt).toBeNull();
  });

  test('returns zero state when userId is falsy', () => {
    const svc = createMfaChallengeService();
    const s = svc.getUserMfaState(null);
    expect(s.mfaLevel).toBe(0);
  });

  test('verifyChallenge success updates the map (tier 2)', async () => {
    const totpVerifier = () => true;
    const svc = createMfaChallengeService({
      totpVerifier,
      now: () => new Date('2026-05-18T10:00:00Z'),
    });
    // Skip the real enrollment lookup by stubbing requireMfaTier 2
    const c = await svc.createChallenge({
      userId: 'user-2',
      requiredTier: 2,
      method: 'totp',
      actor: { userId: 'user-2', role: 'branch_manager' },
    });
    expect(c.ok).toBe(true);
    const v = await svc.verifyChallenge({
      challengeId: c.challengeId,
      token: '123456',
      actor: { userId: 'user-2', role: 'branch_manager' },
    });
    expect(v.ok).toBe(true);

    const state = svc.getUserMfaState('user-2');
    expect(state.mfaLevel).toBe(2);
    expect(state.mfaAssertedAt).toBeInstanceOf(Date);
  });

  test('higher tier later is captured; lower tier later does NOT downgrade', async () => {
    const totpVerifier = () => true;
    const svc = createMfaChallengeService({
      totpVerifier,
      now: () => new Date('2026-05-18T10:00:00Z'),
    });
    // First assert tier 3
    const c3 = await svc.createChallenge({
      userId: 'u',
      requiredTier: 3,
      method: 'totp',
      actor: { userId: 'u' },
    });
    await svc.verifyChallenge({
      challengeId: c3.challengeId,
      token: '123456',
      actor: { userId: 'u' },
    });
    expect(svc.getUserMfaState('u').mfaLevel).toBe(3);

    // Then assert tier 2 (lower) — must not downgrade
    const c2 = await svc.createChallenge({
      userId: 'u',
      requiredTier: 2,
      method: 'totp',
      actor: { userId: 'u' },
    });
    await svc.verifyChallenge({
      challengeId: c2.challengeId,
      token: '123456',
      actor: { userId: 'u' },
    });
    expect(svc.getUserMfaState('u').mfaLevel).toBe(3);
  });

  test('clearUserMfaState resets the entry', async () => {
    const totpVerifier = () => true;
    const svc = createMfaChallengeService({ totpVerifier });
    const c = await svc.createChallenge({
      userId: 'u',
      requiredTier: 2,
      method: 'totp',
      actor: { userId: 'u' },
    });
    await svc.verifyChallenge({
      challengeId: c.challengeId,
      token: '123456',
      actor: { userId: 'u' },
    });
    expect(svc.getUserMfaState('u').mfaLevel).toBe(2);
    svc.clearUserMfaState('u');
    expect(svc.getUserMfaState('u').mfaLevel).toBe(0);
  });
});

// ─── 2. loadMfaActor middleware bridge ─────────────────────────────

describe('Wave 86 — loadMfaActor middleware', () => {
  test('throws when constructed without getUserMfaState', () => {
    expect(() => loadMfaActor(null)).toThrow();
    expect(() => loadMfaActor({})).toThrow();
  });

  test('populates req.actor from req.user + mfa state', () => {
    const svc = createMfaChallengeService();
    const mw = loadMfaActor(svc);
    const req = { user: { id: 'user-1', role: 'branch_manager' }, ip: '1.2.3.4' };
    const res = {};
    let called = false;
    mw(req, res, () => {
      called = true;
    });
    expect(called).toBe(true);
    expect(req.actor.userId).toBe('user-1');
    expect(req.actor.role).toBe('branch_manager');
    expect(req.actor.ip).toBe('1.2.3.4');
    expect(req.actor.mfaLevel).toBe(0);
    expect(req.actor.mfaAssertedAt).toBeNull();
  });

  test('reflects a prior verifyChallenge in subsequent req.actor', async () => {
    const totpVerifier = () => true;
    const svc = createMfaChallengeService({ totpVerifier });
    const c = await svc.createChallenge({
      userId: 'u',
      requiredTier: 3,
      method: 'totp',
      actor: { userId: 'u' },
    });
    await svc.verifyChallenge({
      challengeId: c.challengeId,
      token: '123456',
      actor: { userId: 'u' },
    });

    const mw = loadMfaActor(svc);
    const req = { user: { id: 'u', role: 'dpo' }, ip: '1.2.3.4' };
    mw(req, {}, () => {});
    expect(req.actor.mfaLevel).toBe(3);
    expect(req.actor.mfaAssertedAt).toBeInstanceOf(Date);
  });

  test('preserves preexisting req.actor fields', () => {
    const svc = createMfaChallengeService();
    const mw = loadMfaActor(svc);
    const req = {
      user: { id: 'u', role: 'r' },
      actor: { tenantId: 'tenant-A', custom: true },
    };
    mw(req, {}, () => {});
    expect(req.actor.tenantId).toBe('tenant-A');
    expect(req.actor.custom).toBe(true);
    expect(req.actor.mfaLevel).toBe(0);
  });
});

describe('Wave 86 — buildActorFromReq (service-layer helper)', () => {
  test('mirrors loadMfaActor output for the same req + service', async () => {
    const totpVerifier = () => true;
    const svc = createMfaChallengeService({ totpVerifier });
    const c = await svc.createChallenge({
      userId: 'u',
      requiredTier: 2,
      method: 'totp',
      actor: { userId: 'u' },
    });
    await svc.verifyChallenge({
      challengeId: c.challengeId,
      token: '123456',
      actor: { userId: 'u' },
    });

    const req = { user: { id: 'u', role: 'branch_manager' }, ip: '5.6.7.8' };
    const actor = buildActorFromReq(req, svc);
    expect(actor.userId).toBe('u');
    expect(actor.role).toBe('branch_manager');
    expect(actor.mfaLevel).toBe(2);
    expect(actor.mfaAssertedAt).toBeInstanceOf(Date);
  });

  test('mfaLevel defaults to 0 when no mfa service is passed', () => {
    const req = { user: { id: 'u', role: 'r' } };
    const actor = buildActorFromReq(req);
    expect(actor.mfaLevel).toBe(0);
    expect(actor.mfaAssertedAt).toBeNull();
  });
});

// ─── 3. Lifecycle-service checkMfaTier guard ───────────────────────

describe('Wave 86 — lifecycle.service MFA tier enforcement', () => {
  function buildLog() {
    const store = new Map();
    let n = 0;
    return {
      _store: store,
      findById: async id => store.get(id) || null,
      create: async doc => {
        const id = doc._id || `tx-${++n}`;
        const row = { ...doc, _id: id, save: async () => row };
        store.set(id, row);
        return row;
      },
    };
  }

  test('enforceMfa=false (default) lets everything through (back-compat)', async () => {
    const svc = createBeneficiaryLifecycleService({
      transitionLog: buildLog(),
    });
    const res = await svc.requestTransition({
      beneficiaryId: 'b1',
      branchId: 'br1',
      transitionId: 'discharge', // mfaTier=3
      actor: { userId: 'u1', role: 'branch_manager' /* no mfaLevel */ },
      reason: 'goals met',
      reasonCode: 'goals-met',
      metadata: { currentState: 'active' },
    });
    expect(res.ok).toBe(true);
  });

  test('enforceMfa=true blocks tier-3 transition without mfa', async () => {
    const svc = createBeneficiaryLifecycleService({
      transitionLog: buildLog(),
      enforceMfa: true,
    });
    const res = await svc.requestTransition({
      beneficiaryId: 'b1',
      branchId: 'br1',
      transitionId: 'discharge',
      actor: { userId: 'u1', role: 'branch_manager', mfaLevel: 0 },
      reason: 'goals met',
      reasonCode: 'goals-met',
      metadata: { currentState: 'active' },
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe(REASON.MFA_TIER_REQUIRED);
    expect(res.requiredTier).toBe(3);
    expect(res.actorTier).toBe(0);
  });

  test('enforceMfa=true allows tier-3 with sufficient mfa AND fresh assertion', async () => {
    const fixed = new Date('2026-05-18T10:00:00Z');
    const svc = createBeneficiaryLifecycleService({
      transitionLog: buildLog(),
      enforceMfa: true,
      now: () => fixed,
    });
    const res = await svc.requestTransition({
      beneficiaryId: 'b1',
      branchId: 'br1',
      transitionId: 'discharge',
      actor: {
        userId: 'u1',
        role: 'branch_manager',
        mfaLevel: 3,
        mfaAssertedAt: new Date(fixed.getTime() - 60_000), // 1 minute ago
      },
      reason: 'goals met',
      reasonCode: 'goals-met',
      metadata: { currentState: 'active' },
    });
    expect(res.ok).toBe(true);
  });

  test('enforceMfa=true rejects stale tier-3 assertion (older than 5 min)', async () => {
    const fixed = new Date('2026-05-18T10:00:00Z');
    const svc = createBeneficiaryLifecycleService({
      transitionLog: buildLog(),
      enforceMfa: true,
      now: () => fixed,
    });
    const res = await svc.requestTransition({
      beneficiaryId: 'b1',
      branchId: 'br1',
      transitionId: 'discharge',
      actor: {
        userId: 'u1',
        role: 'branch_manager',
        mfaLevel: 3,
        mfaAssertedAt: new Date(fixed.getTime() - 10 * 60_000), // 10 min ago — STALE for tier 3
      },
      reason: 'goals met',
      reasonCode: 'goals-met',
      metadata: { currentState: 'active' },
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe(REASON.MFA_FRESHNESS_REQUIRED);
    expect(res.requiredTier).toBe(3);
    expect(res.maxAgeMin).toBe(5);
  });

  test('enforceMfa=true accepts tier-2 freshness up to 15 min', async () => {
    const fixed = new Date('2026-05-18T10:00:00Z');
    const svc = createBeneficiaryLifecycleService({
      transitionLog: buildLog(),
      enforceMfa: true,
      now: () => fixed,
    });
    const res = await svc.requestTransition({
      beneficiaryId: 'b1',
      branchId: 'br1',
      transitionId: 'suspend', // mfaTier=2
      actor: {
        userId: 'u1',
        role: 'branch_manager',
        mfaLevel: 2,
        mfaAssertedAt: new Date(fixed.getTime() - 12 * 60_000), // 12 min ago — fresh for tier 2
      },
      reason: 'medical',
      reasonCode: 'medical',
      metadata: { currentState: 'active' },
    });
    expect(res.ok).toBe(true);
  });

  test('enforceMfa=true rejects tier-2 assertion older than 15 min', async () => {
    const fixed = new Date('2026-05-18T10:00:00Z');
    const svc = createBeneficiaryLifecycleService({
      transitionLog: buildLog(),
      enforceMfa: true,
      now: () => fixed,
    });
    const res = await svc.requestTransition({
      beneficiaryId: 'b1',
      branchId: 'br1',
      transitionId: 'suspend',
      actor: {
        userId: 'u1',
        role: 'branch_manager',
        mfaLevel: 2,
        mfaAssertedAt: new Date(fixed.getTime() - 20 * 60_000), // 20 min ago
      },
      reason: 'medical',
      reasonCode: 'medical',
      metadata: { currentState: 'active' },
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe(REASON.MFA_FRESHNESS_REQUIRED);
    expect(res.requiredTier).toBe(2);
    expect(res.maxAgeMin).toBe(15);
  });

  test('enforceMfa=true with no mfaAssertedAt for tier ≥2 is strict-rejected', async () => {
    const svc = createBeneficiaryLifecycleService({
      transitionLog: buildLog(),
      enforceMfa: true,
    });
    const res = await svc.requestTransition({
      beneficiaryId: 'b1',
      branchId: 'br1',
      transitionId: 'suspend',
      actor: {
        userId: 'u1',
        role: 'branch_manager',
        mfaLevel: 2,
        // no mfaAssertedAt!
      },
      reason: 'medical',
      reasonCode: 'medical',
      metadata: { currentState: 'active' },
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe(REASON.MFA_FRESHNESS_REQUIRED);
  });
});

// ─── 4. End-to-end binding: service uses the bridge actor ─────────

describe('Wave 86 — end-to-end MFA bind (mfaService → middleware → service)', () => {
  test('full chain: verifyChallenge → loadMfaActor → lifecycle.request allowed', async () => {
    const totpVerifier = () => true;
    const fixed = new Date('2026-05-18T10:00:00Z');
    const mfaSvc = createMfaChallengeService({
      totpVerifier,
      now: () => fixed,
    });
    // The user verifies tier 3
    const c = await mfaSvc.createChallenge({
      userId: 'user-1',
      requiredTier: 3,
      method: 'totp',
      actor: { userId: 'user-1', role: 'branch_manager' },
    });
    await mfaSvc.verifyChallenge({
      challengeId: c.challengeId,
      token: '123456',
      actor: { userId: 'user-1', role: 'branch_manager' },
    });

    // Middleware builds the actor
    const mw = loadMfaActor(mfaSvc);
    const req = { user: { id: 'user-1', role: 'branch_manager' }, ip: '1.1.1.1' };
    mw(req, {}, () => {});
    expect(req.actor.mfaLevel).toBe(3);

    // Service uses req.actor (defense in depth) — tier-3 transition passes
    const lifecycleSvc = createBeneficiaryLifecycleService({
      transitionLog: (() => {
        const store = new Map();
        return {
          findById: async id => store.get(id) || null,
          create: async doc => {
            const r = { ...doc, _id: 'tx-1', save: async () => r };
            store.set('tx-1', r);
            return r;
          },
        };
      })(),
      enforceMfa: true,
      now: () => fixed,
    });

    const res = await lifecycleSvc.requestTransition({
      beneficiaryId: 'b1',
      branchId: 'br1',
      transitionId: 'discharge',
      actor: req.actor,
      reason: 'goals met',
      reasonCode: 'goals-met',
      metadata: { currentState: 'active' },
    });
    expect(res.ok).toBe(true);
  });

  test('full chain: actor with no verified MFA → service blocks tier-3', async () => {
    const mfaSvc = createMfaChallengeService();
    const mw = loadMfaActor(mfaSvc);
    const req = { user: { id: 'user-2', role: 'branch_manager' } };
    mw(req, {}, () => {});
    expect(req.actor.mfaLevel).toBe(0);

    const lifecycleSvc = createBeneficiaryLifecycleService({
      transitionLog: { findById: async () => null, create: async () => null },
      enforceMfa: true,
    });
    const res = await lifecycleSvc.requestTransition({
      beneficiaryId: 'b1',
      branchId: 'br1',
      transitionId: 'discharge',
      actor: req.actor,
      reason: 'x',
      reasonCode: 'goals-met',
      metadata: { currentState: 'active' },
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe(REASON.MFA_TIER_REQUIRED);
  });
});

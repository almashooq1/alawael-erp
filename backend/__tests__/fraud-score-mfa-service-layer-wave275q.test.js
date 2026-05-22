'use strict';

/**
 * fraud-score-mfa-service-layer-wave275q.test.js — Wave 275q.
 *
 * Service-layer MFA enforcement on decayAllScores (was W275g
 * route-only because of cron blocker; W275q ships synthetic system-
 * actor pattern, unlocking service-layer adoption).
 *
 * Also verifies that the scheduler-supplied system actor passes the
 * MFA guard end-to-end.
 */

const {
  createHikvisionFraudScoreService,
} = require('../intelligence/hikvision-fraud-score.service');
const { makeSystemActor } = require('../intelligence/system-actor.lib');
const reg = require('../intelligence/hikvision.registry');

const _stubModel = Object.freeze({
  find() {
    return { sort: () => ({ lean: () => [] }) };
  },
  findOne() {
    return { lean: () => Promise.resolve(null) };
  },
});

function _makeService({ enforceMfa = true, now = () => new Date('2026-05-22T15:00:00Z') } = {}) {
  return createHikvisionFraudScoreService({
    scoreModel: _stubModel,
    flagModel: _stubModel,
    enforceMfa,
    now,
  });
}

// ─── 1. decayAllScores — tier 2 (15 min) ──────────────────────────

describe('Wave 275q — decayAllScores MFA enforcement', () => {
  test('rejects MFA_TIER_REQUIRED when actor.mfaLevel < 2', async () => {
    const svc = _makeService();
    const r = await svc.decayAllScores({
      actor: { userId: 'u1', mfaLevel: 1, mfaAssertedAt: new Date('2026-05-22T14:55:00Z') },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
    expect(r.requiredTier).toBe(2);
  });

  test('rejects MFA_FRESHNESS_REQUIRED when stale', async () => {
    const svc = _makeService();
    const r = await svc.decayAllScores({
      actor: { userId: 'u1', mfaLevel: 2, mfaAssertedAt: new Date('2026-05-22T14:40:00Z') },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_FRESHNESS_REQUIRED);
    expect(r.ageMin).toBe(20);
  });

  test('rejects when no actor supplied (defaults to tier 0)', async () => {
    const svc = _makeService();
    const r = await svc.decayAllScores({});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
    expect(r.actorTier).toBe(0);
  });

  test('passes guard with fresh tier-2 actor (returns ok with scan result)', async () => {
    const svc = _makeService();
    const r = await svc.decayAllScores({
      actor: { userId: 'u1', mfaLevel: 2, mfaAssertedAt: new Date('2026-05-22T14:50:00Z') },
    });
    expect(r.ok).toBe(true);
    expect(r.scanned).toBe(0); // stub returns empty
    expect(r.recomputed).toBe(0);
    expect(r.at).toBeInstanceOf(Date);
  });

  test('enforceMfa=false bypasses guard (no actor needed)', async () => {
    const svc = _makeService({ enforceMfa: false });
    const r = await svc.decayAllScores({});
    expect(r.ok).toBe(true);
    expect(r.scanned).toBe(0);
  });
});

// ─── 2. System actor (W275q lib) integration ──────────────────────

describe('Wave 275q — system actor passes decayAllScores guard', () => {
  test('makeSystemActor() output is accepted by service-layer MFA guard', async () => {
    const now = () => new Date('2026-05-22T15:00:00Z');
    const svc = _makeService({ now });
    const systemActor = makeSystemActor({ now });
    const r = await svc.decayAllScores({ actor: systemActor });
    expect(r.ok).toBe(true); // system actor tier-3, fresh — passes tier-2 check
  });

  test('system actor mfaLevel (3) exceeds required tier (2)', () => {
    const systemActor = makeSystemActor();
    expect(systemActor.mfaLevel).toBeGreaterThanOrEqual(2);
  });
});

// ─── 3. Factory enforceMfa flag ──────────────────────────────────

describe('Wave 275q — factory enforceMfa flag', () => {
  test('default is OFF (backwards-compatible with Wave 100 tests)', async () => {
    const defaultSvc = createHikvisionFraudScoreService({
      scoreModel: _stubModel,
      flagModel: _stubModel,
    });
    const r = await defaultSvc.decayAllScores({});
    // Default OFF → MFA bypassed → returns scan result
    expect(r.ok).toBe(true);
  });

  test('enforceMfa: true → guard fires; false → bypass', async () => {
    const enforced = _makeService({ enforceMfa: true });
    const bypassed = _makeService({ enforceMfa: false });

    const r1 = await enforced.decayAllScores({});
    expect(r1.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);

    const r2 = await bypassed.decayAllScores({});
    expect(r2.ok).toBe(true);
  });
});

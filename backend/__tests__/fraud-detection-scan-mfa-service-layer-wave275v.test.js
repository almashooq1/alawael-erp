'use strict';

/**
 * fraud-detection-scan-mfa-service-layer-wave275v.test.js — Wave 275v.
 *
 * Extends [[wave275b-fraud-detection-mfa]] (which gated dismissFlag +
 * escalateFlag) to the 3 scan/sweep methods now that W275q system-
 * actor unlocks cron-shaped callers:
 *   - scanTemplates
 *   - scanUnregisteredFaces (was misnamed `scanUnregistered` in scheduler)
 *   - sweepExpiredFlags     (was misnamed `sweepExpired` in scheduler)
 *
 * Bug fixes #3+4 in the W275 series — same drainPending pattern from
 * W275u and sweepUnresponsive pattern from W275t.
 */

const {
  createHikvisionFraudDetectionService,
} = require('../intelligence/hikvision-fraud-detection.service');
const { makeSystemActor } = require('../intelligence/system-actor.lib');
const reg = require('../intelligence/hikvision.registry');

function _emptyQuery() {
  const arr = [];
  const q = Promise.resolve(arr);
  q.sort = () => q;
  q.limit = () => q;
  q.lean = () => q;
  q.select = () => q;
  q.distinct = () => q;
  return q;
}

const _stubModel = Object.freeze({
  find() {
    return _emptyQuery();
  },
  findOne() {
    return Promise.resolve(null);
  },
});

function _makeService({ enforceMfa = true, now = () => new Date('2026-05-22T15:00:00Z') } = {}) {
  return createHikvisionFraudDetectionService({
    flagModel: _stubModel,
    processedEventModel: _stubModel,
    enforceMfa,
    now,
  });
}

// ─── scanTemplates — tier 2 ───────────────────────────────────────

describe('Wave 275v — scanTemplates MFA enforcement', () => {
  test('rejects without actor', async () => {
    const svc = _makeService();
    const r = await svc.scanTemplates({});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
  });

  test('passes with system actor', async () => {
    const svc = _makeService();
    const r = await svc.scanTemplates({ actor: makeSystemActor() });
    expect(r.ok || r.reason !== reg.REASON.MFA_TIER_REQUIRED).toBe(true);
  });
});

// ─── scanUnregisteredFaces — tier 2 ───────────────────────────────

describe('Wave 275v — scanUnregisteredFaces MFA enforcement', () => {
  test('rejects without actor', async () => {
    const svc = _makeService();
    const r = await svc.scanUnregisteredFaces({});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
  });

  test('passes with system actor', async () => {
    const svc = _makeService();
    const r = await svc.scanUnregisteredFaces({ actor: makeSystemActor() });
    expect(r.ok || r.reason !== reg.REASON.MFA_TIER_REQUIRED).toBe(true);
  });
});

// ─── sweepExpiredFlags — tier 2 ───────────────────────────────────

describe('Wave 275v — sweepExpiredFlags MFA enforcement', () => {
  test('rejects without actor', async () => {
    const svc = _makeService();
    const r = await svc.sweepExpiredFlags({});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
  });

  test('passes with system actor', async () => {
    const svc = _makeService();
    const r = await svc.sweepExpiredFlags({ actor: makeSystemActor() });
    expect(r.ok || r.reason !== reg.REASON.MFA_TIER_REQUIRED).toBe(true);
  });
});

// ─── enforceMfa=false bypass (consolidated) ──────────────────────

describe('Wave 275v — enforceMfa=false bypass', () => {
  test('all 3 scan/sweep methods bypass when enforceMfa=false', async () => {
    const svc = _makeService({ enforceMfa: false });

    const r1 = await svc.scanTemplates({});
    const r2 = await svc.scanUnregisteredFaces({});
    const r3 = await svc.sweepExpiredFlags({});

    for (const r of [r1, r2, r3]) {
      if (r && r.reason) {
        expect(r.reason).not.toBe(reg.REASON.MFA_TIER_REQUIRED);
      }
    }
  });
});

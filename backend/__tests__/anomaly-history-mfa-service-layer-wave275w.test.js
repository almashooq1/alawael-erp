'use strict';

/**
 * anomaly-history-mfa-service-layer-wave275w.test.js — Wave 275w.
 *
 * Service-layer MFA on anomaly-history.recordSnapshot (the persist
 * operation). detect() at anomaly-detector stays UNGATED because
 * it's also called from read-only GET /anomalies.
 *
 * Last cron-shaped service-layer adopter via W275q system-actor.
 */

const {
  createHikvisionAnomalyHistoryService,
} = require('../intelligence/hikvision-anomaly-history.service');
const { makeSystemActor } = require('../intelligence/system-actor.lib');
const reg = require('../intelligence/hikvision.registry');

// Constructor-style stub for `new snapshotModel(docData)` create path.
function _StubSnapshotModel(data) {
  Object.assign(this, data || {});
}
_StubSnapshotModel.prototype.validate = function () {
  return Promise.resolve();
};
_StubSnapshotModel.prototype.save = function () {
  return Promise.resolve(this);
};
_StubSnapshotModel.prototype.toObject = function () {
  return { ...this };
};

function _makeService({ enforceMfa = true, now = () => new Date('2026-05-22T15:00:00Z') } = {}) {
  return createHikvisionAnomalyHistoryService({
    snapshotModel: _StubSnapshotModel,
    enforceMfa,
    now,
  });
}

const VALID_DETECTION = Object.freeze({
  ok: true,
  items: [],
  summary: { total: 0, critical: 0, warning: 0, info: 0 },
});

describe('Wave 275w — recordSnapshot MFA enforcement', () => {
  test('rejects without actor', async () => {
    const svc = _makeService();
    const r = await svc.recordSnapshot({ detectionResult: VALID_DETECTION });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
  });

  test('rejects when actor.mfaLevel = 1', async () => {
    const svc = _makeService();
    const r = await svc.recordSnapshot({
      detectionResult: VALID_DETECTION,
      actor: { userId: 'u1', mfaLevel: 1, mfaAssertedAt: new Date('2026-05-22T14:55:00Z') },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
  });

  test('passes with system actor (W275q lib)', async () => {
    const now = () => new Date('2026-05-22T15:00:00Z');
    const svc = _makeService({ now });
    const r = await svc.recordSnapshot({
      detectionResult: VALID_DETECTION,
      actor: makeSystemActor({ now }),
    });
    // Past MFA → reaches snapshot persist → ok with the stubbed save.
    expect(r.ok).toBe(true);
    expect(r.snapshot).toBeTruthy();
  });

  test('passes with HTTP actor (mfaLevel: 2, fresh)', async () => {
    const now = () => new Date('2026-05-22T15:00:00Z');
    const svc = _makeService({ now });
    const r = await svc.recordSnapshot({
      detectionResult: VALID_DETECTION,
      actor: {
        userId: 'u1',
        mfaLevel: 2,
        mfaAssertedAt: new Date('2026-05-22T14:50:00Z'),
      },
    });
    expect(r.ok).toBe(true);
  });
});

describe('Wave 275w — factory enforceMfa flag', () => {
  test('default OFF (backwards-compatible with Wave 114 tests)', async () => {
    const svc = createHikvisionAnomalyHistoryService({
      snapshotModel: _StubSnapshotModel,
    });
    const r = await svc.recordSnapshot({ detectionResult: VALID_DETECTION });
    expect(r.ok).toBe(true);
  });
});

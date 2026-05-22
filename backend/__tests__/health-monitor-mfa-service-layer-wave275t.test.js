'use strict';

/**
 * health-monitor-mfa-service-layer-wave275t.test.js — Wave 275t.
 *
 * Service-layer MFA on health-monitor sweepStaleDevices via W275q
 * system-actor pattern. recordHeartbeat stays UNGATED (device
 * webhook ingest).
 *
 * Also documents the pre-existing scheduler bug fixed in this commit:
 * scheduler called `healthMonitor.sweepUnresponsive()` but the
 * service exports `sweepStaleDevices`. Bug never surfaced because
 * the HEALTH_SWEEP job wasn't exercised in unit tests. W275t renames
 * the call site to match the actual export.
 */

const { createHikvisionHealthService } = require('../intelligence/hikvision-health.service');
const { makeSystemActor } = require('../intelligence/system-actor.lib');
const reg = require('../intelligence/hikvision.registry');

const _stubModel = Object.freeze({
  find() {
    return { limit: () => Promise.resolve([]) };
  },
  findById() {
    return Promise.resolve(null);
  },
});

function _makeService({ enforceMfa = true, now = () => new Date('2026-05-22T15:00:00Z') } = {}) {
  return createHikvisionHealthService({
    deviceModel: _stubModel,
    healthLogModel: _stubModel,
    enforceMfa,
    now,
  });
}

// ─── 1. sweepStaleDevices — tier 2 (15 min) ───────────────────────

describe('Wave 275t — sweepStaleDevices MFA enforcement', () => {
  test('rejects when no actor', async () => {
    const svc = _makeService();
    const r = await svc.sweepStaleDevices({});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
  });

  test('rejects when actor.mfaLevel = 1', async () => {
    const svc = _makeService();
    const r = await svc.sweepStaleDevices({
      actor: { userId: 'u1', mfaLevel: 1, mfaAssertedAt: new Date() },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
  });

  test('passes with system actor (W275q lib)', async () => {
    const now = () => new Date('2026-05-22T15:00:00Z');
    const svc = _makeService({ now });
    const r = await svc.sweepStaleDevices({ actor: makeSystemActor({ now }) });
    expect(r.ok).toBe(true);
    expect(r.scanned).toBe(0); // stub returns empty
  });

  test('enforceMfa=false bypasses guard', async () => {
    const svc = _makeService({ enforceMfa: false });
    const r = await svc.sweepStaleDevices({});
    expect(r.ok).toBe(true);
  });
});

// ─── 2. recordHeartbeat stays UNGATED (device webhook ingest) ─────

describe('Wave 275t — recordHeartbeat stays open (device webhook compat)', () => {
  test('recordHeartbeat does NOT require actor (device push, no user session)', async () => {
    const svc = _makeService();
    const r = await svc.recordHeartbeat({ deviceId: 'dev-1' });
    // Stub findById returns null → service returns HEALTH_DEVICE_REQUIRED
    // or similar, but NOT MFA_TIER_REQUIRED.
    if (!r.ok) {
      expect(r.reason).not.toBe(reg.REASON.MFA_TIER_REQUIRED);
      expect(r.reason).not.toBe(reg.REASON.MFA_FRESHNESS_REQUIRED);
    }
  });
});

// ─── 3. Factory enforceMfa flag ───────────────────────────────────

describe('Wave 275t — factory enforceMfa flag', () => {
  test('default is OFF (backwards-compatible with Wave 96 tests)', async () => {
    const defaultSvc = createHikvisionHealthService({
      deviceModel: _stubModel,
      healthLogModel: _stubModel,
    });
    const r = await defaultSvc.sweepStaleDevices({});
    // Default OFF → bypassed → returns ok with empty results.
    expect(r.ok).toBe(true);
  });
});

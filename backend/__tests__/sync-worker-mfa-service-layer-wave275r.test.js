'use strict';

/**
 * sync-worker-mfa-service-layer-wave275r.test.js — Wave 275r.
 *
 * Service-layer MFA enforcement on the sync-worker chain
 * (syncAll → syncLibrary → syncLibraryToDevice → confirmEnrollment).
 * Unlocked by [[wave275q-architectural-system-actor]] which gave the
 * scheduler a way to satisfy service-layer MFA guards via the
 * synthetic system-actor pattern.
 *
 * Coverage:
 *   - Guards at each public entry point (syncAll/syncLibrary/
 *     syncLibraryToDevice) fail-fast before fan-out.
 *   - Actor propagates through the chain via opts.actor.
 *   - System actor (W275q) passes the guard end-to-end.
 *   - enforceMfa=false preserves backwards compatibility with Wave
 *     106 sync-worker tests.
 *
 * This test does NOT exercise full sync logic (W106 covers that).
 * It only validates the MFA guard layer.
 */

const { createHikvisionSyncWorker } = require('../intelligence/hikvision-sync-worker.service');
const { makeSystemActor } = require('../intelligence/system-actor.lib');
const reg = require('../intelligence/hikvision.registry');

// Minimal stubs that satisfy the factory's required-port check but
// throw if reached past the MFA guard — proving the guard fires first.
const _stubModelThrowing = Object.freeze({
  findById() {
    throw new Error('stub: findById should not be reached when MFA guard rejects');
  },
  find() {
    return {
      sort: () => ({
        lean: () => {
          throw new Error('stub: find should not be reached');
        },
      }),
    };
  },
});

// Library service stub — same throw pattern.
const _stubLibraryService = Object.freeze({
  recordSyncResult() {
    throw new Error('stub: recordSyncResult should not be reached');
  },
});

const _stubEnrollmentService = Object.freeze({
  confirmEnrollment() {
    throw new Error('stub: confirmEnrollment should not be reached');
  },
});

const _stubAdapter = Object.freeze({
  pushPerson() {
    throw new Error('stub: pushPerson should not be reached');
  },
});

function _makeService({ enforceMfa = true, now = () => new Date('2026-05-22T15:00:00Z') } = {}) {
  return createHikvisionSyncWorker({
    libraryService: _stubLibraryService,
    enrollmentService: _stubEnrollmentService,
    deviceModel: _stubModelThrowing,
    templateModel: _stubModelThrowing,
    libraryModel: _stubModelThrowing,
    isapiAdapter: _stubAdapter,
    enforceMfa,
    now,
  });
}

// ─── 1. syncAll — tier 2 (15 min) ─────────────────────────────────

describe('Wave 275r — syncAll MFA enforcement', () => {
  test('rejects MFA_TIER_REQUIRED when actor.mfaLevel < 2', async () => {
    const svc = _makeService();
    const r = await svc.syncAll({
      actor: { userId: 'u1', mfaLevel: 1, mfaAssertedAt: new Date('2026-05-22T14:55:00Z') },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
    expect(r.requiredTier).toBe(2);
  });

  test('rejects MFA_FRESHNESS_REQUIRED when stale', async () => {
    const svc = _makeService();
    const r = await svc.syncAll({
      actor: { userId: 'u1', mfaLevel: 2, mfaAssertedAt: new Date('2026-05-22T14:40:00Z') },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_FRESHNESS_REQUIRED);
    expect(r.ageMin).toBe(20);
  });

  test('rejects when no actor (defaults to tier 0)', async () => {
    const svc = _makeService();
    const r = await svc.syncAll({});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
  });

  test('passes guard with system actor (W275q lib)', async () => {
    const now = () => new Date('2026-05-22T15:00:00Z');
    const svc = _makeService({ now });
    let caught = null;
    try {
      await svc.syncAll({ actor: makeSystemActor({ now }) });
    } catch (err) {
      caught = err;
    }
    // Guard passes → method proceeds → stub.find throws (proves chain
    // proceeded past MFA).
    expect(caught).toBeTruthy();
    expect(String(caught.message)).toMatch(/stub: find should not be reached/);
  });

  test('enforceMfa=false bypasses guard', async () => {
    const svc = _makeService({ enforceMfa: false });
    let caught = null;
    try {
      await svc.syncAll({});
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeTruthy();
    expect(String(caught.message)).toMatch(/stub: find should not be reached/);
  });
});

// ─── 2. syncLibrary — tier 2 (15 min) ─────────────────────────────

describe('Wave 275r — syncLibrary MFA enforcement', () => {
  test('rejects when actor missing', async () => {
    const svc = _makeService();
    const r = await svc.syncLibrary('lib-1', {});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
  });

  test('passes guard with system actor', async () => {
    const now = () => new Date('2026-05-22T15:00:00Z');
    const svc = _makeService({ now });
    let caught = null;
    try {
      await svc.syncLibrary('lib-1', { actor: makeSystemActor({ now }) });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeTruthy();
    expect(String(caught.message)).toMatch(/stub: findById/);
  });
});

// ─── 3. syncLibraryToDevice — tier 2 (leaf guard) ─────────────────

describe('Wave 275r — syncLibraryToDevice MFA enforcement', () => {
  test('rejects when actor missing (leaf-level guard)', async () => {
    const svc = _makeService();
    const r = await svc.syncLibraryToDevice('lib-1', 'dev-1', {});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
  });

  test('rejects when actor.mfaLevel = 1', async () => {
    const svc = _makeService();
    const r = await svc.syncLibraryToDevice('lib-1', 'dev-1', {
      actor: { userId: 'u1', mfaLevel: 1, mfaAssertedAt: new Date('2026-05-22T14:55:00Z') },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
  });

  test('passes guard with system actor', async () => {
    const now = () => new Date('2026-05-22T15:00:00Z');
    const svc = _makeService({ now });
    let caught = null;
    try {
      await svc.syncLibraryToDevice('lib-1', 'dev-1', { actor: makeSystemActor({ now }) });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeTruthy();
    expect(String(caught.message)).toMatch(/stub: findById/);
  });
});

// ─── 4. Factory enforceMfa flag ───────────────────────────────────

describe('Wave 275r — factory enforceMfa flag', () => {
  test('default is OFF (backwards-compatible with Wave 106 tests)', async () => {
    const defaultSvc = createHikvisionSyncWorker({
      libraryService: _stubLibraryService,
      enrollmentService: _stubEnrollmentService,
      deviceModel: _stubModelThrowing,
      templateModel: _stubModelThrowing,
      libraryModel: _stubModelThrowing,
      isapiAdapter: _stubAdapter,
    });
    let caught = null;
    try {
      await defaultSvc.syncAll({});
    } catch (err) {
      caught = err;
    }
    // Default OFF → MFA bypassed → falls to stub.
    expect(caught).toBeTruthy();
    expect(String(caught.message)).toMatch(/stub: find/);
  });
});

// ─── 5. detectDrift NOT gated (read-only) ─────────────────────────

describe('Wave 275r — detectDrift methods stay open (deliberate)', () => {
  test('detectDrift is not MFA-gated (read-only)', async () => {
    const svc = _makeService();
    let caught = null;
    try {
      await svc.detectDrift('lib-1');
    } catch (err) {
      caught = err;
    }
    // Not MFA-gated; the stub throws on findById which proves the
    // method ran past the (non-existent) guard.
    expect(caught).toBeTruthy();
    if (caught) {
      expect(String(caught.message)).not.toMatch(/MFA_TIER_REQUIRED/);
    }
  });
});

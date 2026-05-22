'use strict';

/**
 * zkteco-sync-mfa-service-layer-wave275s.test.js — Wave 275s.
 *
 * Service-layer MFA enforcement on ZKTecoService.syncAttendanceLogs.
 * Mirrors the W275q+W275r pattern but adapts to the class-with-static-
 * methods architecture (vs the factory closure used by intelligence/
 * hikvision-* services). Module-level _ENFORCE_MFA_SYNC flag (default
 * true) is togglable via __setEnforceMfaSync() for tests that need
 * to bypass MFA to focus on domain logic.
 *
 * Coverage:
 *   - syncAttendanceLogs throws MFA error when no actor supplied
 *   - System actor (W275q lib) passes the guard
 *   - __setEnforceMfaSync(false) bypasses
 *
 * Uses jest.doMock on ZKTecoDevice to control findById without
 * touching the real model. After the MFA guard passes, the mocked
 * findById resolves null → service throws "الجهاز غير موجود"
 * which proves the chain proceeded past MFA.
 */

const { makeSystemActor } = require('../intelligence/system-actor.lib');

// Stub the device model so findById returns null after the MFA guard.
jest.mock('../models/zktecoDevice.model', () => ({
  findById: jest.fn(() => Promise.resolve(null)),
  getActiveDevices: jest.fn(() => Promise.resolve([])),
  getDevicesDueForSync: jest.fn(() => Promise.resolve([])),
}));
jest.mock('../models/advanced_attendance.model', () => ({}));
jest.mock('../models/workShift.model', () => ({}));
jest.mock('../models/employee.model', () => ({}));

const ZKTecoService = require('../services/hr/zktecoService');

describe('Wave 275s — ZKTecoService.syncAttendanceLogs MFA enforcement', () => {
  // Re-enable enforcement before each test (the helper toggles it).
  beforeEach(() => {
    ZKTecoService.__setEnforceMfaSync(true);
  });

  test('throws MFA error when no actor supplied', async () => {
    let caught = null;
    try {
      await ZKTecoService.syncAttendanceLogs('dev-1', 'manual', 'u1');
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeTruthy();
    expect(String(caught.message)).toMatch(/MFA: MFA_TIER_REQUIRED/);
  });

  test('throws MFA error when actor.mfaLevel < 2', async () => {
    let caught = null;
    try {
      await ZKTecoService.syncAttendanceLogs('dev-1', 'manual', 'u1', {
        actor: { userId: 'u1', mfaLevel: 1, mfaAssertedAt: new Date() },
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeTruthy();
    expect(String(caught.message)).toMatch(/MFA_TIER_REQUIRED/);
    expect(String(caught.message)).toMatch(/requiredTier=2/);
    expect(String(caught.message)).toMatch(/actorTier=1/);
  });

  test('system actor (W275q lib) passes the MFA guard', async () => {
    let caught = null;
    try {
      await ZKTecoService.syncAttendanceLogs('dev-1', 'auto', null, {
        actor: makeSystemActor(),
      });
    } catch (err) {
      caught = err;
    }
    // Guard passes → method proceeds → mocked findById returns null
    // → service throws "الجهاز غير موجود". Proves MFA didn't reject.
    expect(caught).toBeTruthy();
    expect(String(caught.message)).toMatch(/الجهاز غير موجود/);
    expect(String(caught.message)).not.toMatch(/MFA/);
  });

  test('__setEnforceMfaSync(false) bypasses guard', async () => {
    ZKTecoService.__setEnforceMfaSync(false);
    let caught = null;
    try {
      // No actor — would reject if enforcement on.
      await ZKTecoService.syncAttendanceLogs('dev-1', 'manual', 'u1');
    } catch (err) {
      caught = err;
    }
    // Bypassed → reaches findById which returns null → throws domain error.
    expect(caught).toBeTruthy();
    expect(String(caught.message)).toMatch(/الجهاز غير موجود/);
    expect(String(caught.message)).not.toMatch(/MFA/);
  });

  test('syncAllDevices propagates opts.actor to syncAttendanceLogs', async () => {
    const results = await ZKTecoService.syncAllDevices('u1', { actor: makeSystemActor() });
    // getActiveDevices() returns [] → no iterations; just confirms
    // the signature change didn't break the empty-loop path.
    expect(Array.isArray(results)).toBe(true);
    expect(results).toEqual([]);
  });
});

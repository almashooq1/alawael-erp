'use strict';

/**
 * face-enrollment-mfa-service-layer-wave275c.test.js — Wave 275c.
 *
 * 3rd application of the service-layer MFA enforcement pattern
 * established in [[wave275-service-layer-mfa-pilot]] (payroll-period)
 * and continued by [[wave275b-fraud-detection-mfa]] (fraud-detection).
 *
 * Coverage:
 *   - suspendTemplate (tier 2 / 15 min) — mirrors W273 route-layer tier
 *   - deactivateOnExit (tier 2 / 15 min) — closes W273 route-layer
 *     oversight on /templates/exit-cascade (now gated in this commit)
 *
 * 3rd adopter triggered the EXTRACT of `_checkMfaTier` to
 * `intelligence/_checkMfaTier.lib.js`. This test file verifies the
 * SERVICE-level integration (the lib has its own tests in
 * check-mfa-tier-lib-wave275c.test.js).
 */

const {
  createHikvisionFaceEnrollmentService,
} = require('../intelligence/hikvision-face-enrollment.service');
const reg = require('../intelligence/hikvision.registry');

const _stubModel = Object.freeze({
  findById() {
    throw new Error('stub: findById should not be reached when MFA guard rejects');
  },
  find() {
    throw new Error('stub: find should not be reached when MFA guard rejects');
  },
  findOne() {
    return null;
  },
});

function _makeService({ enforceMfa = true, now = () => new Date('2026-05-22T15:00:00Z') } = {}) {
  return createHikvisionFaceEnrollmentService({
    templateModel: _stubModel,
    libraryModel: _stubModel,
    enforceMfa,
    now,
  });
}

// ─── 1. suspendTemplate — tier 2 (15 min freshness) ───────────────

describe('Wave 275c — suspendTemplate MFA enforcement', () => {
  test('rejects MFA_TIER_REQUIRED when actor.mfaLevel < 2', async () => {
    const svc = _makeService();
    const r = await svc.suspendTemplate({
      templateId: 'tmpl-1',
      reason: 'employee leaving',
      actor: { userId: 'u1', mfaLevel: 1, mfaAssertedAt: new Date('2026-05-22T14:55:00Z') },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
    expect(r.requiredTier).toBe(2);
  });

  test('rejects MFA_FRESHNESS_REQUIRED when assertion older than 15 min', async () => {
    const svc = _makeService();
    const r = await svc.suspendTemplate({
      templateId: 'tmpl-1',
      reason: 'employee leaving',
      actor: { userId: 'u1', mfaLevel: 2, mfaAssertedAt: new Date('2026-05-22T14:40:00Z') },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_FRESHNESS_REQUIRED);
    expect(r.maxAgeMin).toBe(15);
    expect(r.ageMin).toBe(20);
  });

  test('MFA guard runs BEFORE templateId/reason validation (fail-fast)', async () => {
    const svc = _makeService();
    const r = await svc.suspendTemplate({
      // No templateId AND no reason — both would fire normally
      actor: { userId: 'u1', mfaLevel: 0 },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
  });

  test('passes guard then fails on stub (proves chain proceeds past MFA)', async () => {
    const svc = _makeService();
    let caught = null;
    try {
      await svc.suspendTemplate({
        templateId: 'tmpl-1',
        reason: 'employee leaving',
        actor: { userId: 'u1', mfaLevel: 2, mfaAssertedAt: new Date('2026-05-22T14:50:00Z') },
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeTruthy();
    expect(String(caught.message)).toMatch(/stub: findById/);
  });

  test('enforceMfa=false bypasses MFA guard', async () => {
    const svc = _makeService({ enforceMfa: false });
    let caught = null;
    try {
      await svc.suspendTemplate({
        templateId: 'tmpl-1',
        reason: 'employee leaving',
        actor: { userId: 'u1' }, // no mfaLevel
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeTruthy();
    expect(String(caught.message)).toMatch(/stub: findById/);
  });
});

// ─── 2. deactivateOnExit — tier 2 (15 min freshness) ──────────────

describe('Wave 275c — deactivateOnExit MFA enforcement', () => {
  test('rejects MFA_TIER_REQUIRED when actor.mfaLevel < 2', async () => {
    const svc = _makeService();
    const r = await svc.deactivateOnExit({
      employeeId: 'emp-1',
      exitReason: 'resignation',
      actor: { userId: 'u1', mfaLevel: 1, mfaAssertedAt: new Date('2026-05-22T14:55:00Z') },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
    expect(r.requiredTier).toBe(2);
  });

  test('rejects MFA_FRESHNESS_REQUIRED when assertion older than 15 min', async () => {
    const svc = _makeService();
    const r = await svc.deactivateOnExit({
      employeeId: 'emp-1',
      actor: { userId: 'u1', mfaLevel: 2, mfaAssertedAt: new Date('2026-05-22T14:30:00Z') },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_FRESHNESS_REQUIRED);
    expect(r.ageMin).toBe(30);
  });

  test('MFA guard runs BEFORE employeeId validation (fail-fast)', async () => {
    const svc = _makeService();
    const r = await svc.deactivateOnExit({
      // No employeeId — would normally fire EMPLOYEE_REQUIRED
      actor: { userId: 'u1', mfaLevel: 0 },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
  });

  test('passes guard then proceeds to template loop (which uses stubbed find)', async () => {
    const svc = _makeService();
    let caught = null;
    try {
      await svc.deactivateOnExit({
        employeeId: 'emp-1',
        actor: { userId: 'u1', mfaLevel: 2, mfaAssertedAt: new Date('2026-05-22T14:50:00Z') },
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeTruthy();
    // deactivateOnExit calls templateModel.find — stub throws.
    expect(String(caught.message)).toMatch(/stub: find/);
  });
});

// ─── 3. enrollEmployee — INTENTIONALLY NOT GATED ──────────────────

describe('Wave 275c — enrollEmployee stays open (deliberate)', () => {
  test('enrollEmployee is NOT MFA-gated (route layer has no requireMfaTier either)', async () => {
    // enrollEmployee creates a PENDING template — the high-impact
    // moves are confirmEnrollment (route gated via Nafath signature
    // not MFA tier per existing W273 design) + suspendTemplate /
    // deactivateOnExit (gated above). enrollEmployee itself stays open
    // because: (a) creating a pending template is reversible,
    // (b) the route layer doesn't require MFA tier on enrollment,
    // and (c) gating enrollment would block the bulk-onboarding flow.
    const svc = _makeService();
    // No mfaLevel — would fail any tier gate.
    const r = await svc.enrollEmployee({
      // No libraryId — would fail LIBRARY_NOT_FOUND validator first
      actor: { userId: 'u1' },
    });
    // Confirms enrollment is NOT MFA-gated: the response is
    // LIBRARY_NOT_FOUND (existing validator), not MFA_TIER_REQUIRED.
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.LIBRARY_NOT_FOUND);
  });
});

// ─── 4. factory enforceMfa flag ───────────────────────────────────

describe('Wave 275c — factory enforceMfa flag', () => {
  test('default is OFF (backwards-compatible with Wave 97 tests)', async () => {
    const defaultSvc = createHikvisionFaceEnrollmentService({
      templateModel: _stubModel,
      libraryModel: _stubModel,
    });
    let caught = null;
    try {
      // No mfaLevel — would reject if enforceMfa were true by default.
      await defaultSvc.suspendTemplate({
        templateId: 'tmpl-1',
        reason: 'leaving',
        actor: { userId: 'u1' },
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeTruthy();
    expect(String(caught.message)).toMatch(/stub: findById/);
  });

  test('enforceMfa: true → guard fires; enforceMfa: false → bypass', async () => {
    const enforced = _makeService({ enforceMfa: true });
    const bypassed = _makeService({ enforceMfa: false });

    const r1 = await enforced.suspendTemplate({
      templateId: 'tmpl-1',
      reason: 'leaving',
      actor: { userId: 'u1' }, // no mfaLevel
    });
    expect(r1.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);

    let bypassedErr = null;
    try {
      await bypassed.suspendTemplate({
        templateId: 'tmpl-1',
        reason: 'leaving',
        actor: { userId: 'u1' },
      });
    } catch (err) {
      bypassedErr = err;
    }
    expect(bypassedErr).toBeTruthy();
  });
});

'use strict';

/**
 * measures-governance-wave716.test.js — W716/W716.
 *
 * Two governance layers:
 *   W716 licensing.registry — every scoring module that ships an itemBank
 *        MUST have a licensing record; proprietary instruments must NOT be
 *        digitizable by default; assertDigitizable enforces permission.
 *   W716 clinical-use.policy — a screening instrument can never be used to
 *        diagnose; positive screens surface a confirmatory advisory.
 */

jest.setTimeout(15000);

const licensing = require('../measures/governance/licensing.registry');
const policy = require('../measures/governance/clinical-use.policy');
const scoringRegistry = require('../measures/scoring');

describe('W716 — licensing registry coverage', () => {
  test('every scoring module that ships an itemBank has a licensing record', () => {
    const missing = [];
    for (const code of scoringRegistry.list()) {
      const mod = scoringRegistry.resolve(code);
      if (mod && mod.itemBank) {
        if (!licensing.getLicensing(code)) missing.push(code);
      }
    }
    expect(missing).toEqual([]);
  });

  test('every licensing record uses a valid licenseType and required fields', () => {
    for (const code of licensing.listCodes()) {
      const rec = licensing.getLicensing(code);
      expect(rec).toBeTruthy();
      expect(licensing.VALID_LICENSE_TYPES.has(rec.licenseType)).toBe(true);
      expect(typeof rec.owner).toBe('string');
      expect(rec.owner.length).toBeGreaterThan(0);
      expect(typeof rec.notes_ar).toBe('string');
      expect(rec.notes_ar.length).toBeGreaterThan(0);
      expect(typeof rec.digitizationDefault).toBe('boolean');
    }
  });

  test('proprietary + licensed instruments are NOT digitizable by default', () => {
    for (const code of licensing.listCodes()) {
      const rec = licensing.getLicensing(code);
      if (
        rec.licenseType === licensing.LICENSE_TYPES.PROPRIETARY ||
        rec.licenseType === licensing.LICENSE_TYPES.LICENSED
      ) {
        expect(rec.digitizationDefault).toBe(false);
      }
    }
  });

  test('public_domain + free_with_attribution are digitizable by default', () => {
    for (const code of licensing.listCodes()) {
      const rec = licensing.getLicensing(code);
      if (
        rec.licenseType === licensing.LICENSE_TYPES.PUBLIC_DOMAIN ||
        rec.licenseType === licensing.LICENSE_TYPES.FREE_WITH_ATTRIBUTION
      ) {
        expect(rec.digitizationDefault).toBe(true);
      }
    }
  });
});

describe('W716 — assertDigitizable enforcement', () => {
  test('public-domain instrument renders without permission', () => {
    expect(licensing.evaluateDigitization('BERG').allowed).toBe(true);
    expect(() => licensing.assertDigitizable('BERG')).not.toThrow();
  });

  test('proprietary instrument is blocked without a permissionRef', () => {
    const res = licensing.evaluateDigitization('CARS-2');
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe('PROPRIETARY_LICENSE_REQUIRED');
    expect(() => licensing.assertDigitizable('CARS-2')).toThrow(/DIGITIZATION_BLOCKED|blocked/i);
  });

  test('proprietary instrument unlocks once a permissionRef is on file', () => {
    const res = licensing.evaluateDigitization('CARS-2', { permissionRef: 'WPS-LIC-2026-001' });
    expect(res.allowed).toBe(true);
    expect(res.reason).toBe('PERMISSION_ON_FILE');
    expect(() =>
      licensing.assertDigitizable('CARS-2', { permissionRef: 'WPS-LIC-2026-001' })
    ).not.toThrow();
  });

  test('unknown code yields NO_LICENSING_RECORD and blocks', () => {
    const res = licensing.evaluateDigitization('NOPE-999');
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe('NO_LICENSING_RECORD');
  });

  test('thrown error carries machine-readable code', () => {
    try {
      licensing.assertDigitizable('VINELAND-3');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err.code).toBe('MEASURE_DIGITIZATION_BLOCKED');
      expect(err.licenseType).toBe('proprietary');
    }
  });
});

describe('W716 — screening cannot diagnose', () => {
  const screening = {
    code: 'M-CHAT-R',
    name: 'M-CHAT-R',
    name_ar: 'مقياس الفرز',
    purpose: 'screening',
  };
  const diagnostic = { code: 'CARS-2', name: 'CARS-2', purpose: 'diagnostic' };

  test('screening tool blocked from diagnostic intent', () => {
    const res = policy.evaluateUse(screening, policy.USE_INTENTS.DIAGNOSTIC);
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe('SCREENING_CANNOT_DIAGNOSE');
    expect(res.requiresConfirmatory).toBe(true);
    expect(() => policy.assertUse(screening, policy.USE_INTENTS.DIAGNOSTIC)).toThrow(
      /MEASURE_USE_NOT_PERMITTED|cannot be used/i
    );
  });

  test('screening tool allowed for screening + monitoring', () => {
    expect(policy.evaluateUse(screening, policy.USE_INTENTS.SCREENING).allowed).toBe(true);
    expect(policy.evaluateUse(screening, policy.USE_INTENTS.MONITORING).allowed).toBe(true);
  });

  test('diagnostic tool allowed for diagnostic + severity', () => {
    expect(policy.evaluateUse(diagnostic, policy.USE_INTENTS.DIAGNOSTIC).allowed).toBe(true);
    expect(policy.evaluateUse(diagnostic, policy.USE_INTENTS.SEVERITY).allowed).toBe(true);
  });

  test('confirmatoryAdvisory only fires for screening tools, bilingual', () => {
    const adv = policy.confirmatoryAdvisory(screening);
    expect(adv).toBeTruthy();
    expect(adv.action).toBe('REFER_FOR_DIAGNOSTIC_ASSESSMENT');
    expect(adv.ar.length).toBeGreaterThan(0);
    expect(adv.en.length).toBeGreaterThan(0);
    expect(policy.confirmatoryAdvisory(diagnostic)).toBeNull();
  });

  test('isScreeningOnly / isDiagnostic discriminate correctly', () => {
    expect(policy.isScreeningOnly(screening)).toBe(true);
    expect(policy.isScreeningOnly(diagnostic)).toBe(false);
    expect(policy.isDiagnostic(diagnostic)).toBe(true);
  });
});

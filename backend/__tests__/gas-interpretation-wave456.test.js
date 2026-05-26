'use strict';

/**
 * W456 drift guard — Family/Clinician/Beneficiary GAS interpretation.
 *
 * Locks the 3-surface narrative pattern from v3 Engagement Architecture:
 *   • interpretForFamily(tScore, opts) — bilingual ar+en
 *   • interpretForClinician(tScore, opts) — technical, with CI band
 *   • interpretForBeneficiary(tScore, opts) — age/ability-adapted
 *   • interpretAll(tScore, opts) — bundle
 *   • bandFor(tScore) — band classification
 *
 * Pure-lib tests. No I/O.
 */

const lib = require('../intelligence/gas-interpretation.lib');

describe('W456 — module surface', () => {
  it('exports the documented public API', () => {
    expect(typeof lib.interpretForFamily).toBe('function');
    expect(typeof lib.interpretForClinician).toBe('function');
    expect(typeof lib.interpretForBeneficiary).toBe('function');
    expect(typeof lib.interpretAll).toBe('function');
    expect(typeof lib.bandFor).toBe('function');
    expect(typeof lib.BANDS).toBe('object');
  });

  it('module export is frozen', () => {
    expect(Object.isFrozen(lib)).toBe(true);
    expect(Object.isFrozen(lib.BANDS)).toBe(true);
  });
});

describe('W456 — bandFor classification', () => {
  it('classifies T ≥ 60 as excellent', () => {
    expect(lib.bandFor(60)).toBe('excellent');
    expect(lib.bandFor(75)).toBe('excellent');
  });

  it('classifies 55 ≤ T < 60 as exceeded', () => {
    expect(lib.bandFor(55)).toBe('exceeded');
    expect(lib.bandFor(59.9)).toBe('exceeded');
  });

  it('classifies 45 ≤ T < 55 as met', () => {
    expect(lib.bandFor(45)).toBe('met');
    expect(lib.bandFor(50)).toBe('met');
    expect(lib.bandFor(54.9)).toBe('met');
  });

  it('classifies 40 ≤ T < 45 as below', () => {
    expect(lib.bandFor(40)).toBe('below');
    expect(lib.bandFor(44.9)).toBe('below');
  });

  it('classifies T < 40 as poor', () => {
    expect(lib.bandFor(39.9)).toBe('poor');
    expect(lib.bandFor(20)).toBe('poor');
  });

  it('returns no-data for null/undefined/NaN', () => {
    expect(lib.bandFor(null)).toBe('no-data');
    expect(lib.bandFor(undefined)).toBe('no-data');
    expect(lib.bandFor(NaN)).toBe('no-data');
    expect(lib.bandFor('string')).toBe('no-data');
  });
});

describe('W456 — interpretForFamily', () => {
  it('produces Arabic + English narrative for met band', () => {
    const r = lib.interpretForFamily(50);
    expect(r.band).toBe('met');
    expect(r.ar).toMatch(/توقع|توقعات/);
    expect(r.en).toMatch(/expected/i);
    expect(r.tScore).toBe(50);
  });

  it('produces excellent-band narrative for T ≥ 60', () => {
    const r = lib.interpretForFamily(65);
    expect(r.band).toBe('excellent');
    expect(r.ar).toMatch(/رائع|ممتاز|فاق/);
    expect(r.suggestedAction).toBe('celebrate_continue');
  });

  it('produces poor-band narrative for T < 40', () => {
    const r = lib.interpretForFamily(30);
    expect(r.band).toBe('poor');
    expect(r.ar).toMatch(/مراجعة عاجلة/);
    expect(r.suggestedAction).toBe('urgent_review');
  });

  it('uses provided beneficiary name in narrative', () => {
    const r = lib.interpretForFamily(50, { beneficiaryName: 'محمد' });
    expect(r.ar).toContain('محمد');
  });

  it('falls back to default name when not provided', () => {
    const r = lib.interpretForFamily(50);
    expect(r.ar).toContain('ابنكم');
  });

  it('returns no-data narrative for null T-score', () => {
    const r = lib.interpretForFamily(null);
    expect(r.band).toBe('no-data');
    expect(r.tScore).toBeNull();
    expect(r.suggestedAction).toBe('collect_data');
  });

  it('format T-score to 1 decimal place', () => {
    const r = lib.interpretForFamily(52.789);
    expect(r.ar).toContain('52.8');
  });
});

describe('W456 — interpretForClinician', () => {
  it('produces technical narrative with band label', () => {
    const r = lib.interpretForClinician(50);
    expect(r.band).toBe('met');
    expect(r.en).toMatch(/Met-expectations band/);
  });

  it('includes CI95 bounds when provided', () => {
    const r = lib.interpretForClinician(50, { ci95Lower: 47, ci95Upper: 53 });
    expect(r.en).toMatch(/95% CI:\s*47\.0,\s*53\.0/);
  });

  it('includes goal count when provided', () => {
    const r = lib.interpretForClinician(50, { goalCount: 7 });
    expect(r.en).toMatch(/n=7 goals/);
  });

  it('returns no-data for null', () => {
    const r = lib.interpretForClinician(null);
    expect(r.band).toBe('no-data');
  });
});

describe('W456 — interpretForBeneficiary', () => {
  it('uses verbal narrative for older beneficiary by default', () => {
    const r = lib.interpretForBeneficiary(50, { ageMonths: 120 });
    expect(r.ar).toMatch(/جيد/);
    expect(r.symbol).toBeUndefined();
  });

  it('uses symbol mode for AAC modality', () => {
    const r = lib.interpretForBeneficiary(50, { modality: 'aac' });
    expect(r.symbol).toBeDefined();
    expect(['🌟', '😀', '🙂', '😐', '🤝']).toContain(r.symbol);
  });

  it('uses symbol mode for young beneficiary (<60 months)', () => {
    const r = lib.interpretForBeneficiary(65, { ageMonths: 36 });
    expect(r.symbol).toBe('🌟');
  });

  it('falls back to symbol for no-data', () => {
    const r = lib.interpretForBeneficiary(null, { modality: 'aac' });
    expect(r.symbol).toBe('?');
  });

  it('falls back to verbal for no-data when not aac', () => {
    const r = lib.interpretForBeneficiary(null, { ageMonths: 120 });
    expect(r.ar).toMatch(/لم نقم بالقياس/);
  });
});

describe('W456 — interpretAll bundle', () => {
  it('returns family + clinician + beneficiary + band + tScore', () => {
    const r = lib.interpretAll(53, { beneficiaryName: 'سارة' });
    expect(r.family).toBeDefined();
    expect(r.clinician).toBeDefined();
    expect(r.beneficiary).toBeDefined();
    expect(r.band).toBe('met');
    expect(r.tScore).toBe(53);
    expect(r.family.ar).toContain('سارة');
  });

  it('handles null T-score consistently across all 3 surfaces', () => {
    const r = lib.interpretAll(null);
    expect(r.family.band).toBe('no-data');
    expect(r.clinician.band).toBe('no-data');
    expect(r.beneficiary.band).toBe('no-data');
  });
});

describe('W456 — BANDS constant integrity', () => {
  it('exports 5 named bands', () => {
    const keys = Object.keys(lib.BANDS);
    expect(keys).toEqual(expect.arrayContaining(['EXCELLENT', 'EXCEEDED', 'MET', 'BELOW', 'POOR']));
  });

  it('bands have min/max/key', () => {
    for (const b of Object.values(lib.BANDS)) {
      expect(typeof b.min).toBe('number');
      expect(typeof b.max).toBe('number');
      expect(typeof b.key).toBe('string');
    }
  });
});

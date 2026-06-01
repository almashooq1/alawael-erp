'use strict';

/**
 * scoring-disability-fallrisk-wave712.test.js — W712
 *
 * Contract + registry + governance + behavioural coverage for three essential
 * public-domain / free-with-attribution instruments for a disability platform:
 *   • WHODAS-12 — WHO Disability Assessment Schedule 2.0 (12-item)  [free w/ attribution]
 *   • FTS5      — Five Times Sit-to-Stand Test (timed, seconds)     [public domain]
 *   • MORSE     — Morse Fall Scale (6 weighted items)               [public domain]
 *
 * All three modules are PURE (no mongoose) — no DB mocking required.
 */

const { validateContract } = require('../measures/scoring/contract');
const registry = require('../measures/scoring');
const { getLicensing, evaluateDigitization } = require('../measures/governance/licensing.registry');

const CODES = ['WHODAS-12', 'FTS5', 'MORSE'];
const PUBLIC_DOMAIN = ['FTS5', 'MORSE'];
const FILES = {
  'WHODAS-12': '../measures/scoring/whodas12',
  FTS5: '../measures/scoring/fts5',
  MORSE: '../measures/scoring/morse',
};

describe('W712 — contract compliance', () => {
  test.each(CODES)('%s satisfies the scoring contract', code => {
    const mod = require(FILES[code]);
    expect(() => validateContract(mod)).not.toThrow();
    expect(mod.measureCode).toBe(code);
    expect(mod.direction).toBe('lower_better');
  });
});

describe('W712 — registry wiring', () => {
  test('all three resolve from the auto-loading registry', () => {
    for (const code of CODES) {
      expect(registry.has(code)).toBe(true);
      expect(registry.resolve(code).measureCode).toBe(code);
    }
  });

  test('item banks are exposed at .itemBank.items with the expected counts', () => {
    expect(registry.getItemBank('WHODAS-12').itemBank.items).toHaveLength(12);
    expect(registry.getItemBank('FTS5').itemBank.items).toHaveLength(1);
    expect(registry.getItemBank('MORSE').itemBank.items).toHaveLength(6);
  });

  test('rawShape is item_array for all three', () => {
    for (const code of CODES) {
      expect(registry.resolve(code).rawShape).toBe('item_array');
    }
  });
});

describe('W712 — licensing governance (W692)', () => {
  test.each(CODES)('%s has a licensing record and is digitizable by default', code => {
    const lic = getLicensing(code);
    expect(lic).toBeTruthy();
    expect(evaluateDigitization(code, {}).allowed).toBe(true);
  });

  test.each(PUBLIC_DOMAIN)('%s is public_domain', code => {
    expect(getLicensing(code).licenseType).toBe('public_domain');
  });

  test('WHODAS-12 is free_with_attribution and requires attribution', () => {
    const lic = getLicensing('WHODAS-12');
    expect(lic.licenseType).toBe('free_with_attribution');
    expect(lic.requiresAttribution).toBe(true);
  });
});

describe('WHODAS-12 — compute / interpret / delta', () => {
  const mod = registry.resolve('WHODAS-12');

  test('sums 12 items 0–48 and surfaces percent + actionable flag', () => {
    const d = mod.computeDerived([0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1]); // 21
    expect(d.value).toBe(21);
    expect(d.notes.percent).toBeCloseTo(43.8, 1);
    expect(d.notes.actionableLimitation).toBe(true);
    expect(mod.interpret(21).band).toBe('moderate_disability');
  });

  test('band ladder across the range', () => {
    expect(mod.interpret(0).band).toBe('no_disability');
    expect(mod.interpret(10).band).toBe('mild_disability');
    expect(mod.interpret(20).band).toBe('moderate_disability');
    expect(mod.interpret(30).band).toBe('severe_disability');
    expect(mod.interpret(45).band).toBe('extreme_disability');
  });

  test('rejects wrong length and out-of-range items', () => {
    expect(mod.validateRaw([0, 1, 2]).ok).toBe(false);
    expect(mod.validateRaw([0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 5]).ok).toBe(false);
    expect(() => mod.computeDerived([0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 5])).toThrow(/WHODAS-12/);
  });

  test('delta is direction-aware (worsening = rising score declines)', () => {
    const d = mod.delta(8, 26, mod);
    expect(d.direction).toBe('declining');
    expect(d.bandShift).toBe(2); // mild(1) -> severe(3)
  });
});

describe('FTS5 — compute / interpret / delta', () => {
  const mod = registry.resolve('FTS5');

  test('accepts a non-integer time and flags fall risk at the cutoff', () => {
    const d = mod.computeDerived([13.5]);
    expect(d.value).toBe(13.5);
    expect(d.notes.increasedFallRisk).toBe(true);
    expect(mod.interpret(13.5).band).toBe('increased_fall_risk');
  });

  test('fast performance is normal, very slow is critical', () => {
    expect(mod.interpret(9).band).toBe('normal_performance');
    expect(mod.interpret(9).severity).toBe('normal');
    expect(mod.interpret(25).severity).toBe('critical');
  });

  test('rejects non-positive / non-numeric / wrong length', () => {
    expect(mod.validateRaw([0]).ok).toBe(false);
    expect(mod.validateRaw([-3]).ok).toBe(false);
    expect(mod.validateRaw(['x']).ok).toBe(false);
    expect(mod.validateRaw([10, 12]).ok).toBe(false);
  });

  test('delta flags crossing into fall risk', () => {
    const d = mod.delta(10, 14, mod);
    expect(d.direction).toBe('declining');
    expect(d.fallRiskCrossed).toBe(true);
  });
});

describe('MORSE — compute / interpret / delta', () => {
  const mod = registry.resolve('MORSE');

  test('weighted-sums the 6 point values, flags high risk at ≥45', () => {
    const d = mod.computeDerived([25, 15, 0, 20, 10, 0]); // 70
    expect(d.value).toBe(70);
    expect(d.notes.highRisk).toBe(true);
    expect(mod.interpret(70).band).toBe('high_risk');
    expect(mod.interpret(70).severity).toBe('critical');
  });

  test('band ladder: low / moderate / high', () => {
    expect(mod.interpret(0).band).toBe('low_risk');
    expect(mod.interpret(30).band).toBe('moderate_risk');
    expect(mod.interpret(45).band).toBe('high_risk');
  });

  test('rejects values not in an item allowed set', () => {
    expect(mod.validateRaw([25, 15, 30, 20, 20, 15]).ok).toBe(true); // max 125
    expect(mod.validateRaw([10, 15, 30, 20, 20, 15]).ok).toBe(false); // item1 not 0|25
    expect(() => mod.computeDerived([25, 15, 30, 20, 20, 99])).toThrow(/Morse/);
    expect(mod.validateRaw([25, 15, 30]).ok).toBe(false); // wrong length
  });

  test('delta reports risk-band shift', () => {
    const d = mod.delta(10, 50, mod);
    expect(d.direction).toBe('declining');
    expect(d.riskBandShift).toBe(2); // low(0) -> high(2)
  });
});

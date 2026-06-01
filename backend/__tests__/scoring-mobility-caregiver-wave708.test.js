'use strict';

/**
 * scoring-mobility-caregiver-wave708.test.js — W708
 *
 * Contract + behaviour coverage for three public-domain measures added in W708:
 *   • CSI     — Caregiver Strain Index (sum, lower_better, 13 binary items)
 *   • TUG     — Timed Up and Go (algorithm, lower_better, single timed value)
 *   • TINETTI — Tinetti POMA balance+gait (sum, higher_better, 2 sub-scores)
 *
 * Scoring modules are PURE (no mongoose) — no DB mocking required.
 */

const path = require('path');
const { validateContract } = require('../measures/scoring/contract');
const registry = require('../measures/scoring');
const governance = require('../measures/governance/licensing.registry');

const CODES = ['CSI', 'TUG', 'TINETTI'];
const FILES = { CSI: 'csi.js', TUG: 'tug.js', TINETTI: 'tinetti.js' };

describe('W708 contract compliance', () => {
  test.each(CODES)('%s satisfies the scoring contract', code => {
    const mod = require(path.join('..', 'measures', 'scoring', FILES[code]));
    expect(() => validateContract(mod, FILES[code])).not.toThrow();
  });
});

describe('W708 registry wiring', () => {
  test.each(CODES)('registry resolves %s', code => {
    expect(registry.has(code)).toBe(true);
    expect(registry.resolve(code).measureCode).toBe(code);
  });

  test.each(CODES)('%s item bank matches expectedItemCount', code => {
    const mod = registry.resolve(code);
    const bank = registry.getItemBank(code);
    expect(bank.itemBank.items).toHaveLength(mod.expectedItemCount);
    expect(mod.rawShape).toBe('item_array');
  });
});

describe('W708 licensing governance', () => {
  test.each(CODES)('%s is public_domain and digitizable', code => {
    const lic = governance.getLicensing(code);
    expect(lic).toBeTruthy();
    expect(lic.licenseType).toBe('public_domain');
    expect(governance.evaluateDigitization(code, {}).allowed).toBe(true);
  });
});

describe('CSI — Caregiver Strain Index', () => {
  const csi = registry.resolve('CSI');
  const allYes = Array(13).fill(1);
  const allNo = Array(13).fill(0);

  test('direction is lower_better with 13 binary items', () => {
    expect(csi.direction).toBe('lower_better');
    expect(csi.expectedItemCount).toBe(13);
    expect(csi.scoreRange).toEqual({ min: 0, max: 13 });
  });

  test('computeDerived sums binary items and flags high strain at cutoff', () => {
    expect(csi.computeDerived(allNo).value).toBe(0);
    expect(csi.computeDerived(allYes).value).toBe(13);
    const seven = [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0];
    const d = csi.computeDerived(seven);
    expect(d.value).toBe(7);
    expect(d.notes.highStrain).toBe(true);
  });

  test('interpret escalates low → moderate → high', () => {
    expect(csi.interpret(2).band).toBe('low_strain');
    expect(csi.interpret(5).band).toBe('moderate_strain');
    expect(csi.interpret(9).band).toBe('high_strain');
    expect(csi.interpret(9).severity).toBe('severe');
  });

  test('validateRaw rejects bad length and non-binary values', () => {
    expect(csi.validateRaw([1, 0, 1]).ok).toBe(false);
    expect(csi.validateRaw([...Array(12).fill(0), 2]).ok).toBe(false);
    expect(csi.validateRaw(allYes).ok).toBe(true);
  });

  test('delta marks cutoff crossing and returns null on missing prev/curr', () => {
    const d = csi.delta(8, 4, csi);
    expect(d.direction).toBe('improving');
    expect(d.cutoffCrossed).toBe(true);
    expect(csi.delta(null, 4, csi)).toBeNull();
  });
});

describe('TUG — Timed Up and Go', () => {
  const tug = registry.resolve('TUG');

  test('single timed value, lower_better, algorithm', () => {
    expect(tug.derivedType).toBe('algorithm');
    expect(tug.direction).toBe('lower_better');
    expect(tug.expectedItemCount).toBe(1);
  });

  test('computeDerived rounds to 0.1s and flags fall risk past cutoff', () => {
    expect(tug.computeDerived([9.94]).value).toBe(9.9);
    expect(tug.computeDerived([8]).notes.fallRisk).toBe(false);
    expect(tug.computeDerived([14]).notes.fallRisk).toBe(true);
  });

  test('interpret bands across mobility thresholds', () => {
    expect(tug.interpret(8).band).toBe('freely_mobile');
    expect(tug.interpret(15).band).toBe('mostly_independent');
    expect(tug.interpret(25).band).toBe('variable_mobility');
    expect(tug.interpret(35).band).toBe('dependent');
    expect(tug.interpret(35).severity).toBe('critical');
  });

  test('validateRaw rejects non-positive, out-of-range, and wrong length', () => {
    expect(tug.validateRaw([0]).ok).toBe(false);
    expect(tug.validateRaw([999]).ok).toBe(false);
    expect(tug.validateRaw([10, 11]).ok).toBe(false);
    expect(tug.validateRaw([12.5]).ok).toBe(true);
  });

  test('computeDerived throws on invalid input', () => {
    expect(() => tug.computeDerived([-1])).toThrow();
  });

  test('delta flags fall-risk cutoff crossing and null guard', () => {
    const d = tug.delta(18, 9, tug);
    expect(d.direction).toBe('improving');
    expect(d.fallRiskCutoffCrossed).toBe(true);
    expect(tug.delta(9, null, tug)).toBeNull();
  });
});

describe('TINETTI — POMA balance & gait', () => {
  const tn = registry.resolve('TINETTI');

  test('two sub-scores summed, higher_better, total 0-28', () => {
    expect(tn.direction).toBe('higher_better');
    expect(tn.expectedItemCount).toBe(2);
    expect(tn.scoreRange).toEqual({ min: 0, max: 28 });
  });

  test('computeDerived exposes balance/gait subscales', () => {
    const d = tn.computeDerived([14, 10]);
    expect(d.value).toBe(24);
    expect(d.subscales).toEqual({ balance: 14, gait: 10 });
    expect(d.notes.highFallRisk).toBe(false);
  });

  test('interpret dichotomises fall risk', () => {
    expect(tn.interpret(15).band).toBe('high_fall_risk');
    expect(tn.interpret(21).band).toBe('moderate_fall_risk');
    expect(tn.interpret(26).band).toBe('low_fall_risk');
    expect(tn.interpret(28).severity).toBe('normal');
  });

  test('validateRaw enforces per-component ranges and length', () => {
    expect(tn.validateRaw([17, 10]).ok).toBe(false); // balance > 16
    expect(tn.validateRaw([10, 13]).ok).toBe(false); // gait > 12
    expect(tn.validateRaw([10]).ok).toBe(false); // wrong length
    expect(tn.validateRaw([16, 12]).ok).toBe(true);
  });

  test('computeDerived throws on invalid sub-score', () => {
    expect(() => tn.computeDerived([10, 99])).toThrow();
  });

  test('delta reports risk-band change and null guard', () => {
    const d = tn.delta(15, 26, tn);
    expect(d.direction).toBe('improving');
    expect(d.riskBandChange).toBe('high_to_low');
    expect(tn.delta(null, null, tn)).toBeNull();
  });
});

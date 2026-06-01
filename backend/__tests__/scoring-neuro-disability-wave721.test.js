'use strict';

/**
 * W721 — drift + behavioural tests for the two neuro-disability scoring
 * modules: Modified Rankin Scale (MRS) and Glasgow Coma Scale (GCS).
 *
 * Pure modules — no mongoose, no DB. Validates contract compliance, registry
 * wiring, licensing governance, and the scoring/interpret/delta behaviour.
 */

const { validateContract } = require('../measures/scoring/contract');
const registry = require('../measures/scoring');
const mrs = require('../measures/scoring/mrs');
const gcs = require('../measures/scoring/gcs');
const licensing = require('../measures/governance/licensing.registry');

describe('W721 contract compliance', () => {
  test.each([
    ['mrs.js', mrs],
    ['gcs.js', gcs],
  ])('%s satisfies the scoring contract', (filename, mod) => {
    expect(() => validateContract(mod, filename)).not.toThrow();
  });
});

describe('W721 registry wiring', () => {
  test('MRS and GCS are resolvable', () => {
    expect(registry.has('MRS')).toBe(true);
    expect(registry.has('GCS')).toBe(true);
    expect(registry.resolve('MRS').measureCode).toBe('MRS');
    expect(registry.resolve('GCS').measureCode).toBe('GCS');
  });

  test('item banks are exposed and match expectedItemCount', () => {
    expect(registry.getItemBank('MRS').itemBank.items).toHaveLength(mrs.expectedItemCount);
    expect(registry.getItemBank('GCS').itemBank.items).toHaveLength(gcs.expectedItemCount);
  });

  test('both use item_array rawShape', () => {
    expect(mrs.rawShape).toBe('item_array');
    expect(gcs.rawShape).toBe('item_array');
  });
});

describe('W721 licensing governance', () => {
  test.each(['MRS', 'GCS'])('%s is public domain and digitizable', code => {
    const rec = licensing.getLicensing(code);
    expect(rec).toBeTruthy();
    expect(rec.licenseType).toBe('public_domain');
    expect(licensing.evaluateDigitization(code).allowed).toBe(true);
  });
});

describe('W721 Modified Rankin Scale (MRS)', () => {
  test('lower_better ordinal lookup over 7 grades', () => {
    expect(mrs.direction).toBe('lower_better');
    expect(mrs.derivedType).toBe('lookup_table');
    expect(mrs.scoreRange).toEqual({ min: 0, max: 6 });
  });

  test('computeDerived returns the grade and favourable-outcome flag', () => {
    expect(mrs.computeDerived([0]).value).toBe(0);
    expect(mrs.computeDerived([2]).notes.favourableOutcome).toBe(true);
    expect(mrs.computeDerived([3]).notes.favourableOutcome).toBe(false);
    expect(mrs.computeDerived([6]).notes.deceased).toBe(true);
  });

  test('interpret bands escalate with grade', () => {
    expect(mrs.interpret(0).band).toBe('mrs_0');
    expect(mrs.interpret(0).severity).toBe('normal');
    expect(mrs.interpret(3).severity).toBe('moderate');
    expect(mrs.interpret(5).severity).toBe('critical');
    expect(mrs.interpret(6).label_ar).toContain('وفاة');
  });

  test('validateRaw rejects out-of-range and wrong length', () => {
    expect(mrs.validateRaw([7]).ok).toBe(false);
    expect(mrs.validateRaw([1, 2]).ok).toBe(false);
    expect(mrs.validateRaw([3]).ok).toBe(true);
  });

  test('delta is lower_better with gradeChange', () => {
    const d = mrs.delta(4, 2, registry.resolve('MRS'));
    expect(d.direction).toBe('improving');
    expect(d.gradeChange).toBe('4_to_2');
    expect(mrs.delta(null, 2, registry.resolve('MRS'))).toBeNull();
  });
});

describe('W721 Glasgow Coma Scale (GCS)', () => {
  test('higher_better sum 3-15 with three subscales', () => {
    expect(gcs.direction).toBe('higher_better');
    expect(gcs.derivedType).toBe('sum');
    expect(gcs.scoreRange).toEqual({ min: 3, max: 15 });
    expect(gcs.expectedItemCount).toBe(3);
  });

  test('computeDerived sums components and exposes the E/V/M breakdown', () => {
    const d = gcs.computeDerived([4, 5, 6]);
    expect(d.value).toBe(15);
    expect(d.subscales).toEqual({ eye: 4, verbal: 5, motor: 6 });
    expect(d.notes.breakdown).toBe('E4V5M6');
  });

  test('interpret severity dichotomy ≤8 / 9-12 / 13-15', () => {
    expect(gcs.interpret(3).band).toBe('severe');
    expect(gcs.interpret(8).band).toBe('severe');
    expect(gcs.interpret(9).band).toBe('moderate');
    expect(gcs.interpret(12).band).toBe('moderate');
    expect(gcs.interpret(13).band).toBe('mild');
    expect(gcs.interpret(15).severity).toBe('normal');
  });

  test('validateRaw enforces per-component ranges and length', () => {
    expect(gcs.validateRaw([4, 5, 6]).ok).toBe(true);
    expect(gcs.validateRaw([5, 5, 6]).ok).toBe(false); // eye max is 4
    expect(gcs.validateRaw([4, 6, 6]).ok).toBe(false); // verbal max is 5
    expect(gcs.validateRaw([4, 5, 7]).ok).toBe(false); // motor max is 6
    expect(gcs.validateRaw([4, 5]).ok).toBe(false); // missing motor
  });

  test('computeDerived throws on invalid input', () => {
    expect(() => gcs.computeDerived([0, 5, 6])).toThrow(/eye/);
  });

  test('delta is higher_better with bandChange', () => {
    const d = gcs.delta(7, 13, registry.resolve('GCS'));
    expect(d.direction).toBe('improving');
    expect(d.bandChange).toBe('severe_to_mild');
    expect(gcs.delta(null, 10, registry.resolve('GCS'))).toBeNull();
  });
});

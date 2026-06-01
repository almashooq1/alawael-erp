'use strict';

/**
 * scoring-adl-spasticity-W706.test.js — W706.
 *
 * Locks the two public-domain rehabilitation measures added in W706:
 *   • BARTHEL  (ADL independence, weighted_sum, higher_better, 0–100)
 *   • MAS      (Modified Ashworth Scale, spasticity, lookup_table, lower_better)
 *
 * Verifies contract compliance, registry auto-discovery + item bank,
 * weighted/ordinal scoring math, dependency/spasticity bands, direction-aware
 * delta, and default digitizability (public-domain licensing records).
 */

const registry = require('../measures/scoring');
const { validateContract } = require('../measures/scoring/contract');
const licensing = require('../measures/governance/licensing.registry');

const barthel = require('../measures/scoring/barthel');
const mas = require('../measures/scoring/mas');

describe('W706 — contract + registry + licensing', () => {
  const modules = [
    ['BARTHEL', barthel, 'barthel.js', 10],
    ['MAS', mas, 'mas.js', 1],
  ];

  test.each(modules)('%s passes the scoring contract', (_code, mod, file) => {
    expect(() => validateContract(mod, file)).not.toThrow();
  });

  test.each(modules)('%s resolves from the registry with an item bank', (code, _m, _f, count) => {
    const bank = registry.getItemBank(code);
    expect(bank).toBeTruthy();
    expect(bank.itemBank.items).toHaveLength(count);
    expect(bank.rawShape).toBe('item_array');
  });

  test.each(modules)('%s is digitizable by default (public-domain)', code => {
    const rec = licensing.getLicensing(code);
    expect(rec).toBeTruthy();
    expect(rec.licenseType).toBe('public_domain');
    expect(licensing.evaluateDigitization(code).allowed).toBe(true);
    expect(() => licensing.assertDigitizable(code)).not.toThrow();
  });
});

describe('W706 — Barthel Index (ADL independence)', () => {
  const full = [10, 5, 5, 10, 10, 10, 10, 15, 15, 10]; // = 100
  const none = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // = 0

  test('weighted sum and dependency bands', () => {
    expect(barthel.computeDerived(full).value).toBe(100);
    expect(barthel.computeDerived(none).value).toBe(0);
    expect(barthel.interpret(100).band).toBe('independent');
    expect(barthel.interpret(95).band).toBe('slight_dependency');
    expect(barthel.interpret(75).band).toBe('moderate_dependency');
    expect(barthel.interpret(40).band).toBe('severe_dependency');
    expect(barthel.interpret(10).band).toBe('total_dependency');
  });

  test('exposes per-domain subscales', () => {
    const d = barthel.computeDerived(full);
    expect(d.subscales.transfers).toBe(15);
    expect(d.subscales.feeding).toBe(10);
    expect(Object.keys(d.subscales)).toHaveLength(10);
  });

  test('validateRaw rejects out-of-set values and wrong length', () => {
    expect(barthel.validateRaw(none).ok).toBe(true);
    // 7 is not an allowed weighted value for feeding (0/5/10)
    const bad = full.slice();
    bad[0] = 7;
    expect(barthel.validateRaw(bad).ok).toBe(false);
    expect(barthel.validateRaw(full.slice(0, 9)).ok).toBe(false);
  });

  test('higher_better delta flags improvement, MCID and band change', () => {
    const d = barthel.delta(40, 95, { interpretation: {} });
    expect(d.direction).toBe('improving');
    expect(d.mcidMet).toBe(true);
    expect(d.bandChange).toBe('severe_dependency_to_slight_dependency');
    expect(barthel.delta(80, 85, { interpretation: {} }).mcidMet).toBe(false);
  });
});

describe('W706 — Modified Ashworth Scale (spasticity)', () => {
  test('ordinal lookup maps index → grade label including 1+', () => {
    expect(mas.computeDerived([0]).notes.grade).toBe('0');
    expect(mas.computeDerived([2]).notes.grade).toBe('1+');
    expect(mas.computeDerived([5]).notes.grade).toBe('4');
  });

  test('echoes muscle group from ctx', () => {
    const d = mas.computeDerived([3], { muscleGroup: 'elbow_flexors' });
    expect(d.notes.muscleGroup).toBe('elbow_flexors');
  });

  test('severity bands escalate with grade', () => {
    expect(mas.interpret(0).severity).toBe('normal');
    expect(mas.interpret(2).severity).toBe('mild');
    expect(mas.interpret(3).severity).toBe('moderate');
    expect(mas.interpret(4).severity).toBe('severe');
    expect(mas.interpret(5).severity).toBe('critical');
  });

  test('validateRaw rejects out-of-range and multi-item input', () => {
    expect(mas.validateRaw([3]).ok).toBe(true);
    expect(mas.validateRaw([6]).ok).toBe(false);
    expect(mas.validateRaw([1, 2]).ok).toBe(false);
  });

  test('lower_better delta flags worsening with grade change', () => {
    const d = mas.delta(1, 4, { interpretation: {} });
    expect(d.direction).toBe('declining');
    expect(d.gradeChange).toBe('1_to_3');
  });
});

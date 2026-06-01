'use strict';

/**
 * scoring-mental-health-pain-W706.test.js — W706.
 *
 * Locks the four public-domain clinical measures added in W706:
 *   • PHQ-9  (depression screen, lower_better, critical suicidality item 9)
 *   • GAD-7  (anxiety screen, lower_better)
 *   • WHO-5  (well-being, higher_better, ×4 percentage transform)
 *   • FLACC  (observational pain for nonverbal beneficiaries, lower_better)
 *
 * Verifies: contract compliance, registry auto-discovery + item bank,
 * scoring math, severity bands, direction-aware delta, and that each is
 * digitizable by default (licensing record present, public/free).
 */

const registry = require('../measures/scoring');
const { validateContract } = require('../measures/scoring/contract');
const licensing = require('../measures/governance/licensing.registry');

const phq9 = require('../measures/scoring/phq9');
const gad7 = require('../measures/scoring/gad7');
const who5 = require('../measures/scoring/who5');
const flacc = require('../measures/scoring/flacc');

const fill = (n, v) => Array.from({ length: n }, () => v);

describe('W706 — contract + registry + licensing', () => {
  const modules = [
    ['PHQ-9', phq9, 'phq9.js', 9],
    ['GAD-7', gad7, 'gad7.js', 7],
    ['WHO-5', who5, 'who5.js', 5],
    ['FLACC', flacc, 'flacc.js', 5],
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

  test.each(modules)('%s is digitizable by default (public/free licensing)', code => {
    const rec = licensing.getLicensing(code);
    expect(rec).toBeTruthy();
    expect(licensing.evaluateDigitization(code).allowed).toBe(true);
    expect(() => licensing.assertDigitizable(code)).not.toThrow();
  });
});

describe('W706 — PHQ-9 depression', () => {
  test('sums 9 items and bands by severity', () => {
    expect(phq9.computeDerived(fill(9, 0)).value).toBe(0);
    expect(phq9.interpret(0).band).toBe('minimal');
    expect(phq9.interpret(7).band).toBe('mild');
    expect(phq9.interpret(12).band).toBe('moderate');
    expect(phq9.interpret(17).band).toBe('moderately_severe');
    expect(phq9.interpret(27).band).toBe('severe');
  });

  test('item 9 (suicidality) raises a critical flag regardless of total', () => {
    const raw = fill(9, 0);
    raw[8] = 1; // any non-zero on the critical item
    const d = phq9.computeDerived(raw);
    expect(d.value).toBe(1);
    expect(d.notes.criticalFlag).toBe(true);
    // a zero on item 9 does not flag
    expect(phq9.computeDerived(fill(9, 0)).notes.criticalFlag).toBe(false);
  });

  test('validateRaw rejects wrong length and out-of-range', () => {
    expect(phq9.validateRaw(fill(8, 0)).ok).toBe(false);
    expect(phq9.validateRaw(fill(9, 4)).ok).toBe(false);
    expect(phq9.validateRaw(fill(9, 2)).ok).toBe(true);
  });

  test('lower_better delta flags improvement + band change', () => {
    const d = phq9.delta(20, 3, { interpretation: {} });
    expect(d.direction).toBe('improving');
    expect(d.bandChange).toBe('severe_to_minimal');
  });
});

describe('W706 — GAD-7 anxiety', () => {
  test('sums 7 items and bands; ≥10 is clinically significant', () => {
    expect(gad7.computeDerived(fill(7, 0)).value).toBe(0);
    expect(gad7.interpret(4).band).toBe('minimal');
    expect(gad7.interpret(9).band).toBe('mild');
    expect(gad7.interpret(10).band).toBe('moderate');
    expect(gad7.interpret(21).band).toBe('severe');
    expect(gad7.computeDerived(fill(7, 2)).notes.clinicallySignificant).toBe(true);
  });

  test('lower_better delta', () => {
    const d = gad7.delta(15, 4, { interpretation: {} });
    expect(d.direction).toBe('improving');
  });
});

describe('W706 — WHO-5 well-being', () => {
  test('×4 percentage transform and higher_better bands', () => {
    expect(who5.computeDerived(fill(5, 5)).value).toBe(100);
    expect(who5.computeDerived(fill(5, 0)).value).toBe(0);
    expect(who5.computeDerived([3, 3, 3, 3, 3]).value).toBe(60);
    expect(who5.interpret(100).band).toBe('good');
    expect(who5.interpret(40).band).toBe('reduced');
    expect(who5.interpret(20).band).toBe('poor');
  });

  test('≤28 flags a positive depression screen', () => {
    expect(who5.computeDerived(fill(5, 1)).notes.screenPositive).toBe(true); // 20%
    expect(who5.computeDerived(fill(5, 4)).notes.screenPositive).toBe(false); // 80%
  });

  test('higher_better delta with ≥10-point meaningful change', () => {
    const d = who5.delta(20, 60, { interpretation: {} });
    expect(d.direction).toBe('improving');
    expect(d.meaningfulChange).toBe(true);
    expect(who5.delta(48, 52, { interpretation: {} }).meaningfulChange).toBe(false);
  });
});

describe('W706 — FLACC observational pain', () => {
  test('sums 5 categories, exposes subscales, bands by pain level', () => {
    const d = flacc.computeDerived([0, 0, 0, 0, 0]);
    expect(d.value).toBe(0);
    expect(d.subscales).toEqual({ face: 0, legs: 0, activity: 0, cry: 0, consolability: 0 });
    expect(flacc.interpret(0).band).toBe('comfortable');
    expect(flacc.interpret(2).band).toBe('mild');
    expect(flacc.interpret(5).band).toBe('moderate');
    expect(flacc.interpret(9).band).toBe('severe');
    expect(flacc.computeDerived([2, 2, 2, 2, 2]).value).toBe(10);
  });

  test('respondent is the clinician (observational)', () => {
    expect(flacc.itemBank.respondent).toBe('clinician');
  });

  test('lower_better delta flags worsening pain', () => {
    const d = flacc.delta(1, 8, { interpretation: {} });
    expect(d.direction).toBe('declining');
    expect(d.bandChange).toBe('mild_to_severe');
  });
});

'use strict';

/**
 * scoring-cognition-adl-wave710.test.js — W710
 *
 * Contract + behaviour coverage for five public-domain / free measures added
 * in W710, filling cognition, ADL, IADL, pain and stress gaps:
 *   • MINICOG — Mini-Cog cognitive screen (sum, higher_better, 2 sub-scores)
 *   • KATZ    — Katz basic ADL (sum, higher_better, 6 binary items)
 *   • LAWTON  — Lawton instrumental ADL (sum, higher_better, 8 binary items)
 *   • NRS     — Numeric pain rating (algorithm, lower_better, single 0–10 value)
 *   • PSS-10  — Perceived Stress Scale-10 (sum w/ reverse, lower_better, 10 items)
 *
 * Scoring modules are PURE (no mongoose) — no DB mocking required.
 */

const path = require('path');
const { validateContract } = require('../measures/scoring/contract');
const registry = require('../measures/scoring');
const governance = require('../measures/governance/licensing.registry');

const CODES = ['MINICOG', 'KATZ', 'LAWTON', 'NRS', 'PSS-10'];
const FILES = {
  MINICOG: 'minicog.js',
  KATZ: 'katz.js',
  LAWTON: 'lawton.js',
  NRS: 'nrs.js',
  'PSS-10': 'pss10.js',
};
const PUBLIC_DOMAIN = ['MINICOG', 'KATZ', 'LAWTON', 'NRS'];

describe('W710 contract compliance', () => {
  test.each(CODES)('%s satisfies the scoring contract', code => {
    const mod = require(path.join('..', 'measures', 'scoring', FILES[code]));
    expect(() => validateContract(mod, FILES[code])).not.toThrow();
  });
});

describe('W710 registry wiring', () => {
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

describe('W710 licensing governance', () => {
  test.each(CODES)('%s is licensed and digitizable', code => {
    const lic = governance.getLicensing(code);
    expect(lic).toBeTruthy();
    expect(governance.evaluateDigitization(code, {}).allowed).toBe(true);
  });

  test.each(PUBLIC_DOMAIN)('%s is public_domain', code => {
    expect(governance.getLicensing(code).licenseType).toBe('public_domain');
  });

  test('PSS-10 is free_with_attribution', () => {
    const lic = governance.getLicensing('PSS-10');
    expect(lic.licenseType).toBe('free_with_attribution');
    expect(lic.requiresAttribution).toBe(true);
  });
});

describe('MINICOG — Mini-Cog cognitive screen', () => {
  const m = registry.resolve('MINICOG');

  test('higher_better, 2 sub-scores, range 0–5, cutoff 3', () => {
    expect(m.direction).toBe('higher_better');
    expect(m.expectedItemCount).toBe(2);
    expect(m.scoreRange).toEqual({ min: 0, max: 5 });
    expect(m.cutoff).toBe(3);
  });

  test('computeDerived sums recall + clock and flags positive screen below cutoff', () => {
    expect(m.computeDerived([3, 2]).value).toBe(5);
    const d = m.computeDerived([1, 0]);
    expect(d.value).toBe(1);
    expect(d.notes.positiveScreen).toBe(true);
    expect(d.subscales).toEqual({ recall: 1, clock: 0 });
  });

  test('interpret: <3 positive (severe), 5 normal, 3–4 negative mild', () => {
    expect(m.interpret(2).band).toBe('positive_screen');
    expect(m.interpret(2).severity).toBe('severe');
    expect(m.interpret(5).severity).toBe('normal');
    expect(m.interpret(4).band).toBe('negative_screen');
    expect(m.interpret(4).severity).toBe('mild');
  });

  test('validateRaw rejects clock not in {0,2}, recall out of range, wrong length', () => {
    expect(m.validateRaw([3, 1]).ok).toBe(false);
    expect(m.validateRaw([4, 2]).ok).toBe(false);
    expect(m.validateRaw([3]).ok).toBe(false);
    expect(m.validateRaw([0, 0]).ok).toBe(true);
  });

  test('delta tracks screen crossing and returns null on missing values', () => {
    const d = m.delta(1, 4, m);
    expect(d.direction).toBe('improving');
    expect(d.screenChange).toBe('positive_to_negative');
    expect(m.delta(5, 5, m).screenChange).toBeNull();
    expect(m.delta(null, 4, m)).toBeNull();
  });
});

describe('KATZ — basic ADL', () => {
  const k = registry.resolve('KATZ');

  test('higher_better, 6 binary items, range 0–6', () => {
    expect(k.direction).toBe('higher_better');
    expect(k.expectedItemCount).toBe(6);
    expect(k.scoreRange).toEqual({ min: 0, max: 6 });
  });

  test('computeDerived sums independence and flags dependence below cutoff', () => {
    expect(k.computeDerived([1, 1, 1, 1, 1, 1]).value).toBe(6);
    const d = k.computeDerived([1, 0, 1, 0, 0, 0]);
    expect(d.value).toBe(2);
    expect(d.notes.dependent).toBe(true);
  });

  test('interpret bands across full → severe', () => {
    expect(k.interpret(6).band).toBe('full_independence');
    expect(k.interpret(5).band).toBe('mild_dependence');
    expect(k.interpret(3).band).toBe('moderate_dependence');
    expect(k.interpret(3).severity).toBe('severe');
    expect(k.interpret(1).band).toBe('severe_dependence');
    expect(k.interpret(1).severity).toBe('critical');
  });

  test('validateRaw rejects non-binary and wrong length', () => {
    expect(k.validateRaw([1, 1, 2, 0, 1, 1]).ok).toBe(false);
    expect(k.validateRaw([1, 1, 1]).ok).toBe(false);
    expect(k.validateRaw([0, 0, 0, 0, 0, 0]).ok).toBe(true);
  });

  test('delta tracks band change', () => {
    const d = k.delta(2, 6, k);
    expect(d.direction).toBe('improving');
    expect(d.dependenceBandChange).toBe('moderate_to_full');
    expect(k.delta(null, 6, k)).toBeNull();
  });
});

describe('LAWTON — instrumental ADL', () => {
  const l = registry.resolve('LAWTON');

  test('higher_better, 8 binary items, range 0–8', () => {
    expect(l.direction).toBe('higher_better');
    expect(l.expectedItemCount).toBe(8);
    expect(l.scoreRange).toEqual({ min: 0, max: 8 });
  });

  test('computeDerived sums and flags impairment below cutoff', () => {
    expect(l.computeDerived(Array(8).fill(1)).value).toBe(8);
    const d = l.computeDerived([1, 1, 0, 0, 0, 1, 0, 1]);
    expect(d.value).toBe(4);
    expect(d.notes.impaired).toBe(true);
  });

  test('interpret bands across full → severe', () => {
    expect(l.interpret(8).band).toBe('full_independence');
    expect(l.interpret(6).band).toBe('mild_impairment');
    expect(l.interpret(4).band).toBe('moderate_impairment');
    expect(l.interpret(4).severity).toBe('severe');
    expect(l.interpret(1).band).toBe('severe_impairment');
    expect(l.interpret(1).severity).toBe('critical');
  });

  test('validateRaw rejects non-binary and wrong length', () => {
    expect(l.validateRaw([1, 1, 1, 1, 1, 1, 1, 3]).ok).toBe(false);
    expect(l.validateRaw([1, 1]).ok).toBe(false);
    expect(l.validateRaw(Array(8).fill(0)).ok).toBe(true);
  });

  test('delta tracks band change', () => {
    const d = l.delta(8, 4, l);
    expect(d.direction).toBe('declining');
    expect(d.impairmentBandChange).toBe('full_to_moderate');
  });
});

describe('NRS — numeric pain rating', () => {
  const n = registry.resolve('NRS');

  test('lower_better, algorithm, single 0–10 value, cutoff 4', () => {
    expect(n.derivedType).toBe('algorithm');
    expect(n.direction).toBe('lower_better');
    expect(n.expectedItemCount).toBe(1);
    expect(n.scoreRange).toEqual({ min: 0, max: 10 });
    expect(n.cutoff).toBe(4);
  });

  test('computeDerived returns score and flags significant pain at cutoff', () => {
    expect(n.computeDerived([0]).value).toBe(0);
    expect(n.computeDerived([3]).notes.significantPain).toBe(false);
    expect(n.computeDerived([4]).notes.significantPain).toBe(true);
  });

  test('interpret bands no → mild → moderate → severe', () => {
    expect(n.interpret(0).band).toBe('no_pain');
    expect(n.interpret(2).band).toBe('mild_pain');
    expect(n.interpret(5).band).toBe('moderate_pain');
    expect(n.interpret(5).severity).toBe('severe');
    expect(n.interpret(9).band).toBe('severe_pain');
    expect(n.interpret(9).severity).toBe('critical');
  });

  test('validateRaw rejects out-of-range, non-integer, wrong length', () => {
    expect(n.validateRaw([11]).ok).toBe(false);
    expect(n.validateRaw([5.5]).ok).toBe(false);
    expect(n.validateRaw([5, 6]).ok).toBe(false);
    expect(n.validateRaw([0]).ok).toBe(true);
  });

  test('delta tracks significant-pain crossing (lower_better)', () => {
    const worse = n.delta(2, 7, n);
    expect(worse.direction).toBe('declining');
    expect(worse.significantPainCrossed).toBe(true);
    const better = n.delta(8, 2, n);
    expect(better.direction).toBe('improving');
    expect(better.significantPainCrossed).toBe(false);
    expect(n.delta(2, 3, n).significantPainCrossed).toBeNull();
  });
});

describe('PSS-10 — perceived stress', () => {
  const p = registry.resolve('PSS-10');

  test('lower_better, 10 items, range 0–40, cutoff 27', () => {
    expect(p.direction).toBe('lower_better');
    expect(p.expectedItemCount).toBe(10);
    expect(p.scoreRange).toEqual({ min: 0, max: 40 });
    expect(p.cutoff).toBe(27);
  });

  test('computeDerived reverse-scores items 4,5,7,8', () => {
    // all 0 → reverse items become 4 each → total 16
    expect(p.computeDerived(Array(10).fill(0)).value).toBe(16);
    // all 4 → reverse items become 0 each → total 24
    expect(p.computeDerived(Array(10).fill(4)).value).toBe(24);
    const d = p.computeDerived(Array(10).fill(4));
    expect(d.notes.method).toBe('sum_with_reverse');
    expect(d.notes.reverseItems).toEqual([4, 5, 7, 8]);
  });

  test('flags high stress at/above cutoff', () => {
    // worst stress: non-reverse=4, reverse=0 → 6*4 + 4*4(reversed→0) ... compute concrete
    const worst = [4, 4, 4, 0, 0, 4, 0, 0, 4, 4]; // reverse idx 3,4,6,7 already 0 → stay 4
    const d = p.computeDerived(worst);
    expect(d.value).toBe(40);
    expect(d.notes.highStress).toBe(true);
  });

  test('interpret bands low → moderate → high', () => {
    expect(p.interpret(10).band).toBe('low_stress');
    expect(p.interpret(10).severity).toBe('normal');
    expect(p.interpret(20).band).toBe('moderate_stress');
    expect(p.interpret(20).severity).toBe('severe');
    expect(p.interpret(30).band).toBe('high_stress');
    expect(p.interpret(30).severity).toBe('critical');
  });

  test('validateRaw rejects out-of-range, non-integer, wrong length', () => {
    expect(p.validateRaw(Array(10).fill(5)).ok).toBe(false);
    expect(p.validateRaw([0, 1, 2, 3, 4, 0, 1, 2, 3, 2.5]).ok).toBe(false);
    expect(p.validateRaw(Array(9).fill(0)).ok).toBe(false);
    expect(p.validateRaw(Array(10).fill(2)).ok).toBe(true);
  });

  test('delta tracks stress band change (lower_better)', () => {
    const d = p.delta(30, 10, p);
    expect(d.direction).toBe('improving');
    expect(d.stressBandChange).toBe('high_to_low');
    expect(p.delta(null, 10, p)).toBeNull();
  });
});

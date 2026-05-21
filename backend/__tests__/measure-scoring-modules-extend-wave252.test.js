'use strict';

/**
 * measure-scoring-modules-extend-wave252.test.js — Wave 252.
 *
 * Verifies the two new W212 scoring modules:
 *   - WeeFIM    (pediatric FIM, 18 items × 1-7, range 18-126,
 *                5 tiers tuned for developmental scoring)
 *   - Vineland-3 (Adaptive Behavior Composite from 3 domain
 *                standard scores; 5 tiers per publisher manual)
 *
 * Both modules registered via the W212 registry auto-discovery —
 * tests assert that, plus per-module scoring correctness.
 */

jest.setTimeout(15000);

const registry = require('../measures/scoring');

// ─── Registry discovery ──────────────────────────────────────────

describe('W252 — registry picks up new modules', () => {
  test('WeeFIM is registered', () => {
    expect(registry.has('WEEFIM')).toBe(true);
    const m = registry.resolve('WEEFIM');
    expect(m).toBeTruthy();
    expect(m.engineVersion).toBe('1.0.0');
    expect(m.derivedType).toBe('sum');
    expect(m.direction).toBe('higher_better');
  });

  test('Vineland-3 is registered', () => {
    expect(registry.has('VINELAND-3')).toBe(true);
    const m = registry.resolve('VINELAND-3');
    expect(m).toBeTruthy();
    expect(m.engineVersion).toBe('1.0.0');
    expect(m.derivedType).toBe('weighted_sum');
    expect(m.direction).toBe('higher_better');
  });

  test('list() now includes 5 modules (SCQ, BERG, FIM, WEEFIM, VINELAND-3)', () => {
    const codes = registry
      .list()
      .map(m => m.measureCode)
      .sort();
    expect(codes).toEqual(['BERG', 'FIM', 'SCQ', 'VINELAND-3', 'WEEFIM']);
  });
});

// ─── WeeFIM ──────────────────────────────────────────────────────

describe('W252 — WeeFIM module', () => {
  const wee = registry.resolve('WEEFIM');

  test('validateRaw rejects wrong length', () => {
    const v = wee.validateRaw([1, 2, 3]);
    expect(v.ok).toBe(false);
    expect(v.errors[0]).toMatch(/18 items/);
  });

  test('validateRaw rejects out-of-range item', () => {
    const items = Array(18).fill(4);
    items[5] = 9; // out of 1-7 range
    const v = wee.validateRaw(items);
    expect(v.ok).toBe(false);
  });

  test('validateRaw rejects non-integer', () => {
    const items = Array(18).fill(4);
    items[3] = 3.5;
    expect(wee.validateRaw(items).ok).toBe(false);
  });

  test('computeDerived: subscale decomposition is correct', () => {
    // All 4s → motor=52, cognitive=20, total=72
    const items = Array(18).fill(4);
    const r = wee.computeDerived(items);
    expect(r.value).toBe(72);
    expect(r.subscales.motor).toBe(13 * 4);
    expect(r.subscales.cognitive).toBe(5 * 4);
    expect(r.subscales.motorSelfCare).toBe(6 * 4);
    expect(r.subscales.cognitiveCommunication).toBe(2 * 4);
  });

  test.each([
    [126, 'L5', 'age_appropriate_independence'],
    [111, 'L5', 'age_appropriate_independence'], // boundary
    [110, 'L4', 'modified_independence'],
    [91, 'L4', 'modified_independence'], // boundary
    [90, 'L3', 'mild_dependency'],
    [61, 'L3', 'mild_dependency'], // boundary
    [60, 'L2', 'moderate_dependency'],
    [31, 'L2', 'moderate_dependency'], // boundary
    [30, 'L1', 'severe_dependency'],
    [18, 'L1', 'severe_dependency'],
  ])('interpret(%i) → %s (%s)', (value, tier, band) => {
    const r = wee.interpret(value);
    expect(r.tier).toBe(tier);
    expect(r.band).toBe(band);
  });

  test('interpret rejects out-of-range derivedValue', () => {
    expect(() => wee.interpret(17)).toThrow(/outside range/);
    expect(() => wee.interpret(127)).toThrow(/outside range/);
  });

  test('delta computed via standardDelta higher_better', () => {
    const measure = {
      interpretation: { mcid: { value: 5, status: 'established' } },
    };
    const d = wee.delta(60, 70, measure);
    expect(d.absolute).toBe(10);
    expect(d.direction).toBe('improving');
    expect(d.mcidMet).toBe(true);
  });
});

// ─── Vineland-3 ──────────────────────────────────────────────────

describe('W252 — Vineland-3 module', () => {
  const vine = registry.resolve('VINELAND-3');

  test('validateRaw rejects non-object input', () => {
    expect(vine.validateRaw(null).ok).toBe(false);
    expect(vine.validateRaw([100, 100, 100]).ok).toBe(false);
    expect(vine.validateRaw('string').ok).toBe(false);
  });

  test('validateRaw rejects missing domain', () => {
    const v = vine.validateRaw({ communication: 100, dailyLiving: 100 });
    expect(v.ok).toBe(false);
    expect(v.errors[0]).toMatch(/socialization/);
  });

  test('validateRaw rejects out-of-range domain score', () => {
    const v = vine.validateRaw({ communication: 200, dailyLiving: 100, socialization: 100 });
    expect(v.ok).toBe(false);
    expect(v.errors[0]).toMatch(/communication/);
  });

  test('validateRaw rejects non-integer domain score', () => {
    const v = vine.validateRaw({ communication: 99.5, dailyLiving: 100, socialization: 100 });
    expect(v.ok).toBe(false);
  });

  test('computeDerived: ABC = mean of 3 domain scores (rounded)', () => {
    const r = vine.computeDerived({ communication: 90, dailyLiving: 100, socialization: 110 });
    expect(r.value).toBe(100);
    expect(r.subscales).toEqual({ communication: 90, dailyLiving: 100, socialization: 110 });
    expect(r.notes.composite_method).toBe('mean_of_domain_standard_scores');
    expect(r.notes.norm_mean).toBe(100);
    expect(r.notes.norm_sd).toBe(15);
  });

  test('computeDerived: rounding follows standard banker rules', () => {
    // 100 + 100 + 101 = 301, /3 = 100.33... → 100
    expect(
      vine.computeDerived({ communication: 100, dailyLiving: 100, socialization: 101 }).value
    ).toBe(100);
    // 100 + 100 + 102 = 302, /3 = 100.67 → 101
    expect(
      vine.computeDerived({ communication: 100, dailyLiving: 100, socialization: 102 }).value
    ).toBe(101);
  });

  test.each([
    [140, 'L5', 'high'],
    [130, 'L5', 'high'], // boundary
    [129, 'L4', 'moderately_high'],
    [115, 'L4', 'moderately_high'], // boundary
    [114, 'L3', 'adequate'],
    [100, 'L3', 'adequate'],
    [86, 'L3', 'adequate'], // boundary
    [85, 'L2', 'moderately_low'],
    [71, 'L2', 'moderately_low'], // boundary
    [70, 'L1', 'low'],
    [40, 'L1', 'low'],
  ])('interpret(%i) → %s (%s)', (value, tier, band) => {
    const r = vine.interpret(value);
    expect(r.tier).toBe(tier);
    expect(r.band).toBe(band);
  });

  test('interpret rejects out-of-range derivedValue', () => {
    expect(() => vine.interpret(10)).toThrow(/outside range/);
    expect(() => vine.interpret(200)).toThrow(/outside range/);
  });

  test('delta computed via standardDelta higher_better, MCID 10', () => {
    const measure = {
      interpretation: { mcid: { value: 10, status: 'established' } },
    };
    const d = vine.delta(80, 95, measure);
    expect(d.absolute).toBe(15);
    expect(d.direction).toBe('improving');
    expect(d.mcidMet).toBe(true);
  });

  test('delta: 5-point change < MCID=10 → mcidMet false', () => {
    const measure = {
      interpretation: { mcid: { value: 10, status: 'established' } },
    };
    const d = vine.delta(80, 85, measure);
    expect(d.mcidMet).toBe(false);
    // Direction still 'improving' even when MCID not met.
    expect(d.direction).toBe('improving');
  });
});

'use strict';

/**
 * measures-psychometrics-wave717.test.js — W717.
 *
 * Numeric verification of the psychometric intelligence layer:
 *   • normative conversions (z, T, percentile, scaled, standard scores)
 *   • Reliable Change Index + Jacobson-Truax classification
 * Fixtures use hand-computed reference values so a regression in the math
 * fails loudly.
 */

jest.setTimeout(15000);

const psy = require('../measures/psychometrics');
const norms = require('../measures/psychometrics/norms');
const rc = require('../measures/psychometrics/reliable-change');

describe('W717 — normative conversions', () => {
  const norm = { mean: 50, sd: 10 };

  test('z-score is (raw - mean) / sd', () => {
    expect(norms.zScore(60, norm)).toBeCloseTo(1.0, 6);
    expect(norms.zScore(40, norm)).toBeCloseTo(-1.0, 6);
    expect(norms.zScore(50, norm)).toBeCloseTo(0.0, 6);
  });

  test('invalid inputs return null (no norms invented)', () => {
    expect(norms.zScore(60, null)).toBeNull();
    expect(norms.zScore(60, { mean: 50, sd: 0 })).toBeNull();
    expect(norms.zScore('x', norm)).toBeNull();
    expect(norms.tScore(60, { mean: 50 })).toBeNull();
  });

  test('T-score: z=1 → 60, z=-1 → 40', () => {
    expect(norms.tScore(60, norm)).toBe(60);
    expect(norms.tScore(40, norm)).toBe(40);
    expect(norms.tScore(50, norm)).toBe(50);
  });

  test('standard score: z=1 → 115, scaled score: z=1 → 13', () => {
    expect(norms.standardScore(60, norm)).toBe(115);
    expect(norms.scaledScore(60, norm)).toBe(13);
  });

  test('scaled score clamps to 1..19', () => {
    expect(norms.scaledScore(200, norm)).toBe(19);
    expect(norms.scaledScore(-200, norm)).toBe(1);
  });

  test('normalCdf anchors: 0→0.5, +1.96→~0.975', () => {
    expect(norms.normalCdf(0)).toBeCloseTo(0.5, 3);
    expect(norms.normalCdf(1.96)).toBeCloseTo(0.975, 2);
    expect(norms.normalCdf(-1.96)).toBeCloseTo(0.025, 2);
  });

  test('percentile honors direction (lower_better inverts)', () => {
    // raw at mean → ~50th percentile either direction
    expect(norms.percentile(50, norm, 'higher_better')).toBeCloseTo(50, 0);
    // higher raw with higher_better → high percentile
    expect(norms.percentile(70, norm, 'higher_better')).toBeGreaterThan(90);
    // same raw with lower_better → low percentile (worse)
    expect(norms.percentile(70, norm, 'lower_better')).toBeLessThan(10);
  });

  test('percentile clamps to 0.1..99.9', () => {
    expect(norms.percentile(1000, norm)).toBeLessThanOrEqual(99.9);
    expect(norms.percentile(-1000, norm)).toBeGreaterThanOrEqual(0.1);
  });

  test('normativeBand maps z bands and respects direction', () => {
    expect(norms.normativeBand(2, 'higher_better')).toBe('well_above_average');
    expect(norms.normativeBand(0, 'higher_better')).toBe('average');
    expect(norms.normativeBand(-2, 'higher_better')).toBe('well_below_average');
    // lower_better: a high raw z is bad
    expect(norms.normativeBand(2, 'lower_better')).toBe('well_below_average');
  });

  test('profile composes all metrics in one call', () => {
    const p = norms.profile(70, norm, 'higher_better');
    expect(p.z).toBeCloseTo(2.0, 2);
    expect(p.t).toBe(70);
    expect(p.standardScore).toBe(130);
    expect(p.band).toBe('well_above_average');
    expect(p.percentile).toBeGreaterThan(97);
  });
});

describe('W717 — Reliable Change Index', () => {
  const psyParams = { sdBaseline: 10, reliability: 0.84 };
  // Sdiff = 10 * sqrt(2*(1-0.84)) = 10 * sqrt(0.32) = 5.657

  test('sdiff formula', () => {
    expect(rc.sdiff(10, 0.84)).toBeCloseTo(5.6569, 3);
  });

  test('sdiff guards invalid reliability', () => {
    expect(rc.sdiff(10, 1)).toBeNull();
    expect(rc.sdiff(10, -0.1)).toBeNull();
    expect(rc.sdiff(0, 0.8)).toBeNull();
  });

  test('RCI value + reliability threshold (1.96)', () => {
    // change of +15 → RCI = 15/5.657 = 2.65 → reliable
    const r = rc.rci(50, 65, psyParams);
    expect(r.rci).toBeCloseTo(2.65, 1);
    expect(r.reliable).toBe(true);
    // change of +5 → RCI = 0.88 → not reliable
    const r2 = rc.rci(50, 55, psyParams);
    expect(r2.reliable).toBe(false);
  });

  test('classify: improved (reliable, did not cross cutoff)', () => {
    const c = rc.classify(50, 65, { ...psyParams, direction: 'higher_better', clinicalCutoff: 80 });
    expect(c.reliable).toBe(true);
    expect(c.improvedDirection).toBe(true);
    expect(c.crossedCutoff).toBe(false);
    expect(c.outcome).toBe(rc.OUTCOMES.IMPROVED);
  });

  test('classify: recovered (reliable + crossed cutoff)', () => {
    const c = rc.classify(50, 85, { ...psyParams, direction: 'higher_better', clinicalCutoff: 80 });
    expect(c.crossedCutoff).toBe(true);
    expect(c.outcome).toBe(rc.OUTCOMES.RECOVERED);
  });

  test('classify: unchanged (within error)', () => {
    const c = rc.classify(50, 53, psyParams);
    expect(c.reliable).toBe(false);
    expect(c.outcome).toBe(rc.OUTCOMES.UNCHANGED);
  });

  test('classify: deteriorated (reliable, wrong direction)', () => {
    const c = rc.classify(65, 50, { ...psyParams, direction: 'higher_better' });
    expect(c.reliable).toBe(true);
    expect(c.improvedDirection).toBe(false);
    expect(c.outcome).toBe(rc.OUTCOMES.DETERIORATED);
  });

  test('classify respects lower_better direction (symptom severity)', () => {
    // severity dropping 60→40 is improvement for lower_better
    const c = rc.classify(60, 40, { sdBaseline: 8, reliability: 0.85, direction: 'lower_better' });
    expect(c.improvedDirection).toBe(true);
    expect(c.outcome).not.toBe(rc.OUTCOMES.DETERIORATED);
  });

  test('barrel exposes the same functions', () => {
    expect(typeof psy.classifyChange).toBe('function');
    expect(typeof psy.normProfile).toBe('function');
    expect(psy.RCI_CRITICAL_95).toBe(1.96);
  });
});

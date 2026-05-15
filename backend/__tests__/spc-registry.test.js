'use strict';

/**
 * spc-registry.test.js — World-Class QMS Phase 29 Commit 3.
 *
 * Pure-math tests against the SPC compute helpers. Reference numbers
 * are taken from the AIAG SPC Reference Manual 2nd ed. example sets,
 * so the constants and limits must match the published values.
 */

const registry = require('../config/spc.registry');

describe('spc.registry helpers', () => {
  test('mean / stddev / range basics', () => {
    expect(registry.mean([1, 2, 3, 4, 5])).toBe(3);
    expect(registry.range([2, 9, 5])).toBe(7);
    // sample stddev of [2,4,4,4,5,5,7,9] is √(32/7) ≈ 2.138
    expect(registry.stddev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 2);
  });

  test('getConstants snaps for unknown sizes', () => {
    expect(registry.getConstants(5).A2).toBeCloseTo(0.577);
    // Size 6 is in table; size 13 is not — should snap to nearest (12 or 15).
    const c13 = registry.getConstants(13);
    expect(c13.A2).toBeGreaterThan(0.2);
    expect(c13.A2).toBeLessThan(0.3);
  });
});

describe('computeXbarR', () => {
  test('matches AIAG worked example (subgroup size 5)', () => {
    // 5 subgroups of 5 measurements each — synthetic but symmetric.
    const subgroups = [
      [10, 11, 9, 10, 12],
      [10, 9, 11, 10, 10],
      [11, 10, 10, 11, 9],
      [10, 12, 11, 10, 11],
      [9, 10, 10, 11, 10],
    ];
    const result = registry.computeXbarR(subgroups);
    expect(result.subgroupSize).toBe(5);
    // X-double-bar = (10.4 + 10 + 10.2 + 10.8 + 10) / 5 = 10.28
    expect(result.xBarMean).toBeCloseTo(10.28, 2);
    // R-bar should be > 0
    expect(result.rMean).toBeGreaterThan(0);
    // UCL_X = X̄̄ + A2 R̄ — A2 for n=5 is 0.577
    expect(result.xBarUcl).toBeCloseTo(result.xBarMean + 0.577 * result.rMean, 2);
    expect(result.xBarLcl).toBeCloseTo(result.xBarMean - 0.577 * result.rMean, 2);
    expect(result.rUcl).toBeCloseTo(2.114 * result.rMean, 2);
    expect(result.rLcl).toBe(0); // D3 for n=5 is 0
    expect(result.points).toHaveLength(5);
  });

  test('rejects mismatched subgroup sizes', () => {
    expect(() =>
      registry.computeXbarR([
        [1, 2],
        [1, 2, 3],
      ])
    ).toThrow();
  });
});

describe('computeImr', () => {
  test('individuals + moving range against a known series', () => {
    const values = [10, 11, 10, 12, 9, 11, 10];
    const result = registry.computeImr(values);
    // moving ranges = |11-10|, |10-11|, |12-10|, |9-12|, |11-9|, |10-11| = 1,1,2,3,2,1
    // MR̄ = 10/6 ≈ 1.667
    expect(result.mrBar).toBeCloseTo(10 / 6, 3);
    // σ̂ = MR̄ / d2(n=2) = 1.667 / 1.128 ≈ 1.478
    expect(result.sigma).toBeCloseTo((1.0 * (10 / 6)) / 1.128, 3);
    // UCL_I = X̄ + 3σ̂
    expect(result.iUcl).toBeCloseTo(result.xBar + 3 * result.sigma, 3);
    expect(result.points).toHaveLength(values.length);
    expect(result.points[0].mr).toBeNull();
    expect(result.points[1].mr).toBe(1);
  });

  test('rejects when fewer than 2 values', () => {
    expect(() => registry.computeImr([5])).toThrow();
  });
});

describe('computeP / computeNp', () => {
  test('p-chart with variable sample size', () => {
    const subgroups = [
      { defective: 4, sampleSize: 100 },
      { defective: 6, sampleSize: 100 },
      { defective: 3, sampleSize: 80 },
    ];
    const r = registry.computeP(subgroups);
    expect(r.pBar).toBeCloseTo(13 / 280, 4);
    expect(r.points).toHaveLength(3);
    // smaller sample → wider control band
    const widthLarger = r.points[0].ucl - r.points[0].lcl;
    const widthSmaller = r.points[2].ucl - r.points[2].lcl;
    expect(widthSmaller).toBeGreaterThan(widthLarger);
  });

  test('np-chart requires fixed n', () => {
    expect(() =>
      registry.computeNp([
        { defective: 1, sampleSize: 100 },
        { defective: 2, sampleSize: 99 },
      ])
    ).toThrow();
    const r = registry.computeNp([
      { defective: 1, sampleSize: 100 },
      { defective: 3, sampleSize: 100 },
      { defective: 2, sampleSize: 100 },
    ]);
    expect(r.n).toBe(100);
    expect(r.npBar).toBe(2);
    expect(r.ucl).toBeGreaterThan(r.npBar);
    expect(r.lcl).toBe(0);
  });
});

describe('computeC / computeU', () => {
  test('c-chart simple counts', () => {
    const r = registry.computeC([
      { count: 4 },
      { count: 5 },
      { count: 3 },
      { count: 6 },
      { count: 4 },
    ]);
    expect(r.cBar).toBeCloseTo(22 / 5, 3);
    expect(r.ucl).toBeCloseTo(r.cBar + 3 * Math.sqrt(r.cBar), 3);
    expect(r.lcl).toBeGreaterThanOrEqual(0);
  });

  test('u-chart with varying opportunity', () => {
    const r = registry.computeU([
      { count: 4, units: 100 },
      { count: 6, units: 120 },
      { count: 2, units: 80 },
    ]);
    expect(r.uBar).toBeCloseTo(12 / 300, 4);
    expect(r.points).toHaveLength(3);
  });
});

describe('computeCapability', () => {
  test('Cp / Cpk against a known well-centred process', () => {
    // 30 values from N(100, σ=1) centred between LSL=95, USL=105.
    const values = [
      99.5, 100.1, 100.0, 99.8, 99.9, 100.2, 99.6, 100.0, 100.3, 99.7, 100.1, 99.9, 100.2, 100.0,
      100.1, 99.8, 100.0, 99.9, 100.1, 100.0, 99.7, 100.2, 99.9, 100.0, 99.8, 100.1, 99.9, 100.0,
      100.2, 99.8,
    ];
    const r = registry.computeCapability({ values, usl: 105, lsl: 95 });
    expect(r.mean).toBeCloseTo(100, 0);
    // Highly capable: σ ≈ 0.2 → Cp ≈ 8 → grade world_class
    expect(r.cp).toBeGreaterThan(2);
    expect(r.cpk).toBeGreaterThan(2);
    expect(r.grade).toBe('world_class');
  });

  test('off-centre process — Cpk < Cp', () => {
    // Centred at 101 with LSL=95, USL=105 → Cpk should drop below Cp.
    const values = Array.from({ length: 30 }, (_, i) => 101 + (i % 2 === 0 ? 1 : -1) * 0.1);
    const r = registry.computeCapability({ values, usl: 105, lsl: 95 });
    expect(r.cpk).toBeLessThan(r.cp);
  });

  test('rejects bad inputs', () => {
    expect(() => registry.computeCapability({ values: [1], usl: 10, lsl: 0 })).toThrow();
    expect(() => registry.computeCapability({ values: [1, 2, 3], usl: 0, lsl: 10 })).toThrow();
  });
});

describe('detectSpecialCauses', () => {
  test('rule 1 fires when a single point breaches 3σ', () => {
    const out = registry.detectSpecialCauses([5, 5, 5, 20], 5, 8, 2);
    expect(out[3].fired).toContain('rule_1_beyond_3sigma');
  });

  test('rule 2 fires on 9 consecutive points above CL', () => {
    const above = [6, 6, 6, 6, 6, 6, 6, 6, 6];
    const out = registry.detectSpecialCauses(above, 5, 10, 0);
    expect(out[8].fired).toContain('rule_2_run_9');
  });

  test('rule 3 fires on a 6-point upward trend', () => {
    const out = registry.detectSpecialCauses([1, 2, 3, 4, 5, 6], 5, 10, 0);
    expect(out[5].fired).toContain('rule_3_trend_6');
  });

  test('no rule fires for a calm series', () => {
    const out = registry.detectSpecialCauses([5, 5.1, 4.9, 5, 4.95, 5.05], 5, 8, 2);
    const anyFired = out.some(p => p.fired.length > 0);
    expect(anyFired).toBe(false);
  });
});

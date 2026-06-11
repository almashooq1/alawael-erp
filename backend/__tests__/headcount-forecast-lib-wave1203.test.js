/**
 * W1203 — pure unit tests for intelligence/headcount-forecast.lib.
 */

'use strict';

const L = require('../intelligence/headcount-forecast.lib');

describe('W1203 headcount-forecast.lib — forecast', () => {
  test('compound survivors + hiring need to reach a growth target', () => {
    const f = L.forecastHeadcount({ current: 100, target: 120, attritionRatePct: 10, periods: 3 });
    expect(f.survivors).toBe(73); // 100 × 0.9^3 = 72.9
    expect(f.attritionLosses).toBe(27);
    expect(f.growthHires).toBe(20); // 120 − 100
    expect(f.replacementHires).toBe(27);
    expect(f.totalHiringNeed).toBe(47);
    expect(f.gapToTargetNoAction).toBe(47); // 120 − 73
    expect(f.trajectory.map(t => t.headcount)).toEqual([100, 90, 81, 73]);
    expect(f.annualHiringPace).toBe(16); // 47/3
  });

  test('no attrition + no growth → zero hiring need', () => {
    const f = L.forecastHeadcount({ current: 50, attritionRatePct: 0, periods: 2 });
    expect(f.survivors).toBe(50);
    expect(f.target).toBe(50); // defaults to current
    expect(f.totalHiringNeed).toBe(0);
  });

  test('shrinking target → growthHires 0 (never negative)', () => {
    const f = L.forecastHeadcount({ current: 100, target: 80, attritionRatePct: 20, periods: 1 });
    expect(f.growthHires).toBe(0); // target < current
    expect(f.survivors).toBe(80); // 100 × 0.8
  });

  test('clamps out-of-range inputs', () => {
    const f = L.forecastHeadcount({ current: -5, target: 10, attritionRatePct: 150, periods: 99 });
    expect(f.current).toBe(0);
    expect(f.attritionRatePct).toBe(100);
    expect(f.periods).toBe(10);
    expect(L.clampPct(-3)).toBe(0);
    expect(L.clampInt(0, 1, 10)).toBe(1);
  });
});

describe('W1203 headcount-forecast.lib — rollup', () => {
  test('sums hiring need across units', () => {
    const a = L.forecastHeadcount({ current: 100, target: 120, attritionRatePct: 10, periods: 3 });
    const b = L.forecastHeadcount({ current: 40, target: 50, attritionRatePct: 5, periods: 3 });
    const r = L.rollupPlans([a, b]);
    expect(r.units).toBe(2);
    expect(r.current).toBe(140);
    expect(r.totalHiringNeed).toBe(a.totalHiringNeed + b.totalHiringNeed);
  });
});

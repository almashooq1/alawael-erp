'use strict';

/**
 * W1385 — compa-ratio.lib unit tests (pure, no DB).
 * Locks the math + the never-misleading contract (null when unmapped/no-mid).
 */

const L = require('../intelligence/compa-ratio.lib');

describe('W1385 compa-ratio.lib — compaRatio()', () => {
  test('salary / midpoint, rounded to 3dp', () => {
    expect(L.compaRatio(8000, 10000)).toBe(0.8);
    expect(L.compaRatio(10000, 10000)).toBe(1);
    expect(L.compaRatio(12500, 10000)).toBe(1.25);
    expect(L.compaRatio(9999, 10000)).toBe(1); // 0.9999 rounds to 1.000 at 3dp
    expect(L.compaRatio(8500, 10000)).toBe(0.85);
  });

  test('null (NOT 0, NOT guessed) when either input is unusable', () => {
    expect(L.compaRatio(8000, 0)).toBeNull(); // no midpoint
    expect(L.compaRatio(8000, undefined)).toBeNull();
    expect(L.compaRatio(8000, null)).toBeNull();
    expect(L.compaRatio(0, 10000)).toBeNull(); // no salary
    expect(L.compaRatio(null, 10000)).toBeNull();
    expect(L.compaRatio(-5, 10000)).toBeNull();
    expect(L.compaRatio('abc', 10000)).toBeNull();
  });
});

describe('W1385 compa-ratio.lib — classifyCompaRatio()', () => {
  test('below (<0.8) / within / above (>1.2), boundaries inclusive of within', () => {
    expect(L.classifyCompaRatio(0.79).key).toBe('below');
    expect(L.classifyCompaRatio(0.8).key).toBe('within'); // exactly at threshold = within
    expect(L.classifyCompaRatio(1.0).key).toBe('within');
    expect(L.classifyCompaRatio(1.2).key).toBe('within'); // exactly at threshold = within
    expect(L.classifyCompaRatio(1.21).key).toBe('above');
  });
  test('custom thresholds honoured', () => {
    expect(L.classifyCompaRatio(0.85, { belowThreshold: 0.9 }).key).toBe('below');
    expect(L.classifyCompaRatio(1.05, { aboveThreshold: 1.0 }).key).toBe('above');
  });
  test('non-finite → null', () => {
    expect(L.classifyCompaRatio(null)).toBeNull();
    expect(L.classifyCompaRatio(undefined)).toBeNull();
  });
  test('every band carries an Arabic label', () => {
    for (const k of ['below', 'within', 'above']) {
      expect(typeof L.BANDS[k].ar).toBe('string');
      expect(L.BANDS[k].ar.length).toBeGreaterThan(0);
    }
  });
});

describe('W1385 compa-ratio.lib — median()', () => {
  test('odd / even / empty', () => {
    expect(L.median([1, 3, 2])).toBe(2);
    expect(L.median([1, 2, 3, 4])).toBe(2.5);
    expect(L.median([])).toBeNull();
    expect(L.median([5])).toBe(5);
  });
  test('ignores non-finite values', () => {
    expect(L.median([1, null, 3, undefined, 2])).toBe(2);
  });
});

describe('W1385 compa-ratio.lib — compaRatioStats()', () => {
  test('counts below/within/above + median, excluding null compa-ratios', () => {
    const s = L.compaRatioStats([
      { compaRatio: 0.7 }, // below
      { compaRatio: 0.75 }, // below
      { compaRatio: 1.0 }, // within
      { compaRatio: 1.3 }, // above
      { compaRatio: null }, // EXCLUDED (unmapped)
      {}, // EXCLUDED
    ]);
    expect(s.rated).toBe(4);
    expect(s.belowCount).toBe(2);
    expect(s.withinCount).toBe(1);
    expect(s.aboveCount).toBe(1);
    expect(s.belowPct).toBe(50);
    expect(s.medianCompaRatio).toBe(0.875); // median of [0.7,0.75,1.0,1.3]
  });
  test('empty / all-null → zeroed, no divide-by-zero', () => {
    const s = L.compaRatioStats([{ compaRatio: null }, {}]);
    expect(s.rated).toBe(0);
    expect(s.belowPct).toBe(0);
    expect(s.medianCompaRatio).toBeNull();
  });
});

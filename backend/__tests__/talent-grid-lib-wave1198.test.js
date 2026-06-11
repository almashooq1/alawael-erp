/**
 * W1198 — pure unit tests for intelligence/talent-grid.lib (9-box logic).
 */

'use strict';

const L = require('../intelligence/talent-grid.lib');

describe('W1198 talent-grid.lib — performance band derivation', () => {
  test('Arabic rating → band', () => {
    expect(L.performanceBand({ overallRating: 'ممتاز' })).toBe(3);
    expect(L.performanceBand({ overallRating: 'جيد جداً' })).toBe(3);
    expect(L.performanceBand({ overallRating: 'جيد' })).toBe(2);
    expect(L.performanceBand({ overallRating: 'مقبول' })).toBe(1);
    expect(L.performanceBand({ overallRating: 'ضعيف' })).toBe(1);
  });
  test('falls back to 1-5 score when no rating', () => {
    expect(L.performanceBand({ overallScore: 4.5 })).toBe(3);
    expect(L.performanceBand({ overallScore: 3 })).toBe(2);
    expect(L.performanceBand({ overallScore: 1.5 })).toBe(1);
  });
  test('null when nothing derivable', () => {
    expect(L.performanceBand({})).toBeNull();
    expect(L.performanceBand({ overallScore: 0 })).toBeNull();
  });
});

describe('W1198 talent-grid.lib — box mapping (all 9 corners)', () => {
  test('box numbering: perf row × potential column', () => {
    expect(L.boxOf(1, 1)).toBe(1); // low/low
    expect(L.boxOf(1, 3)).toBe(3); // low perf / high potential = Enigma
    expect(L.boxOf(3, 1)).toBe(7); // high perf / low potential = High Professional
    expect(L.boxOf(3, 3)).toBe(9); // star
    expect(L.boxOf(2, 2)).toBe(5); // core
  });
  test('clamps out-of-range bands', () => {
    expect(L.boxOf(5, 5)).toBe(9);
    expect(L.boxOf(0, 0)).toBe(1);
    expect(L.clampBand(2.6)).toBe(3);
  });
  test('segment + action group per box', () => {
    expect(L.segmentOf(9).key).toBe('star');
    expect(L.segmentOf(1).key).toBe('underperformer');
    expect(L.segmentOf(3).en).toMatch(/Enigma/);
    expect(L.actionGroupOf(9)).toBe('develop_retain');
    expect(L.actionGroupOf(1)).toBe('manage_out');
  });
  test('hiPo vs risk box sets are disjoint', () => {
    expect(L.HIPO_BOXES).toEqual([6, 8, 9]);
    expect(L.RISK_BOXES).toEqual([1, 2, 4]);
    expect(L.HIPO_BOXES.some(b => L.RISK_BOXES.includes(b))).toBe(false);
    expect(L.isHiPo(9)).toBe(true);
    expect(L.isRisk(1)).toBe(true);
    expect(L.isHiPo(5)).toBe(false);
  });
});

describe('W1198 talent-grid.lib — grid aggregation', () => {
  test('distribution + hiPo/risk rates, ignores invalid boxes', () => {
    const g = L.buildGrid([
      { box: 9 },
      { box: 9 },
      { box: 8 }, // 3 hiPo
      { box: 5 },
      { box: 7 },
      { box: 1 },
      { box: 2 }, // 2 risk (+ box 4 none)
      { box: 0 },
      { box: 99 },
      { box: null }, // invalid → ignored
    ]);
    expect(g.total).toBe(7);
    expect(g.counts[9]).toBe(2);
    expect(g.hiPo.count).toBe(3);
    expect(g.hiPo.ratePct).toBeCloseTo((3 / 7) * 100, 1);
    expect(g.risk.count).toBe(2);
    expect(g.segments.star).toBe(2);
  });
  test('empty input → zeroed grid', () => {
    const g = L.buildGrid([]);
    expect(g.total).toBe(0);
    expect(g.hiPo).toEqual({ count: 0, ratePct: 0 });
    expect(Object.values(g.counts).every(c => c === 0)).toBe(true);
  });
});

/**
 * W1199 — pure unit tests for intelligence/diversity.lib.
 */

'use strict';

const L = require('../intelligence/diversity.lib');

const r = (gender, nationality, salary, department = 'PT') => ({ gender, nationality, salary, department });

describe('W1199 diversity.lib — representation + indices', () => {
  test('representation counts + percentages', () => {
    const rep = L.representation([r('male', 'SA', 1), r('male', 'SA', 1), r('female', 'SA', 1)], x => x.gender);
    expect(rep.total).toBe(3);
    expect(rep.counts).toEqual({ male: 2, female: 1 });
    expect(rep.pct.male).toBeCloseTo(66.7, 1);
  });

  test('Blau index: 0 homogeneous, 0.5 for an even 2-group split', () => {
    expect(L.blauIndex({ a: 10 })).toBe(0);
    expect(L.blauIndex({ a: 5, b: 5 })).toBe(0.5);
    expect(L.blauIndex({})).toBeNull();
  });

  test('Shannon (normalised): 1 for even, 0 for single group', () => {
    expect(L.shannonIndex({ a: 3, b: 3, c: 3 })).toBe(1);
    expect(L.shannonIndex({ a: 5 })).toBe(0);
  });

  test('Saudization rate (case-insensitive SA/saudi/ksa)', () => {
    expect(L.saudizationRate([r('male', 'SA', 1), r('male', 'saudi', 1), r('female', 'EG', 1), r('female', 'PH', 1)])).toBe(50);
    expect(L.saudizationRate([])).toBeNull();
  });
});

describe('W1199 diversity.lib — glass-ceiling (representation by tier)', () => {
  test('detects under-representation of a group at the top salary tier', () => {
    const rows = [];
    // bottom tier all female, top tier all male → women -100 delta
    for (let i = 0; i < 6; i++) rows.push(r('female', 'SA', 5000 + i));
    for (let i = 0; i < 6; i++) rows.push(r('male', 'SA', 9000 + i));
    const t = L.representationByTier(rows, x => x.gender, 3);
    expect(t.reportable).toBe(true);
    expect(t.tiers).toHaveLength(3);
    expect(t.topVsBottomDelta.female).toBeLessThan(0);
    expect(t.topVsBottomDelta.male).toBeGreaterThan(0);
  });

  test('insufficient salaried headcount → non-reportable (privacy)', () => {
    const t = L.representationByTier([r('male', 'SA', 1), r('female', 'SA', 2)], x => x.gender, 3);
    expect(t.reportable).toBe(false);
    expect(t.tiers).toEqual([]);
  });
});

describe('W1199 diversity.lib — full analysis', () => {
  test('assembles composition + indices + saudization + seniority lens', () => {
    const rows = [];
    for (let i = 0; i < 5; i++) rows.push(r('male', 'SA', 10000 + i, 'PT'));
    for (let i = 0; i < 5; i++) rows.push(r('female', 'EG', 6000 + i, 'OT'));
    const a = L.analyzeDiversity(rows, { tiers: 2 });
    expect(a.headcount).toBe(10);
    expect(a.reportable).toBe(true);
    expect(a.saudizationRatePct).toBe(50);
    expect(a.diversityIndex.genderBlau).toBe(0.5);
    expect(a.gender.pct.male).toBe(50);
    expect(a.seniorityLens.gender.reportable).toBe(true);
  });

  test('empty workforce → non-reportable, no throw', () => {
    const a = L.analyzeDiversity([]);
    expect(a.headcount).toBe(0);
    expect(a.reportable).toBe(false);
    expect(a.saudizationRatePct).toBeNull();
  });
});

/**
 * W1207 — pure unit tests for intelligence/succession-readiness.lib.
 */

'use strict';

const L = require('../intelligence/succession-readiness.lib');

describe('W1207 succession-readiness.lib — components', () => {
  test('talentScore is potential-weighted (band 1→0, band 3→100)', () => {
    expect(L.talentScore({ performanceBand: 3, potentialBand: 3 })).toBe(100);
    expect(L.talentScore({ performanceBand: 1, potentialBand: 1 })).toBe(0);
    // high performer / low potential < low performer / high potential (potential weighted higher)
    expect(L.talentScore({ performanceBand: 3, potentialBand: 1 })).toBe(40);
    expect(L.talentScore({ performanceBand: 1, potentialBand: 3 })).toBe(60);
  });
  test('tenureScore ramps linearly to full at 3 years', () => {
    expect(L.tenureScore(0)).toBe(0);
    expect(L.tenureScore(1.5)).toBe(50);
    expect(L.tenureScore(3)).toBe(100);
    expect(L.tenureScore(10)).toBe(100); // capped
  });
  test('levelOf bands', () => {
    expect(L.levelOf(85).key).toBe('ready_now');
    expect(L.levelOf(65).key).toBe('ready_1_2y');
    expect(L.levelOf(45).key).toBe('ready_3y_plus');
    expect(L.levelOf(20).key).toBe('not_ready');
  });
});

describe('W1207 succession-readiness.lib — composite readiness', () => {
  test('a star + high competency + tenured → ready_now', () => {
    const r = L.readiness({ talentBands: { performanceBand: 3, potentialBand: 3 }, targetCompetencyReadinessPct: 90, tenureYears: 4 });
    expect(r.score).toBe(96); // 100*.4 + 90*.4 + 100*.2
    expect(r.level.key).toBe('ready_now');
    expect(r.coverage.hasTalentReview).toBe(true);
    expect(r.coverage.hasRoleBaseline).toBe(true);
  });

  test('low across the board → not_ready', () => {
    const r = L.readiness({ talentBands: { performanceBand: 1, potentialBand: 1 }, targetCompetencyReadinessPct: 30, tenureYears: 1 });
    expect(r.level.key).toBe('not_ready');
  });

  test('a MISSING component re-weights over the rest (does not zero the score)', () => {
    // no role baseline (competency null) → weight redistributes to talent + tenure
    const r = L.readiness({ talentBands: { performanceBand: 2, potentialBand: 3 }, targetCompetencyReadinessPct: null, tenureYears: 3 });
    expect(r.components.competency).toBeNull();
    expect(r.coverage.hasRoleBaseline).toBe(false);
    // (talent 80 *.4 + tenure 100 *.2) / (.4+.2) = 86.7
    expect(r.score).toBeCloseTo(86.7, 0);
  });

  test('no talent review AND no baseline → tenure-only', () => {
    const r = L.readiness({ talentBands: null, targetCompetencyReadinessPct: null, tenureYears: 3 });
    expect(r.score).toBe(100); // only tenure component, full
    expect(r.coverage.hasTalentReview).toBe(false);
  });

  test('clamps competency input to [0,100]', () => {
    const r = L.readiness({ talentBands: { performanceBand: 1, potentialBand: 1 }, targetCompetencyReadinessPct: 150, tenureYears: 0 });
    expect(r.components.competency).toBe(100);
  });
});

describe('W1207 succession-readiness.lib — ranking', () => {
  test('rankCandidates sorts by score descending', () => {
    const ranked = L.rankCandidates([
      { employeeId: 'a', readiness: { score: 40 } },
      { employeeId: 'b', readiness: { score: 85 } },
      { employeeId: 'c', readiness: { score: 60 } },
    ]);
    expect(ranked.map(r => r.employeeId)).toEqual(['b', 'c', 'a']);
  });
});

'use strict';

/**
 * W481 drift guard — pride-moment-extractor.lib.js (Phase F).
 *
 * Pure-function tests + source-shape assertions. No mongoose required.
 */

const path = require('path');
const fs = require('fs');

const LIB_PATH = path.join(__dirname, '..', 'intelligence', 'pride-moment-extractor.lib.js');
const SRC = fs.readFileSync(LIB_PATH, 'utf8');
const lib = require(LIB_PATH);

describe('W481 — pride-moment-extractor.lib structural', () => {
  it('exports the 3 public functions + 2 constants', () => {
    expect(typeof lib.extractPrideMoments).toBe('function');
    expect(typeof lib.rankByImpact).toBe('function');
    expect(typeof lib.filterByDateRange).toBe('function');
    expect(Array.isArray(lib.PRIDE_KINDS)).toBe(true);
    expect(Array.isArray(lib.SIGNIFICANCE_LEVELS)).toBe(true);
  });

  it('declares exactly 8 PRIDE_KINDS', () => {
    expect(lib.PRIDE_KINDS).toHaveLength(8);
    expect(lib.PRIDE_KINDS).toEqual(
      expect.arrayContaining([
        'gas_major_jump',
        'icf_qualifier_improvement',
        'first_time_milestone',
        'goal_achieved',
        'sibling_positive_event',
        'family_wellbeing_band_up',
        'voice_breakthrough',
        'community_participation',
      ])
    );
  });

  it('PRIDE_KINDS + SIGNIFICANCE_LEVELS are frozen', () => {
    expect(Object.isFrozen(lib.PRIDE_KINDS)).toBe(true);
    expect(Object.isFrozen(lib.SIGNIFICANCE_LEVELS)).toBe(true);
    expect(Object.isFrozen(lib)).toBe(true);
  });

  it('declares 4 SIGNIFICANCE_LEVELS in order', () => {
    expect(lib.SIGNIFICANCE_LEVELS).toEqual(['minor', 'moderate', 'major', 'milestone']);
  });

  it('source references 6 input signals + Innovation 7', () => {
    expect(SRC).toMatch(/gasProgressions/);
    expect(SRC).toMatch(/icfImprovements/);
    expect(SRC).toMatch(/voiceLogs/);
    expect(SRC).toMatch(/goalsAchieved/);
    expect(SRC).toMatch(/sdqDeltas/);
    expect(SRC).toMatch(/wbciBandHistory/);
    expect(SRC).toMatch(/Innovation 7/);
  });
});

describe('W481 — extractPrideMoments', () => {
  it('returns empty bundle on empty input', () => {
    const r = lib.extractPrideMoments({});
    expect(r.moments).toEqual([]);
    expect(r.totalCount).toBe(0);
    expect(r.byKind).toEqual({});
  });

  it('returns empty bundle on undefined input', () => {
    const r = lib.extractPrideMoments();
    expect(r.totalCount).toBe(0);
  });

  it('flags GAS jump >=10 T-score as major', () => {
    const r = lib.extractPrideMoments({
      gasProgressions: [
        { goalId: 'g1', earliestTScore: 30, latestTScore: 42, latestSnapshotDate: new Date() },
      ],
    });
    expect(r.totalCount).toBe(1);
    expect(r.moments[0].kind).toBe('gas_major_jump');
    expect(r.moments[0].significance).toBe('major');
    expect(r.moments[0].rawDelta).toBeCloseTo(12, 1);
  });

  it('flags GAS jump >=20 T-score as milestone', () => {
    const r = lib.extractPrideMoments({
      gasProgressions: [{ goalId: 'g1', earliestTScore: 30, latestTScore: 55 }],
    });
    expect(r.moments[0].significance).toBe('milestone');
  });

  it('ignores GAS jump <10 T-score', () => {
    const r = lib.extractPrideMoments({
      gasProgressions: [{ goalId: 'g1', earliestTScore: 40, latestTScore: 45 }],
    });
    expect(r.totalCount).toBe(0);
  });

  it('ignores GAS with non-numeric scores', () => {
    const r = lib.extractPrideMoments({
      gasProgressions: [{ goalId: 'g1', earliestTScore: null, latestTScore: 50 }],
    });
    expect(r.totalCount).toBe(0);
  });

  it('flags ICF improvement <=-1 as moderate', () => {
    const r = lib.extractPrideMoments({
      icfImprovements: [{ code: 'd450', averageDelta: -1 }],
    });
    expect(r.moments[0].kind).toBe('icf_qualifier_improvement');
    expect(r.moments[0].significance).toBe('moderate');
  });

  it('flags ICF improvement <=-2 as major', () => {
    const r = lib.extractPrideMoments({
      icfImprovements: [{ code: 'd450', averageDelta: -2.5 }],
    });
    expect(r.moments[0].significance).toBe('major');
  });

  it('flags voice dream entries as voice_breakthrough', () => {
    const r = lib.extractPrideMoments({
      voiceLogs: [{ _id: 'v1', entryKind: 'dream', capturedAt: new Date() }],
    });
    expect(r.moments[0].kind).toBe('voice_breakthrough');
    expect(r.moments[0].significance).toBe('moderate');
  });

  it('flags preference with capacityGrade=full as voice_breakthrough', () => {
    const r = lib.extractPrideMoments({
      voiceLogs: [{ _id: 'v2', entryKind: 'preference', capacityGrade: 'full' }],
    });
    expect(r.totalCount).toBe(1);
  });

  it('ignores preference with partial capacityGrade', () => {
    const r = lib.extractPrideMoments({
      voiceLogs: [{ _id: 'v3', entryKind: 'preference', capacityGrade: 'partial' }],
    });
    expect(r.totalCount).toBe(0);
  });

  it('flags goal achievement as milestone', () => {
    const r = lib.extractPrideMoments({
      goalsAchieved: [{ _id: 'g1', title: 'يمشي 5 أمتار باستقلالية' }],
    });
    expect(r.moments[0].kind).toBe('goal_achieved');
    expect(r.moments[0].significance).toBe('milestone');
  });

  it('flags sibling positive event when total drops >=3 + prosocial up >=1', () => {
    const r = lib.extractPrideMoments({
      sdqDeltas: [{ siblingId: 's1', total_before: 18, total_after: 14, prosocial_delta: 2 }],
    });
    expect(r.moments[0].kind).toBe('sibling_positive_event');
    expect(r.moments[0].significance).toBe('moderate');
  });

  it('ignores sibling deltas without both conditions met', () => {
    const r = lib.extractPrideMoments({
      sdqDeltas: [
        { siblingId: 's1', total_before: 18, total_after: 17, prosocial_delta: 2 }, // total -1 only
        { siblingId: 's2', total_before: 18, total_after: 14, prosocial_delta: 0 }, // no prosocial
      ],
    });
    expect(r.totalCount).toBe(0);
  });

  it('flags WBCI band improvement (1 step) as moderate', () => {
    const r = lib.extractPrideMoments({
      wbciBandHistory: [
        { snapshotDate: '2026-01-01', band: 'monitor' },
        { snapshotDate: '2026-04-01', band: 'stable' },
      ],
    });
    expect(r.moments[0].kind).toBe('family_wellbeing_band_up');
    expect(r.moments[0].significance).toBe('moderate');
  });

  it('flags WBCI band improvement (>=2 steps) as major', () => {
    const r = lib.extractPrideMoments({
      wbciBandHistory: [
        { snapshotDate: '2026-01-01', band: 'crisis' },
        { snapshotDate: '2026-04-01', band: 'monitor' },
      ],
    });
    expect(r.moments[0].significance).toBe('major');
  });

  it('ignores WBCI band decline', () => {
    const r = lib.extractPrideMoments({
      wbciBandHistory: [
        { snapshotDate: '2026-01-01', band: 'thriving' },
        { snapshotDate: '2026-04-01', band: 'stable' },
      ],
    });
    expect(r.totalCount).toBe(0);
  });

  it('aggregates byKind correctly', () => {
    const r = lib.extractPrideMoments({
      gasProgressions: [
        { goalId: 'g1', earliestTScore: 30, latestTScore: 42 },
        { goalId: 'g2', earliestTScore: 25, latestTScore: 40 },
      ],
      goalsAchieved: [{ _id: 'g3', title: 'X' }],
    });
    expect(r.totalCount).toBe(3);
    expect(r.byKind.gas_major_jump).toBe(2);
    expect(r.byKind.goal_achieved).toBe(1);
  });
});

describe('W481 — rankByImpact', () => {
  it('returns [] on non-array input', () => {
    expect(lib.rankByImpact(null)).toEqual([]);
    expect(lib.rankByImpact(undefined)).toEqual([]);
    expect(lib.rankByImpact('not-array')).toEqual([]);
  });

  it('sorts milestone above major above moderate above minor', () => {
    const r = lib.rankByImpact([
      { significance: 'minor', date: new Date('2026-04-01') },
      { significance: 'milestone', date: new Date('2026-04-01') },
      { significance: 'moderate', date: new Date('2026-04-01') },
      { significance: 'major', date: new Date('2026-04-01') },
    ]);
    expect(r.map(m => m.significance)).toEqual(['milestone', 'major', 'moderate', 'minor']);
  });

  it('sorts more recent first within same significance', () => {
    const r = lib.rankByImpact([
      { significance: 'major', date: '2026-01-01', tag: 'old' },
      { significance: 'major', date: '2026-04-01', tag: 'new' },
    ]);
    expect(r[0].tag).toBe('new');
  });

  it('respects limit', () => {
    const moments = Array.from({ length: 10 }, (_, i) => ({
      significance: 'major',
      date: new Date(2026, 3, i + 1),
    }));
    expect(lib.rankByImpact(moments, 3)).toHaveLength(3);
  });

  it('defaults limit to 5', () => {
    const moments = Array.from({ length: 10 }, () => ({
      significance: 'major',
      date: new Date(),
    }));
    expect(lib.rankByImpact(moments)).toHaveLength(5);
  });
});

describe('W481 — filterByDateRange', () => {
  it('returns [] on non-array input', () => {
    expect(lib.filterByDateRange(null)).toEqual([]);
  });

  it('filters moments outside window', () => {
    const moments = [
      { date: '2026-01-01', tag: 'before' },
      { date: '2026-04-15', tag: 'inside' },
      { date: '2026-12-01', tag: 'after' },
    ];
    const r = lib.filterByDateRange(moments, '2026-04-01', '2026-05-01');
    expect(r).toHaveLength(1);
    expect(r[0].tag).toBe('inside');
  });

  it('returns moments from epoch when fromDate omitted', () => {
    const moments = [{ date: '2020-01-01' }, { date: '2026-04-15' }];
    expect(lib.filterByDateRange(moments, null, '2026-05-01')).toHaveLength(2);
  });
});

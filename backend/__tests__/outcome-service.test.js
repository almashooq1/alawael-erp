/**
 * outcome-service.test.js — pure-math assertions for the clinical
 * outcome-tracking service. No DB, no mongoose.
 */

'use strict';

const svc = require('../services/outcomeService');

function rec({ score, daysAgo, tool = 'CARS-2', interpretation = null, rawScore = null }) {
  return {
    score,
    rawScore,
    tool,
    interpretation,
    assessmentDate: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
  };
}

describe('outcomeService.trajectory', () => {
  it('empty records → empty series', () => {
    expect(svc.trajectory([])).toEqual([]);
  });

  it('skips records with null score (non-numeric tools)', () => {
    const s = svc.trajectory([
      rec({ score: 40, daysAgo: 30 }),
      rec({ score: null, daysAgo: 20 }),
      rec({ score: 50, daysAgo: 10 }),
    ]);
    expect(s).toHaveLength(2);
  });

  it('sorts ascending by assessmentDate regardless of input order', () => {
    const s = svc.trajectory([
      rec({ score: 60, daysAgo: 10 }),
      rec({ score: 40, daysAgo: 90 }),
      rec({ score: 50, daysAgo: 50 }),
    ]);
    expect(s.map(p => p.score)).toEqual([40, 50, 60]);
  });

  it('computes delta vs previous with 1-decimal rounding', () => {
    const s = svc.trajectory([
      rec({ score: 40, daysAgo: 90 }),
      rec({ score: 47.6, daysAgo: 60 }),
      rec({ score: 52, daysAgo: 30 }),
    ]);
    expect(s[0].delta).toBe(0);
    expect(s[1].delta).toBe(7.6);
    expect(s[2].delta).toBe(4.4);
  });

  it('filters to a single tool when passed', () => {
    const s = svc.trajectory(
      [
        rec({ score: 40, daysAgo: 90, tool: 'CARS-2' }),
        rec({ score: 70, daysAgo: 80, tool: 'VB-MAPP' }),
        rec({ score: 50, daysAgo: 30, tool: 'CARS-2' }),
      ],
      'CARS-2'
    );
    expect(s).toHaveLength(2);
    expect(s.every(p => p.tool === 'CARS-2')).toBe(true);
  });

  it('daysSincePrev is null for the first point and integer-rounded after', () => {
    const s = svc.trajectory([rec({ score: 40, daysAgo: 90 }), rec({ score: 50, daysAgo: 60 })]);
    expect(s[0].daysSincePrev).toBeNull();
    expect(s[1].daysSincePrev).toBe(30);
  });
});

describe('outcomeService.trendDirection', () => {
  const mkSeries = (...scores) =>
    scores.map((score, i) => ({
      score,
      date: new Date(Date.now() - (scores.length - i) * 30 * 24 * 60 * 60 * 1000),
    }));

  it('< 3 data points → insufficient', () => {
    expect(svc.trendDirection(mkSeries(40))).toBe('insufficient');
    expect(svc.trendDirection(mkSeries(40, 50))).toBe('insufficient');
  });

  it('final-minus-first ≥ steadyBand (+5) → improving', () => {
    expect(svc.trendDirection(mkSeries(40, 45, 55))).toBe('improving');
  });

  it('final-minus-first ≤ -steadyBand → declining', () => {
    expect(svc.trendDirection(mkSeries(55, 50, 40))).toBe('declining');
  });

  it('within ±5 band → steady', () => {
    expect(svc.trendDirection(mkSeries(50, 52, 53))).toBe('steady');
    expect(svc.trendDirection(mkSeries(50, 48, 47))).toBe('steady');
  });

  it('env override tunes the steady band', () => {
    process.env.OUTCOME_STEADY_BAND = '10';
    try {
      expect(svc.THRESHOLDS.steadyBand).toBe(10);
      // Delta of 7 falls inside 10-point band → steady (would be improving at default 5)
      expect(svc.trendDirection(mkSeries(40, 44, 47))).toBe('steady');
    } finally {
      delete process.env.OUTCOME_STEADY_BAND;
    }
  });
});

describe('outcomeService.compareToBaseline', () => {
  it('returns null when <2 points', () => {
    expect(svc.compareToBaseline([])).toBeNull();
    expect(svc.compareToBaseline([{ score: 40, date: new Date() }])).toBeNull();
  });

  it('delta = latest - baseline, rounded to 1 decimal', () => {
    const s = svc.trajectory([rec({ score: 40, daysAgo: 90 }), rec({ score: 55.7, daysAgo: 10 })]);
    const b = svc.compareToBaseline(s);
    expect(b.delta).toBe(15.7);
    // 15.7/40 → ~39.25; depending on FP representation, Math.round
    // can yield 39.2 or 39.3 — accept either.
    expect([39.2, 39.3]).toContain(b.percentChange);
    expect(b.daysBetween).toBe(80);
  });

  it('percentChange is null when baseline score is 0', () => {
    const s = [
      { score: 0, date: new Date('2025-01-01'), interpretation: 'profound' },
      { score: 20, date: new Date('2025-06-01'), interpretation: 'severe' },
    ];
    const b = svc.compareToBaseline(s);
    expect(b.percentChange).toBeNull();
    expect(b.delta).toBe(20);
  });
});

describe('outcomeService.milestones', () => {
  it('returns empty when no interpretations present', () => {
    const s = svc.trajectory([rec({ score: 40, daysAgo: 90 })]);
    expect(svc.milestones(s)).toEqual([]);
  });

  it('emits one row per interpretation, in first-reached order', () => {
    const s = svc.trajectory([
      rec({ score: 30, daysAgo: 120, interpretation: 'severe' }),
      rec({ score: 45, daysAgo: 90, interpretation: 'moderate' }),
      rec({ score: 55, daysAgo: 60, interpretation: 'moderate' }), // dup — skipped
      rec({ score: 70, daysAgo: 30, interpretation: 'mild' }),
    ]);
    const m = svc.milestones(s);
    expect(m.map(x => x.interpretation)).toEqual(['severe', 'moderate', 'mild']);
  });
});

describe('outcomeService.summarizeByTool', () => {
  it('rolls up count + avg + latest + trend per tool', () => {
    const out = svc.summarizeByTool([
      rec({ score: 40, daysAgo: 120, tool: 'CARS-2' }),
      rec({ score: 50, daysAgo: 60, tool: 'CARS-2' }),
      rec({ score: 60, daysAgo: 20, tool: 'CARS-2' }),
      rec({ score: 70, daysAgo: 80, tool: 'VB-MAPP' }),
      rec({ score: 72, daysAgo: 20, tool: 'VB-MAPP' }),
    ]);
    expect(out['CARS-2'].count).toBe(3);
    expect(out['CARS-2'].avgScore).toBe(50);
    expect(out['CARS-2'].latestScore).toBe(60);
    expect(out['CARS-2'].trend).toBe('improving'); // +20 delta
    expect(out['VB-MAPP'].count).toBe(2);
    expect(out['VB-MAPP'].trend).toBe('insufficient'); // <3 points
  });
});

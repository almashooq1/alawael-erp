/**
 * goal-progress-service.test.js — pure-math tests.
 */

'use strict';

const svc = require('../services/goalProgressService');

function entry({ progressPercent, daysAgo, goalId = 'G1' }) {
  return {
    progressPercent,
    goalId,
    recordedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
  };
}

describe('goalProgressService.trajectory', () => {
  it('empty → empty series', () => {
    expect(svc.trajectory([])).toEqual([]);
  });

  it('skips invalid progress values', () => {
    const s = svc.trajectory([
      entry({ progressPercent: 30, daysAgo: 30 }),
      { goalId: 'G1', recordedAt: new Date() }, // missing progress
      entry({ progressPercent: 50, daysAgo: 10 }),
    ]);
    expect(s).toHaveLength(2);
  });

  it('sorts by recordedAt ascending', () => {
    const s = svc.trajectory([
      entry({ progressPercent: 50, daysAgo: 10 }),
      entry({ progressPercent: 30, daysAgo: 60 }),
      entry({ progressPercent: 80, daysAgo: 1 }),
    ]);
    expect(s.map(p => p.progressPercent)).toEqual([30, 50, 80]);
  });

  it('computes delta + daysSincePrev', () => {
    const s = svc.trajectory([
      entry({ progressPercent: 30, daysAgo: 60 }),
      entry({ progressPercent: 45, daysAgo: 30 }),
    ]);
    expect(s[0].delta).toBe(0);
    expect(s[0].daysSincePrev).toBeNull();
    expect(s[1].delta).toBe(15);
    expect(s[1].daysSincePrev).toBe(30);
  });
});

describe('goalProgressService.verdict', () => {
  const mk = (...vals) =>
    vals.map((p, i) => ({
      progressPercent: p,
      recordedAt: new Date(Date.now() - (vals.length - i) * 30 * 24 * 60 * 60 * 1000),
    }));

  it('< minEntries → insufficient', () => {
    expect(svc.verdict([{ progressPercent: 50, recordedAt: new Date() }])).toBe('insufficient');
  });

  it('latest >= achievedAt (100) → achieved (overrides trend)', () => {
    expect(svc.verdict(mk(70, 100))).toBe('achieved');
  });

  it('improving when delta exceeds steadyBand', () => {
    expect(svc.verdict(mk(20, 50))).toBe('improving');
  });

  it('declining when negative delta exceeds steadyBand', () => {
    expect(svc.verdict(mk(60, 30))).toBe('declining');
  });

  it('steady within ±5', () => {
    expect(svc.verdict(mk(50, 53))).toBe('steady');
    expect(svc.verdict(mk(50, 47))).toBe('steady');
  });
});

describe('goalProgressService.detectStalled', () => {
  it('empty map → empty list', () => {
    expect(svc.detectStalled(new Map())).toEqual([]);
  });

  it('flags goals with no movement for ≥ stallDays (default 30)', () => {
    const stalled = svc.detectStalled(
      new Map([
        [
          'G1',
          [
            entry({ progressPercent: 30, daysAgo: 60, goalId: 'G1' }),
            entry({ progressPercent: 35, daysAgo: 45, goalId: 'G1' }),
          ],
        ],
        ['G2', [entry({ progressPercent: 50, daysAgo: 10, goalId: 'G2' })]], // recent — not stalled
      ])
    );
    expect(stalled.map(s => s.goalId)).toEqual(['G1']);
    expect(stalled[0].daysSinceLast).toBeGreaterThanOrEqual(45);
  });

  it('skips already-achieved goals', () => {
    const stalled = svc.detectStalled(
      new Map([
        [
          'G1',
          [
            entry({ progressPercent: 100, daysAgo: 90, goalId: 'G1' }),
            entry({ progressPercent: 100, daysAgo: 60, goalId: 'G1' }),
          ],
        ],
      ])
    );
    expect(stalled).toEqual([]);
  });

  it('env override tunes stallDays', () => {
    process.env.GOAL_STALL_DAYS = '7';
    try {
      const stalled = svc.detectStalled(
        new Map([
          [
            'G1',
            [
              entry({ progressPercent: 30, daysAgo: 10, goalId: 'G1' }),
              entry({ progressPercent: 32, daysAgo: 8, goalId: 'G1' }),
            ],
          ],
        ])
      );
      expect(stalled).toHaveLength(1);
    } finally {
      delete process.env.GOAL_STALL_DAYS;
    }
  });
});

describe('goalProgressService.summarizeByBeneficiary', () => {
  it('rolls up across goals', () => {
    const s = svc.summarizeByBeneficiary([
      // G1: improving 30 → 60
      entry({ progressPercent: 30, daysAgo: 5, goalId: 'G1' }),
      entry({ progressPercent: 60, daysAgo: 1, goalId: 'G1' }),
      // G2: achieved
      entry({ progressPercent: 100, daysAgo: 1, goalId: 'G2' }),
      entry({ progressPercent: 100, daysAgo: 0, goalId: 'G2' }),
    ]);
    expect(s.totalGoals).toBe(2);
    expect(s.avgProgress).toBe(80); // (60 + 100) / 2
    expect(s.verdictCounts.improving).toBe(1);
    expect(s.verdictCounts.achieved).toBe(1);
  });

  it('stalled overrides trend bucket in count', () => {
    process.env.GOAL_STALL_DAYS = '5';
    try {
      const s = svc.summarizeByBeneficiary([
        entry({ progressPercent: 30, daysAgo: 30, goalId: 'G1' }),
        entry({ progressPercent: 50, daysAgo: 20, goalId: 'G1' }),
      ]);
      // Verdict would be 'improving' but no movement in 20 days → stalled
      expect(s.stalled).toBe(1);
      expect(s.verdictCounts.stalled).toBe(1);
      expect(s.verdictCounts.improving).toBe(0);
    } finally {
      delete process.env.GOAL_STALL_DAYS;
    }
  });
});

/**
 * progress-engine.test.js — Phase 9 Commit 11.
 *
 * Unit tests over services/progressEngine.js. Pure math — no DB,
 * no mocks needed.
 */

'use strict';

const engine = require('../services/progressEngine');

function entry(daysAgo, measuredValue, rating) {
  return {
    recordedAt: new Date(Date.now() - daysAgo * 86400000),
    measuredValue,
    rating,
  };
}

// ─── computeTrend ──────────────────────────────────────────────────

describe('progressEngine.computeTrend()', () => {
  const goal = { baseline: 20, target: 80 };

  it('returns STALLED when fewer than 2 entries', () => {
    expect(engine.computeTrend(goal, [])).toBe('STALLED');
    expect(engine.computeTrend(goal, [entry(5, 30)])).toBe('STALLED');
  });

  it('classifies a steady climb as IMPROVING', () => {
    const entries = [entry(30, 20), entry(20, 35), entry(10, 55), entry(0, 70)];
    expect(engine.computeTrend(goal, entries)).toBe('IMPROVING');
  });

  it('classifies a steady decline as DECLINING', () => {
    const entries = [entry(30, 70), entry(20, 55), entry(10, 35), entry(0, 22)];
    expect(engine.computeTrend(goal, entries)).toBe('DECLINING');
  });

  it('classifies a flat line of at least 3 entries as STALLED', () => {
    const entries = [entry(30, 40), entry(20, 40), entry(10, 40), entry(0, 40)];
    expect(engine.computeTrend(goal, entries)).toBe('STALLED');
  });

  it('classifies small oscillations as STABLE', () => {
    const entries = [entry(30, 40), entry(20, 43), entry(10, 41), entry(0, 42)];
    expect(engine.computeTrend(goal, entries)).toBe('STABLE');
  });

  it('handles a lower-is-better goal (baseline > target)', () => {
    const reverseGoal = { baseline: 100, target: 20 };
    const entries = [entry(30, 100), entry(20, 75), entry(10, 50), entry(0, 25)];
    // Values decreasing + range -80 → slope ≈ -25/iter, ratio ≈ -25/80 = -0.31 → DECLINING
    // But declining toward target is GOOD; our engine reports direction, not goodness.
    expect(engine.computeTrend(reverseGoal, entries)).toBe('DECLINING');
  });

  it('emits only enum values from PROGRESS_TRENDS', () => {
    const trends = [
      engine.computeTrend(goal, []),
      engine.computeTrend(goal, [entry(30, 20), entry(0, 70)]),
      engine.computeTrend(goal, [entry(30, 70), entry(0, 20)]),
    ];
    for (const t of trends) expect(engine.PROGRESS_TRENDS).toContain(t);
  });
});

// ─── computeVelocity ───────────────────────────────────────────────

describe('progressEngine.computeVelocity()', () => {
  const now = new Date('2026-05-01T00:00:00.000Z');
  const goal = {
    baseline: 20,
    target: 80,
    targetDate: new Date('2026-08-01T00:00:00.000Z'), // 92 days away
  };

  it('returns zero rate when fewer than 2 entries', () => {
    const v = engine.computeVelocity(goal, [entry(10, 25)], now);
    expect(v.ratePerDay).toBe(0);
    expect(v.currentValue).toBe(25);
  });

  it('computes a positive rate for improving series', () => {
    // 20 → 60 over 30 days = ~1.33/day
    const entries = [
      { recordedAt: new Date('2026-04-01T00:00:00Z'), measuredValue: 20 },
      { recordedAt: new Date('2026-05-01T00:00:00Z'), measuredValue: 60 },
    ];
    const v = engine.computeVelocity(goal, entries, now);
    expect(v.ratePerDay).toBeCloseTo(1.33, 1);
    expect(v.percentToTarget).toBeCloseTo(66.7, 1);
  });

  it('projects onTrack=true when current rate reaches target before targetDate', () => {
    // rate ~1.33/day, need 80-60=20 more, at 1.33/day = 15 days < 92 remaining
    const entries = [
      { recordedAt: new Date('2026-04-01T00:00:00Z'), measuredValue: 20 },
      { recordedAt: new Date('2026-05-01T00:00:00Z'), measuredValue: 60 },
    ];
    const v = engine.computeVelocity(goal, entries, now);
    expect(v.onTrack).toBe(true);
    expect(v.projectedCompletionDays).toBeGreaterThan(0);
    expect(v.projectedCompletionDays).toBeLessThan(v.daysRemaining);
  });

  it('projects onTrack=false when rate is too slow', () => {
    // 20 → 22 over 30 days = ~0.067/day, need 58 more = ~867 days
    const entries = [
      { recordedAt: new Date('2026-04-01T00:00:00Z'), measuredValue: 20 },
      { recordedAt: new Date('2026-05-01T00:00:00Z'), measuredValue: 22 },
    ];
    const v = engine.computeVelocity(goal, entries, now);
    expect(v.onTrack).toBe(false);
  });

  it('clamps percentToTarget to [0, 100]', () => {
    const entries = [{ recordedAt: new Date('2026-04-01T00:00:00Z'), measuredValue: 5 }];
    const v = engine.computeVelocity(goal, entries, now);
    expect(v.percentToTarget).toBe(0);

    const exceeded = [{ recordedAt: new Date('2026-04-01T00:00:00Z'), measuredValue: 200 }];
    const v2 = engine.computeVelocity(goal, exceeded, now);
    expect(v2.percentToTarget).toBe(100);
  });

  it('returns null daysRemaining + onTrack when no targetDate', () => {
    const goalNoDate = { baseline: 20, target: 80 };
    const entries = [
      { recordedAt: new Date('2026-04-01T00:00:00Z'), measuredValue: 20 },
      { recordedAt: new Date('2026-05-01T00:00:00Z'), measuredValue: 60 },
    ];
    const v = engine.computeVelocity(goalNoDate, entries, now);
    expect(v.daysRemaining).toBeNull();
    expect(v.onTrack).toBeNull();
  });
});

// ─── isMastered ────────────────────────────────────────────────────

describe('progressEngine.isMastered()', () => {
  const goal = { baseline: 20, target: 80 };

  it('returns false when fewer than the required consecutive entries exist', () => {
    expect(engine.isMastered(goal, [entry(5, 80)])).toBe(false);
    expect(engine.isMastered(goal, [entry(10, 80), entry(5, 85)])).toBe(false);
  });

  it('returns true when the last 3 entries hit or exceed target', () => {
    const entries = [entry(30, 50), entry(20, 80), entry(10, 85), entry(0, 82)];
    expect(engine.isMastered(goal, entries)).toBe(true);
  });

  it('returns false when any tail entry dips below target', () => {
    const entries = [entry(20, 80), entry(10, 79), entry(0, 82)];
    expect(engine.isMastered(goal, entries)).toBe(false);
  });

  it('honours a custom consecutiveRequired', () => {
    const entries = [entry(10, 80), entry(0, 85)];
    expect(engine.isMastered(goal, entries, { consecutiveRequired: 2 })).toBe(true);
  });

  it('handles lower-is-better goals (baseline > target)', () => {
    const reverseGoal = { baseline: 10, target: 2 };
    // All three tail entries must sit at-or-below target (2).
    const entries = [entry(20, 2), entry(10, 1), entry(0, 2)];
    expect(engine.isMastered(reverseGoal, entries)).toBe(true);
  });
});

// ─── consecutiveRegressed ─────────────────────────────────────────

describe('progressEngine.consecutiveRegressed()', () => {
  it('returns 0 for empty entries', () => {
    expect(engine.consecutiveRegressed([]).regressedStreak).toBe(0);
  });

  it('returns 0 when no trailing regressions', () => {
    const entries = [
      entry(10, 30, 'PROGRESSING'),
      entry(5, 40, 'PROGRESSING'),
      entry(0, 50, 'ACHIEVED'),
    ];
    expect(engine.consecutiveRegressed(entries).regressedStreak).toBe(0);
  });

  it('counts only the tail-most streak', () => {
    const entries = [
      entry(20, 50, 'REGRESSED'),
      entry(15, 55, 'PROGRESSING'),
      entry(10, 45, 'REGRESSED'),
      entry(5, 40, 'REGRESSED'),
    ];
    // Latest two are REGRESSED; PROGRESSING at day-15 breaks the older streak
    expect(engine.consecutiveRegressed(entries).regressedStreak).toBe(2);
  });

  it('is case-insensitive on rating strings', () => {
    const entries = [entry(5, 40, 'regressed'), entry(0, 38, 'Regressed')];
    expect(engine.consecutiveRegressed(entries).regressedStreak).toBe(2);
  });

  it('exposes the path shape declared by the red-flag registry', () => {
    const out = engine.consecutiveRegressed([]);
    // red-flags.registry.js declares path: 'regressedStreak'
    expect(Object.prototype.hasOwnProperty.call(out, 'regressedStreak')).toBe(true);
  });
});

// ─── daysSinceLastProgress ────────────────────────────────────────

describe('progressEngine.daysSinceLastProgress()', () => {
  const now = new Date('2026-05-01T00:00:00Z');

  it('returns Infinity when no entries', () => {
    const out = engine.daysSinceLastProgress([], now);
    expect(out.daysSince).toBe(Number.POSITIVE_INFINITY);
    expect(out.latestAt).toBeNull();
  });

  it('returns the floor-days from the most recent entry', () => {
    const entries = [entry(30, 40), entry(7, 50)];
    // "7 days ago" relative to default new Date() — the helper uses
    // Date.now() at call time. We pass `now` to keep it deterministic.
    const latestAt = new Date(now.getTime() - 7 * 86400000);
    const out = engine.daysSinceLastProgress(
      [
        { recordedAt: new Date(now.getTime() - 30 * 86400000), measuredValue: 40 },
        { recordedAt: latestAt, measuredValue: 50 },
      ],
      now
    );
    expect(out.daysSince).toBe(7);
    expect(out.latestAt).toEqual(latestAt);
  });

  it('exposes the path shape declared by the red-flag registry', () => {
    const out = engine.daysSinceLastProgress([]);
    expect(Object.prototype.hasOwnProperty.call(out, 'daysSince')).toBe(true);
  });
});

// ─── buildGoalProgressTriggerSource ───────────────────────────────

describe('progressEngine.buildGoalProgressTriggerSource()', () => {
  it('requires fetchEntries', () => {
    expect(() => engine.buildGoalProgressTriggerSource({})).toThrow('fetchEntries');
  });

  it('exposes consecutiveRatings + daysSinceLastProgress matching the registry', async () => {
    const fakeEntries = [entry(5, 40, 'REGRESSED'), entry(0, 38, 'REGRESSED')];
    const src = engine.buildGoalProgressTriggerSource({
      fetchEntries: async () => fakeEntries,
    });
    expect(typeof src.consecutiveRatings).toBe('function');
    expect(typeof src.daysSinceLastProgress).toBe('function');
    const out = await src.consecutiveRatings('goal-1');
    expect(out.regressedStreak).toBe(2);
  });
});

// ─── Internals ─────────────────────────────────────────────────────

describe('progressEngine — internals', () => {
  it('_mean handles empty array', () => {
    expect(engine._mean([])).toBe(0);
  });

  it('_variance is 0 for a single point', () => {
    expect(engine._variance([42])).toBe(0);
  });

  it('_linearSlope is 0 for a flat series', () => {
    expect(engine._linearSlope([5, 5, 5, 5])).toBe(0);
  });

  it('_linearSlope is positive for a climbing series', () => {
    expect(engine._linearSlope([10, 20, 30, 40])).toBeGreaterThan(0);
  });
});

/**
 * alert-evaluator.test.js — Phase 18 Commit 8.
 *
 * Pure-function tests for the evaluator: no state store, no
 * dispatcher. Every path (fire / escalate / recover / suppress /
 * noop) gets its own exhaustive case.
 */

'use strict';

const { evaluateSinglePolicy, _internals } = require('../services/alertEvaluator.service');

function policy(overrides = {}) {
  return Object.assign(
    {
      id: 'test.policy',
      kpiId: 'finance.ar.dso.days',
      severity: 'warning',
      trigger: { on: 'red', minConsecutiveTicks: 2 },
      dedupWindowMs: 60_000,
      quietHours: null,
      escalationLadderId: 'warning.standard',
      headlineAr: 'تنبيه',
      headlineEn: 'Alert',
    },
    overrides
  );
}

function snapshot(overrides = {}) {
  return Object.assign(
    { id: 'finance.ar.dso.days', classification: 'red', value: 99, delta: 0.2 },
    overrides
  );
}

const clock = { now: () => new Date('2026-04-24T10:00:00Z').getTime() };

describe('evaluator — flapping guard', () => {
  it('does not fire on first tick when minConsecutiveTicks>1', () => {
    const d = evaluateSinglePolicy({
      policy: policy(),
      snapshot: snapshot(),
      state: null,
      clock,
    });
    expect(d.action).toBe('noop');
    expect(d.reason).toMatch(/flapping/);
  });

  it('fires after minConsecutiveTicks ticks of the target classification', () => {
    const d = evaluateSinglePolicy({
      policy: policy(),
      snapshot: snapshot(),
      state: { classification: 'red', consecutiveTicks: 1 },
      clock,
    });
    expect(d.action).toBe('fire');
    expect(d.escalationStep).toBe(0);
  });

  it('resets the streak when classification flips', () => {
    const d = evaluateSinglePolicy({
      policy: policy(),
      snapshot: snapshot({ classification: 'amber' }),
      state: { classification: 'red', consecutiveTicks: 5 },
      clock,
    });
    expect(d.action).toBe('noop');
    expect(d.nextState.consecutiveTicks).toBe(0);
  });
});

describe('evaluator — recover', () => {
  it('emits recover when classification returns to green from firing', () => {
    const d = evaluateSinglePolicy({
      policy: policy(),
      snapshot: snapshot({ classification: 'green' }),
      state: {
        classification: 'red',
        consecutiveTicks: 3,
        firstFiredAt: clock.now() - 10_000,
      },
      clock,
    });
    expect(d.action).toBe('recover');
    expect(d.nextState.firstFiredAt).toBeNull();
  });
});

describe('evaluator — dedup', () => {
  it('suppresses re-fires within the dedup window', () => {
    const now = clock.now();
    const d = evaluateSinglePolicy({
      policy: policy({ dedupWindowMs: 60_000 }),
      snapshot: snapshot(),
      state: {
        classification: 'red',
        consecutiveTicks: 5,
        firstFiredAt: now - 30_000,
        lastFiredAt: now - 30_000,
        escalationStep: 0,
      },
      clock,
    });
    expect(d.action).toBe('suppress');
    expect(d.reason).toMatch(/dedup_window/);
  });

  it('re-fires once the dedup window has elapsed', () => {
    const now = clock.now();
    const d = evaluateSinglePolicy({
      policy: policy({ dedupWindowMs: 60_000 }),
      snapshot: snapshot(),
      state: {
        classification: 'red',
        consecutiveTicks: 5,
        firstFiredAt: now - 120_000,
        lastFiredAt: now - 90_000,
        escalationStep: 0,
      },
      clock,
    });
    expect(d.action).toBe('fire');
    expect(d.reason).toMatch(/refire/);
  });
});

describe('evaluator — escalation', () => {
  it('escalates to the next ladder step once afterMs has elapsed', () => {
    const now = clock.now();
    const d = evaluateSinglePolicy({
      // warning.standard step 1 = afterMs: 4h = 14_400_000
      policy: policy({ dedupWindowMs: 60_000 }),
      snapshot: snapshot(),
      state: {
        classification: 'red',
        consecutiveTicks: 5,
        firstFiredAt: now - 5 * 60 * 60 * 1000, // 5h ago
        lastFiredAt: now - 60_000,
        escalationStep: 0,
      },
      clock,
    });
    expect(d.action).toBe('escalate');
    expect(d.escalationStep).toBe(1);
  });

  it('does not escalate when ack is present', () => {
    const now = clock.now();
    const d = evaluateSinglePolicy({
      policy: policy({ dedupWindowMs: 60_000 }),
      snapshot: snapshot(),
      state: {
        classification: 'red',
        consecutiveTicks: 5,
        firstFiredAt: now - 5 * 60 * 60 * 1000,
        lastFiredAt: now - 60_000,
        escalationStep: 0,
        ackedAt: now - 60_000,
      },
      clock,
    });
    expect(d.action).not.toBe('escalate');
  });
});

describe('evaluator — quiet hours', () => {
  it('suppresses warnings during quiet hours', () => {
    const nightClock = { now: () => new Date('2026-04-24T23:30:00Z').getTime() };
    const d = evaluateSinglePolicy({
      policy: policy({ quietHours: { start: 22, end: 6 } }),
      snapshot: snapshot(),
      state: { classification: 'red', consecutiveTicks: 2 },
      clock: nightClock,
    });
    expect(d.action).toBe('suppress');
    expect(d.reason).toBe('quiet_hours');
  });

  it('ignores quiet hours for critical severity', () => {
    const nightClock = { now: () => new Date('2026-04-24T23:30:00Z').getTime() };
    const d = evaluateSinglePolicy({
      policy: policy({ severity: 'critical', quietHours: { start: 22, end: 6 } }),
      snapshot: snapshot(),
      state: { classification: 'red', consecutiveTicks: 2 },
      clock: nightClock,
    });
    expect(d.action).toBe('fire');
  });

  it('handles quiet hours that do not wrap midnight', () => {
    // 13:00 UTC, quiet hours 12-14 → suppress
    const noonClock = { now: () => new Date('2026-04-24T13:00:00Z').getTime() };
    const d = evaluateSinglePolicy({
      policy: policy({ quietHours: { start: 12, end: 14 } }),
      snapshot: snapshot(),
      state: { classification: 'red', consecutiveTicks: 2 },
      clock: noonClock,
    });
    expect(d.action).toBe('suppress');
  });
});

describe('evaluator — ack / snooze / mute', () => {
  it('suppresses dispatch while snoozed', () => {
    const now = clock.now();
    const d = evaluateSinglePolicy({
      policy: policy(),
      snapshot: snapshot(),
      state: {
        classification: 'red',
        consecutiveTicks: 5,
        firstFiredAt: now - 60_000,
        snoozeUntil: now + 60_000,
      },
      clock,
    });
    expect(d.action).toBe('suppress');
    expect(d.reason).toBe('snoozed');
  });

  it('suppresses dispatch while muted', () => {
    const now = clock.now();
    const d = evaluateSinglePolicy({
      policy: policy(),
      snapshot: snapshot(),
      state: {
        classification: 'red',
        consecutiveTicks: 5,
        firstFiredAt: now - 60_000,
        mutedUntil: now + 60_000,
      },
      clock,
    });
    expect(d.action).toBe('suppress');
    expect(d.reason).toBe('muted');
  });
});

describe('evaluator — internals', () => {
  it('isInQuietHours respects wrap around midnight', () => {
    const tNight = new Date('2026-04-24T23:30:00Z').getTime();
    const tMorn = new Date('2026-04-24T05:30:00Z').getTime();
    const tDay = new Date('2026-04-24T12:00:00Z').getTime();
    expect(_internals.isInQuietHours({ quietHours: { start: 22, end: 6 } }, tNight)).toBe(true);
    expect(_internals.isInQuietHours({ quietHours: { start: 22, end: 6 } }, tMorn)).toBe(true);
    expect(_internals.isInQuietHours({ quietHours: { start: 22, end: 6 } }, tDay)).toBe(false);
  });

  it('quietHoursExemptSeverity exempts critical + emergency only', () => {
    expect(_internals.quietHoursExemptSeverity('critical')).toBe(true);
    expect(_internals.quietHoursExemptSeverity('emergency')).toBe(true);
    expect(_internals.quietHoursExemptSeverity('warning')).toBe(false);
    expect(_internals.quietHoursExemptSeverity('info')).toBe(false);
  });
});

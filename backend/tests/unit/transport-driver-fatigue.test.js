/**
 * Phase K1 — Driver fatigue detection unit tests
 *
 * Pure deterministic checks: synthesize GPS points around fixed
 * timestamps and assert the level + reason the engine returns.
 */
'use strict';

const {
  analyzeDriver,
  fatigueLevel,
  fatigueReason,
  DEFAULT_OPTS,
} = require('../../services/transport/driverFatigue.service');

const NOW = new Date('2026-05-15T15:00:00.000Z'); // fixed "now" for tests

function makePoint(minutesBefore, speed = 40) {
  return {
    timestamp: new Date(NOW.getTime() - minutesBefore * 60 * 1000).toISOString(),
    speed,
  };
}

describe('fatigueLevel + fatigueReason', () => {
  test('ok when under all thresholds', () => {
    expect(fatigueLevel(60, 120, DEFAULT_OPTS)).toBe('ok');
    expect(fatigueReason(60, 120, DEFAULT_OPTS)).toBeNull();
  });

  test('warning at 4h continuous', () => {
    expect(fatigueLevel(241, 360, DEFAULT_OPTS)).toBe('warning');
    expect(fatigueReason(241, 360, DEFAULT_OPTS)).toBe('continuous_drive_warn');
  });

  test('critical at 4.5h continuous', () => {
    expect(fatigueLevel(271, 360, DEFAULT_OPTS)).toBe('critical');
    expect(fatigueReason(271, 360, DEFAULT_OPTS)).toBe('continuous_drive_critical');
  });

  test('warning at 8h daily even if continuous is fine', () => {
    expect(fatigueLevel(30, 481, DEFAULT_OPTS)).toBe('warning');
    expect(fatigueReason(30, 481, DEFAULT_OPTS)).toBe('daily_drive_warn');
  });

  test('critical at 11h daily', () => {
    expect(fatigueLevel(30, 661, DEFAULT_OPTS)).toBe('critical');
    expect(fatigueReason(30, 661, DEFAULT_OPTS)).toBe('daily_drive_critical');
  });
});

describe('analyzeDriver — empty / minimal inputs', () => {
  test('returns ok when no points', () => {
    const r = analyzeDriver({ points: [], now: NOW });
    expect(r.level).toBe('ok');
    expect(r.metrics.continuousMinutes).toBe(0);
    expect(r.metrics.dailyMinutes).toBe(0);
  });

  test('returns ok when only one point', () => {
    const r = analyzeDriver({ points: [makePoint(10, 40)], now: NOW });
    expect(r.level).toBe('ok');
  });

  test('handles null/undefined gracefully', () => {
    expect(() => analyzeDriver(null)).not.toThrow();
    expect(() => analyzeDriver({})).not.toThrow();
    expect(analyzeDriver({}).level).toBe('ok');
  });
});

describe('analyzeDriver — continuous drive thresholds', () => {
  test('detects continuous warning after 4h driving (1 ping/min)', () => {
    const points = [];
    for (let m = 250; m >= 0; m -= 5) points.push(makePoint(m, 40));
    const r = analyzeDriver({ points, now: NOW });
    expect(['warning', 'critical']).toContain(r.level);
    expect(r.metrics.continuousMinutes).toBeGreaterThan(230);
  });

  test('continuous segment resets after a real break (15+ minutes stopped)', () => {
    const points = [];
    // Drive for 2 hours
    for (let m = 300; m >= 180; m -= 5) points.push(makePoint(m, 40));
    // 20-minute break at standstill
    for (let m = 175; m >= 155; m -= 5) points.push(makePoint(m, 0));
    // Drive again for 1 hour
    for (let m = 150; m >= 90; m -= 5) points.push(makePoint(m, 40));
    const r = analyzeDriver({ points, now: NOW });
    expect(r.level).toBe('ok');
    expect(r.metrics.continuousMinutes).toBeLessThan(180);
    expect(r.metrics.lastBreakAt).not.toBeNull();
  });
});

describe('analyzeDriver — recommendation text', () => {
  test('warning produces Arabic guidance with break suggestion', () => {
    const points = [];
    for (let m = 250; m >= 0; m -= 5) points.push(makePoint(m, 40));
    const r = analyzeDriver({ points, now: NOW });
    expect(r.recommendation).toMatch(/استراحة|توقف/);
  });

  test('ok level has no recommendation', () => {
    const r = analyzeDriver({ points: [makePoint(60, 40), makePoint(50, 40)], now: NOW });
    expect(r.recommendation).toBeNull();
  });
});

describe('analyzeDriver — only counts today', () => {
  test('points from yesterday are ignored (fatigue resets at midnight)', () => {
    // Yesterday at 22:00 → 240 minutes "ago" but past midnight
    const yesterdayAt22 = new Date(NOW);
    yesterdayAt22.setDate(yesterdayAt22.getDate() - 1);
    yesterdayAt22.setHours(22, 0, 0, 0);

    const yesterdayPoints = [];
    for (let m = 0; m < 60; m++) {
      yesterdayPoints.push({
        timestamp: new Date(yesterdayAt22.getTime() + m * 60 * 1000).toISOString(),
        speed: 40,
      });
    }
    const r = analyzeDriver({ points: yesterdayPoints, now: NOW });
    expect(r.level).toBe('ok');
    expect(r.metrics.dailyMinutes).toBe(0);
  });
});

describe('analyzeDriver — custom thresholds', () => {
  test('options override defaults', () => {
    const points = [];
    for (let m = 60; m >= 0; m -= 1) points.push(makePoint(m, 40));
    // With a 30-min warn threshold, an hour of driving should already warn
    const r = analyzeDriver({
      points,
      now: NOW,
      options: { continuousWarnMinutes: 30, continuousCriticalMinutes: 50 },
    });
    expect(['warning', 'critical']).toContain(r.level);
  });
});

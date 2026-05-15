/**
 * Phase F — Driver Safety Score unit tests
 */
'use strict';

const {
  computeDriverScore,
  rankDrivers,
  gradeFromScore,
  SCORING_WEIGHTS,
} = require('../../services/transport/driverSafety.service');

function mkPoint(secondsOffset, speed, opts = {}) {
  const t = new Date(2026, 4, 15, 8, 0, secondsOffset);
  return {
    timestamp: t.toISOString(),
    speed,
    is_speeding: opts.speeding || false,
    is_outside_geofence: opts.outside || false,
    engine_on: opts.engineOn !== false,
  };
}

describe('gradeFromScore', () => {
  test.each([
    [100, 'A'],
    [90, 'A'],
    [89, 'B'],
    [75, 'B'],
    [74, 'C'],
    [60, 'C'],
    [59, 'D'],
    [45, 'D'],
    [44, 'F'],
    [0, 'F'],
  ])('score %d → grade %s', (score, grade) => {
    expect(gradeFromScore(score)).toBe(grade);
  });
});

describe('computeDriverScore — perfect driver', () => {
  const points = Array.from({ length: 360 }, (_, i) => mkPoint(i, 50)); // 1h of 50 km/h
  const trips = [{ status: 'completed' }, { status: 'completed' }, { status: 'completed' }];

  test('produces A grade with score >=90', () => {
    const r = computeDriverScore(points, trips);
    expect(r.grade).toBe('A');
    expect(r.score).toBeGreaterThanOrEqual(90);
  });

  test('reports zero speeding incidents', () => {
    const r = computeDriverScore(points, trips);
    expect(r.breakdown.speeding.incidents).toBe(0);
  });

  test('reports zero harsh events', () => {
    const r = computeDriverScore(points, trips);
    expect(r.breakdown.harsh.accel).toBe(0);
    expect(r.breakdown.harsh.brake).toBe(0);
  });
});

describe('computeDriverScore — speeding driver', () => {
  const points = Array.from({ length: 100 }, (_, i) => mkPoint(i * 10, 140, { speeding: true }));

  test('drops the score significantly', () => {
    const r = computeDriverScore(points, []);
    expect(r.breakdown.speeding.score).toBeLessThan(50);
    expect(r.recommendations.some(x => x.includes('سرعة'))).toBe(true);
  });
});

describe('computeDriverScore — harsh accel/brake', () => {
  // Alternating low-high speed every 2s to trigger harsh events
  const points = [];
  for (let i = 0; i < 20; i++) {
    points.push(mkPoint(i * 2, i % 2 === 0 ? 10 : 40));
  }

  test('detects harsh accel events', () => {
    const r = computeDriverScore(points, []);
    expect(r.breakdown.harsh.accel + r.breakdown.harsh.brake).toBeGreaterThan(0);
  });
});

describe('computeDriverScore — geofence violations', () => {
  const points = Array.from({ length: 50 }, (_, i) => mkPoint(i, 40, { outside: true }));

  test('penalizes geofence violations heavily', () => {
    const r = computeDriverScore(points, []);
    expect(r.breakdown.geofence.score).toBeLessThan(50);
    expect(r.breakdown.geofence.incidents).toBe(50);
  });
});

describe('computeDriverScore — completion rate', () => {
  test('100% completion gets full credit', () => {
    const r = computeDriverScore(
      [mkPoint(0, 50)],
      [{ status: 'completed' }, { status: 'completed' }]
    );
    expect(r.breakdown.completion.score).toBe(100);
  });

  test('50% completion halves the score', () => {
    const r = computeDriverScore(
      [mkPoint(0, 50)],
      [{ status: 'completed' }, { status: 'cancelled' }]
    );
    expect(r.breakdown.completion.score).toBe(50);
  });

  test('no trips defaults to 100 (no penalty)', () => {
    const r = computeDriverScore([mkPoint(0, 50)], []);
    expect(r.breakdown.completion.score).toBe(100);
  });
});

describe('computeDriverScore — empty inputs', () => {
  test('zero points returns score 100 (no incidents)', () => {
    const r = computeDriverScore([], []);
    expect(r.samples).toBe(0);
    expect(r.score).toBe(100);
  });

  test('handles null/undefined gracefully', () => {
    expect(() => computeDriverScore(null, null)).not.toThrow();
    expect(() => computeDriverScore(undefined, undefined)).not.toThrow();
  });
});

describe('rankDrivers', () => {
  test('orders by score descending, assigns rank', () => {
    const ranked = rankDrivers([
      { driverId: 'a', score: 70, samples: 100 },
      { driverId: 'b', score: 90, samples: 100 },
      { driverId: 'c', score: 80, samples: 100 },
    ]);
    expect(ranked[0]).toMatchObject({ driverId: 'b', rank: 1, grade: 'A' });
    expect(ranked[1]).toMatchObject({ driverId: 'c', rank: 2, grade: 'B' });
    expect(ranked[2]).toMatchObject({ driverId: 'a', rank: 3, grade: 'C' });
  });

  test('skips drivers with zero samples', () => {
    const ranked = rankDrivers([
      { driverId: 'a', score: 100, samples: 0 },
      { driverId: 'b', score: 60, samples: 50 },
    ]);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].driverId).toBe('b');
  });

  test('handles empty input', () => {
    expect(rankDrivers([])).toEqual([]);
    expect(rankDrivers(null)).toEqual([]);
  });
});

describe('SCORING_WEIGHTS', () => {
  test('weights sum to 100', () => {
    const total = Object.values(SCORING_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });
});

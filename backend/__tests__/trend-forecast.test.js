'use strict';

const registry = require('../config/trend-forecast.registry');

describe('linearRegression', () => {
  test('perfect line yields R² = 1 and exact predictions', () => {
    const r = registry.linearRegression([0, 1, 2, 3, 4, 5]);
    expect(r.slope).toBe(1);
    expect(r.intercept).toBe(0);
    expect(r.r2).toBeCloseTo(1, 6);
    expect(r.predict(10)).toBe(10);
  });

  test('returns null for fewer than 2 points', () => {
    expect(registry.linearRegression([1])).toBeNull();
  });

  test('constant series → slope 0', () => {
    const r = registry.linearRegression([5, 5, 5, 5]);
    expect(r.slope).toBe(0);
    expect(r.intercept).toBe(5);
  });
});

describe('exponentialSmooth', () => {
  test('first value passes through unchanged', () => {
    const out = registry.exponentialSmooth([10, 20, 30], 0.5);
    expect(out[0]).toBe(10);
    expect(out).toHaveLength(3);
  });

  test('approaches the steady-state value', () => {
    const series = Array.from({ length: 50 }, () => 100);
    series[0] = 0;
    const out = registry.exponentialSmooth(series, 0.3);
    expect(out[out.length - 1]).toBeGreaterThan(99);
  });
});

describe('detectLevelShift (CUSUM)', () => {
  test('detects upward step change', () => {
    const stable = Array.from({ length: 20 }, () => 5 + (Math.random() - 0.5) * 0.5);
    const shifted = Array.from({ length: 10 }, () => 15);
    const series = [...stable, ...shifted];
    const r = registry.detectLevelShift(series);
    expect(r).not.toBeNull();
    expect(r.direction).toBe('up');
    expect(r.index).toBeGreaterThanOrEqual(20);
  });

  test('series with same mean stays in control', () => {
    // Reference window has noise of σ≈1; later points stay in the same noise.
    // With H=5σ, the algorithm should not flag.
    const stable = Array.from({ length: 30 }, (_, i) => 50 + (i % 2 === 0 ? 1 : -1));
    // Reference variance is non-zero, later values inside reference range.
    const shift = registry.detectLevelShift(stable);
    expect(shift).toBeNull();
  });

  test('returns null for too-short series', () => {
    expect(registry.detectLevelShift([1, 2, 3])).toBeNull();
  });
});

describe('forecast', () => {
  test('produces horizon points with confidence band', () => {
    const f = registry.forecast([1, 2, 3, 4, 5, 6, 7], { horizon: 3 });
    expect(f.points).toHaveLength(3);
    expect(f.r2).toBeCloseTo(1, 6);
    for (const p of f.points) {
      expect(p.lower95).toBeLessThanOrEqual(p.forecast);
      expect(p.upper95).toBeGreaterThanOrEqual(p.forecast);
    }
  });

  test('returns null when sample too small', () => {
    expect(registry.forecast([1, 2])).toBeNull();
  });
});

describe('TrendForecastService.forecastIndicator', () => {
  const { createTrendForecastService } = require('../services/quality/trendForecast.service');

  test('handles too-few-points gracefully', async () => {
    const measurementModel = {
      find() {
        return {
          sort() {
            return { lean: async () => [{ value: 1, measurementDate: new Date() }] };
          },
        };
      },
    };
    const svc = createTrendForecastService({ measurementModel });
    const result = await svc.forecastIndicator('507f1f77bcf86cd799439011');
    expect(result.error).toBe('INSUFFICIENT_DATA');
  });

  test('forecasts when enough data is present', async () => {
    const measurementModel = {
      find() {
        return {
          sort() {
            return {
              lean: async () =>
                Array.from({ length: 12 }, (_, i) => ({
                  value: i + 1,
                  measurementDate: new Date(2026, i, 1),
                })),
            };
          },
        };
      },
    };
    const svc = createTrendForecastService({ measurementModel });
    const result = await svc.forecastIndicator('507f1f77bcf86cd799439011', { horizon: 4 });
    expect(result.sampleSize).toBe(12);
    expect(result.forecast.points).toHaveLength(4);
  });

  test('rejects when no model wired', async () => {
    const { createTrendForecastService: c } = require('../services/quality/trendForecast.service');
    const svc = c({});
    await expect(svc.forecastIndicator('x')).rejects.toMatchObject({ code: 'NOT_WIRED' });
  });
});

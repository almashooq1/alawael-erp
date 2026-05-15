'use strict';

const registry = require('../config/benchmark.registry');
const { createBenchmarkService } = require('../services/quality/benchmark.service');

describe('benchmark registry', () => {
  test('every benchmark has the required fields', () => {
    for (const b of registry.BENCHMARKS) {
      expect(b.metricCode).toBeTruthy();
      expect(b.direction).toMatch(/higher|lower/);
      expect(typeof b.industryMedian).toBe('number');
      expect(typeof b.topQuartile).toBe('number');
      expect(typeof b.worldClass).toBe('number');
    }
  });

  test('classify — higher-is-better metric: 96% hand-hygiene = world_class', () => {
    const r = registry.classify('hand_hygiene_compliance', 96);
    expect(r.band).toBe('world_class');
    expect(r.percentile).toBe(95);
  });

  test('classify — higher-is-better metric: 85% hand-hygiene = top_quartile', () => {
    expect(registry.classify('hand_hygiene_compliance', 85).band).toBe('top_quartile');
  });

  test('classify — lower-is-better metric: 1.0 fall/1000 = world_class', () => {
    expect(registry.classify('falls_per_1000_patient_days', 1.0).band).toBe('world_class');
  });

  test('classify — lower-is-better metric: 8.0 falls/1000 = below_median', () => {
    expect(registry.classify('falls_per_1000_patient_days', 8.0).band).toBe('below_median');
  });

  test('classify — unknown metric returns null', () => {
    expect(registry.classify('nonsense', 10)).toBeNull();
  });

  test('classify — null observed returns unknown band', () => {
    expect(registry.classify('hand_hygiene_compliance', null).band).toBe('unknown');
  });
});

describe('BenchmarkService.compare', () => {
  test('aggregates summary tally across multiple metrics', () => {
    const svc = createBenchmarkService({});
    const r = svc.compare({
      hand_hygiene_compliance: 96,
      falls_per_1000_patient_days: 4,
      patient_satisfaction_nps: 60,
      // medication_error_rate not supplied → unknown
    });
    expect(r.rows.length).toBe(registry.BENCHMARKS.length);
    expect(r.summary.world_class).toBeGreaterThan(0);
    expect(r.summary.unknown).toBeGreaterThan(0);
    expect(r.bandLabels.world_class.nameAr).toBe('مستوى عالمي');
  });
});

describe('BenchmarkService.list', () => {
  test('lists all benchmarks', () => {
    const svc = createBenchmarkService({});
    expect(svc.list().length).toBeGreaterThanOrEqual(10);
  });
});

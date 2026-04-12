'use strict';

jest.mock('../../models/DddMetricsCollector', () => ({
  DDDMetricEntry: {},
  METRIC_TYPES: ['item1'],

}));

const svc = require('../../services/dddMetricsCollector');

describe('dddMetricsCollector service', () => {
  test('METRIC_TYPES is an array', () => { expect(Array.isArray(svc.METRIC_TYPES)).toBe(true); });
  test('incrementCounter resolves', async () => { await expect(svc.incrementCounter()).resolves.not.toThrow(); });
  test('setGauge resolves', async () => { await expect(svc.setGauge()).resolves.not.toThrow(); });
  test('recordHistogram resolves', async () => { await expect(svc.recordHistogram()).resolves.not.toThrow(); });
  test('recordTimer resolves', async () => { await expect(svc.recordTimer()).resolves.not.toThrow(); });
  test('recordMetric resolves', async () => { await expect(svc.recordMetric()).resolves.not.toThrow(); });
  test('flushBuffer resolves', async () => { await expect(svc.flushBuffer()).resolves.not.toThrow(); });
  test('getPrometheusOutput resolves', async () => { await expect(svc.getPrometheusOutput()).resolves.not.toThrow(); });
  test('queryMetrics resolves', async () => { await expect(svc.queryMetrics()).resolves.not.toThrow(); });
  test('getMetricsDashboard returns health object', async () => {
    const d = await svc.getMetricsDashboard();
    expect(d).toHaveProperty('status', 'healthy');
    expect(d).toHaveProperty('timestamp');
  });
});

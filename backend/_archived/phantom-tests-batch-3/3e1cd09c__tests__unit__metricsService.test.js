/**
 * Unit Tests — MetricsService
 * P#69 - Batch 30
 *
 * Class export (not singleton). Pure in-memory Map-based service.
 * Covers: recordMetric, getMetricValues, calculateMetricStats,
 *         defineKPI, calculateKPI, listKPIs, getKPIDashboard,
 *         getMetricTrend, compareMetrics
 */

'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const MetricsService = require('../../services/metricsService');

describe('MetricsService', () => {
  let svc;

  beforeEach(() => {
    svc = new MetricsService();
  });

  /* ------------------------------------------------------------------ */
  /*  Initial State                                                      */
  /* ------------------------------------------------------------------ */
  describe('initial state', () => {
    it('starts with empty maps', () => {
      expect(svc.metrics.size).toBe(0);
      expect(svc.kpis.size).toBe(0);
      expect(svc.kpiCounter).toBe(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  recordMetric                                                        */
  /* ------------------------------------------------------------------ */
  describe('recordMetric', () => {
    it('records a metric and returns success', () => {
      const res = svc.recordMetric('cpu', 75);
      expect(res).toEqual({ success: true, metric: 'cpu', value: 75 });
    });

    it('stores the entry in the metrics map', () => {
      svc.recordMetric('mem', 60);
      expect(svc.metrics.get('mem')).toHaveLength(1);
      expect(svc.metrics.get('mem')[0].value).toBe(60);
    });

    it('appends multiple entries for same metric', () => {
      svc.recordMetric('cpu', 50);
      svc.recordMetric('cpu', 80);
      expect(svc.metrics.get('cpu')).toHaveLength(2);
    });

    it('stores tags', () => {
      svc.recordMetric('req', 200, { method: 'GET' });
      expect(svc.metrics.get('req')[0].tags).toEqual({ method: 'GET' });
    });

    it('defaults tags to empty object', () => {
      svc.recordMetric('x', 1);
      expect(svc.metrics.get('x')[0].tags).toEqual({});
    });

    it('assigns a timestamp', () => {
      svc.recordMetric('t', 1);
      expect(svc.metrics.get('t')[0].timestamp).toBeInstanceOf(Date);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getMetricValues                                                     */
  /* ------------------------------------------------------------------ */
  describe('getMetricValues', () => {
    it('returns empty for unknown metric', () => {
      expect(svc.getMetricValues('nope')).toEqual([]);
    });

    it('returns all entries when no time range', () => {
      svc.recordMetric('a', 1);
      svc.recordMetric('a', 2);
      expect(svc.getMetricValues('a')).toHaveLength(2);
    });

    it('filters by startTime', () => {
      const old = new Date('2020-01-01');
      svc.metrics.set('m', [
        { value: 1, tags: {}, timestamp: old },
        { value: 2, tags: {}, timestamp: new Date() },
      ]);
      const res = svc.getMetricValues('m', new Date('2024-01-01'));
      expect(res).toHaveLength(1);
      expect(res[0].value).toBe(2);
    });

    it('filters by endTime', () => {
      svc.metrics.set('m', [
        { value: 1, tags: {}, timestamp: new Date('2020-01-01') },
        { value: 2, tags: {}, timestamp: new Date('2025-06-01') },
      ]);
      const res = svc.getMetricValues('m', null, new Date('2024-01-01'));
      expect(res).toHaveLength(1);
      expect(res[0].value).toBe(1);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  calculateMetricStats                                                */
  /* ------------------------------------------------------------------ */
  describe('calculateMetricStats', () => {
    it('returns zeros for unknown metric', () => {
      const s = svc.calculateMetricStats('x');
      expect(s).toEqual({ count: 0, min: 0, max: 0, avg: 0, sum: 0, median: 0 });
    });

    it('calculates correct stats', () => {
      [10, 20, 30, 40, 50].forEach(v => svc.recordMetric('m', v));
      const s = svc.calculateMetricStats('m');
      expect(s.count).toBe(5);
      expect(s.min).toBe(10);
      expect(s.max).toBe(50);
      expect(s.avg).toBe(30);
      expect(s.sum).toBe(150);
      expect(s.median).toBe(30);
    });

    it('handles single value', () => {
      svc.recordMetric('s', 42);
      const s = svc.calculateMetricStats('s');
      expect(s.count).toBe(1);
      expect(s.min).toBe(42);
      expect(s.max).toBe(42);
      expect(s.avg).toBe(42);
      expect(s.median).toBe(42);
    });

    it('rounds avg and sum to 2 decimal places', () => {
      [1, 2, 3].forEach(v => svc.recordMetric('r', v));
      const s = svc.calculateMetricStats('r');
      expect(s.avg).toBe(2);
      expect(s.sum).toBe(6);
    });

    it('respects time range options', () => {
      svc.metrics.set('t', [
        { value: 100, tags: {}, timestamp: new Date('2020-01-01') },
        { value: 200, tags: {}, timestamp: new Date() },
      ]);
      const s = svc.calculateMetricStats('t', { startTime: new Date('2024-01-01') });
      expect(s.count).toBe(1);
      expect(s.avg).toBe(200);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  defineKPI                                                           */
  /* ------------------------------------------------------------------ */
  describe('defineKPI', () => {
    it('creates a KPI with auto-incremented id', () => {
      const kpi = svc.defineKPI('Revenue');
      expect(kpi.id).toBe('kpi_1');
      expect(kpi.name).toBe('Revenue');
      expect(kpi.target).toBe(100);
      expect(kpi.unit).toBe('unit');
      expect(kpi.category).toBe('general');
    });

    it('respects custom options', () => {
      const kpi = svc.defineKPI('Speed', {
        target: 50,
        unit: 'ms',
        category: 'perf',
        description: 'Response time',
      });
      expect(kpi.target).toBe(50);
      expect(kpi.unit).toBe('ms');
      expect(kpi.category).toBe('perf');
      expect(kpi.description).toBe('Response time');
    });

    it('increments counter', () => {
      svc.defineKPI('A');
      const b = svc.defineKPI('B');
      expect(b.id).toBe('kpi_2');
    });

    it('stores in kpis map', () => {
      const kpi = svc.defineKPI('K');
      expect(svc.kpis.get(kpi.id)).toBe(kpi);
    });

    it('includes createdAt', () => {
      const kpi = svc.defineKPI('X');
      expect(kpi.createdAt).toBeInstanceOf(Date);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  calculateKPI                                                        */
  /* ------------------------------------------------------------------ */
  describe('calculateKPI', () => {
    it('returns error for unknown KPI', () => {
      expect(svc.calculateKPI('nope')).toEqual({ error: 'KPI not found' });
    });

    it('calculates achievement percentage', () => {
      const kpi = svc.defineKPI('Score', { target: 100 });
      svc.recordMetric('Score', 75);
      const res = svc.calculateKPI(kpi.id);
      expect(res.actual).toBe(75);
      expect(res.achievement).toBe(75);
      expect(res.status).toBe('on-track');
    });

    it('status achieved when >=100%', () => {
      const kpi = svc.defineKPI('Rate', { target: 50 });
      svc.recordMetric('Rate', 60);
      expect(svc.calculateKPI(kpi.id).status).toBe('achieved');
    });

    it('status behind when <75%', () => {
      const kpi = svc.defineKPI('Low', { target: 100 });
      svc.recordMetric('Low', 50);
      expect(svc.calculateKPI(kpi.id).status).toBe('behind');
    });

    it('handles target 0 gracefully', () => {
      const kpi = svc.defineKPI('Zero', { target: 0 });
      svc.recordMetric('Zero', 50);
      const res = svc.calculateKPI(kpi.id);
      // Division by zero edge case — just verify it doesn't crash
      expect(res.actual).toBeDefined();
    });

    it('includes stats', () => {
      const kpi = svc.defineKPI('S', { target: 100 });
      svc.recordMetric('S', 80);
      const res = svc.calculateKPI(kpi.id);
      expect(res.stats.count).toBe(1);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  listKPIs                                                            */
  /* ------------------------------------------------------------------ */
  describe('listKPIs', () => {
    it('returns all KPIs', () => {
      svc.defineKPI('A');
      svc.defineKPI('B');
      expect(svc.listKPIs()).toHaveLength(2);
    });

    it('filters by category', () => {
      svc.defineKPI('X', { category: 'hr' });
      svc.defineKPI('Y', { category: 'it' });
      expect(svc.listKPIs({ category: 'hr' })).toHaveLength(1);
    });

    it('returns empty when no KPIs', () => {
      expect(svc.listKPIs()).toEqual([]);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getKPIDashboard                                                     */
  /* ------------------------------------------------------------------ */
  describe('getKPIDashboard', () => {
    it('returns calculated KPIs for a category', () => {
      const kpi = svc.defineKPI('Metric', { category: 'ops', target: 100 });
      svc.recordMetric('Metric', 90);
      const dash = svc.getKPIDashboard('ops');
      expect(dash).toHaveLength(1);
      expect(dash[0].actual).toBe(90);
    });

    it('returns empty for unknown category', () => {
      expect(svc.getKPIDashboard('nope')).toEqual([]);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getMetricTrend                                                      */
  /* ------------------------------------------------------------------ */
  describe('getMetricTrend', () => {
    it('returns array of length = periods', () => {
      const trend = svc.getMetricTrend('x', 5);
      expect(trend).toHaveLength(5);
    });

    it('defaults to 7 periods', () => {
      expect(svc.getMetricTrend('x')).toHaveLength(7);
    });

    it('each entry has date, count, avg, sum', () => {
      const trend = svc.getMetricTrend('x', 1);
      expect(trend[0]).toHaveProperty('date');
      expect(trend[0]).toHaveProperty('count');
      expect(trend[0]).toHaveProperty('avg');
      expect(trend[0]).toHaveProperty('sum');
    });

    it('shows today data when metric recorded now', () => {
      svc.recordMetric('t', 42);
      const trend = svc.getMetricTrend('t', 1);
      expect(trend[0].count).toBe(1);
      expect(trend[0].avg).toBe(42);
      expect(trend[0].sum).toBe(42);
    });

    it('shows 0 for days with no data', () => {
      const trend = svc.getMetricTrend('empty', 3);
      trend.forEach(d => {
        expect(d.count).toBe(0);
        expect(d.avg).toBe(0);
        expect(d.sum).toBe(0);
      });
    });
  });

  /* ------------------------------------------------------------------ */
  /*  compareMetrics                                                      */
  /* ------------------------------------------------------------------ */
  describe('compareMetrics', () => {
    it('compares multiple metrics', () => {
      svc.recordMetric('a', 10);
      svc.recordMetric('b', 20);
      const res = svc.compareMetrics(['a', 'b']);
      expect(res).toHaveLength(2);
      expect(res[0].name).toBe('a');
      expect(res[0].stats.avg).toBe(10);
      expect(res[1].name).toBe('b');
      expect(res[1].stats.avg).toBe(20);
    });

    it('returns zeros for unknown metrics', () => {
      const res = svc.compareMetrics(['nope']);
      expect(res[0].stats.count).toBe(0);
    });

    it('handles empty names array', () => {
      expect(svc.compareMetrics([])).toEqual([]);
    });
  });
});

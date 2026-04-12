/**
 * Unit tests — analyticsDashboard.js
 * Singleton EventEmitter class (in-memory). No DB mocks needed.
 */
'use strict';

let service;

beforeEach(() => {
  jest.isolateModules(() => {
    service = require('../../services/analyticsDashboard');
  });
});

describe('AnalyticsDashboard', () => {
  /* ────────────────────────────────────────────────────────────── */
  describe('recordAPICall', () => {
    it('pushes call with all fields', () => {
      service.recordAPICall('/api/users', 'GET', 50, 200, 'U1');
      expect(service.metrics.apiCalls).toHaveLength(1);
      const c = service.metrics.apiCalls[0];
      expect(c.endpoint).toBe('/api/users');
      expect(c.method).toBe('GET');
      expect(c.duration).toBe(50);
      expect(c.statusCode).toBe(200);
      expect(c.userId).toBe('U1');
      expect(c.success).toBe(true);
    });

    it('marks 4xx as failure', () => {
      service.recordAPICall('/api/x', 'POST', 10, 404);
      expect(service.metrics.apiCalls[0].success).toBe(false);
    });

    it('defaults userId to null', () => {
      service.recordAPICall('/api/x', 'GET', 10, 200);
      expect(service.metrics.apiCalls[0].userId).toBeNull();
    });

    it('trims to 10000 entries', () => {
      for (let i = 0; i < 10001; i++) {
        service.metrics.apiCalls.push({ timestamp: new Date().toISOString() });
      }
      service.recordAPICall('/api/x', 'GET', 1, 200);
      expect(service.metrics.apiCalls.length).toBeLessThanOrEqual(10001);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('recordUserActivity', () => {
    it('records activity with defaults', () => {
      service.recordUserActivity('U1', 'LOGIN');
      expect(service.metrics.userActivity).toHaveLength(1);
      expect(service.metrics.userActivity[0].details).toEqual({});
    });

    it('stores provided details', () => {
      service.recordUserActivity('U1', 'EDIT', { page: 'dashboard' });
      expect(service.metrics.userActivity[0].details.page).toBe('dashboard');
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('recordError', () => {
    it('records error with sanitized message', () => {
      service.recordError(new Error('secret'), { route: '/api/x' });
      expect(service.metrics.errors).toHaveLength(1);
      expect(service.metrics.errors[0].message).toBe('خطأ داخلي');
      expect(service.metrics.errors[0].context.route).toBe('/api/x');
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('recordPerformance', () => {
    it('pushes metric entry', () => {
      service.recordPerformance('cpu', 85);
      expect(service.metrics.performance).toHaveLength(1);
      expect(service.metrics.performance[0].metric).toBe('cpu');
      expect(service.metrics.performance[0].value).toBe(85);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('updateBusinessMetrics', () => {
    it('sets key with value and timestamp', () => {
      service.updateBusinessMetrics('revenue', 50000);
      expect(service.metrics.businessMetrics.revenue.value).toBe(50000);
      expect(service.metrics.businessMetrics.revenue.updatedAt).toBeDefined();
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getTimeRangeMs', () => {
    it('returns correct ms for known ranges', () => {
      expect(service.getTimeRangeMs('minute')).toBe(60000);
      expect(service.getTimeRangeMs('hour')).toBe(3600000);
      expect(service.getTimeRangeMs('day')).toBe(86400000);
      expect(service.getTimeRangeMs('week')).toBe(604800000);
      expect(service.getTimeRangeMs('month')).toBe(2592000000);
    });

    it('defaults to hour for unknown range', () => {
      expect(service.getTimeRangeMs('unknown')).toBe(3600000);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getDashboard', () => {
    it('returns summary with zero when empty', () => {
      const d = service.getDashboard('hour');
      expect(d.timeRange).toBe('hour');
      expect(d.summary.totalRequests).toBe(0);
      expect(d.summary.avgResponseTime).toBe('0.00ms');
      expect(d.summary.errorRate).toBe('0.00%');
      expect(d.summary.throughput).toContain('req/s');
    });

    it('includes recent calls in summary', () => {
      service.recordAPICall('/a', 'GET', 100, 200);
      service.recordAPICall('/b', 'POST', 200, 500);
      const d = service.getDashboard('hour');
      expect(d.summary.totalRequests).toBe(2);
      expect(d.summary.successfulRequests).toBe(1);
      expect(d.summary.failedRequests).toBe(1);
    });

    it('slices errors to last 10', () => {
      for (let i = 0; i < 15; i++) service.recordError(new Error('e'));
      const d = service.getDashboard('hour');
      expect(d.errors.length).toBeLessThanOrEqual(10);
    });

    it('includes businessMetrics', () => {
      service.updateBusinessMetrics('k', 1);
      const d = service.getDashboard('hour');
      expect(d.businessMetrics.k.value).toBe(1);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getEndpointStats', () => {
    it('aggregates calls by endpoint', () => {
      const calls = [
        { endpoint: '/a', duration: 100, success: true },
        { endpoint: '/a', duration: 200, success: false },
        { endpoint: '/b', duration: 50, success: true },
      ];
      const stats = service.getEndpointStats(calls);
      expect(stats['/a'].calls).toBe(2);
      expect(stats['/a'].errorCount).toBe(1);
      expect(stats['/a'].avgDuration).toBe('150.00');
      expect(stats['/b'].calls).toBe(1);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getPerformanceStats', () => {
    it('returns min/max/avg/count', () => {
      service.recordPerformance('cpu', 50);
      service.recordPerformance('cpu', 100);
      const stats = service.getPerformanceStats('hour');
      expect(stats.cpu.min).toBe(50);
      expect(stats.cpu.max).toBe(100);
      expect(stats.cpu.avg).toBe('75.00');
      expect(stats.cpu.count).toBe(2);
    });

    it('returns empty for no data', () => {
      const stats = service.getPerformanceStats('hour');
      expect(Object.keys(stats)).toHaveLength(0);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getHealthRecommendations', () => {
    it('returns empty recommendations when healthy', () => {
      const r = service.getHealthRecommendations();
      expect(r.recommendations).toEqual([]);
      expect(r.generatedAt).toBeDefined();
    });

    it('warns on high error rate', () => {
      for (let i = 0; i < 100; i++) {
        service.recordAPICall('/a', 'GET', 10, i < 10 ? 500 : 200);
      }
      const r = service.getHealthRecommendations();
      const errRec = r.recommendations.find(x => x.message.includes('error rate'));
      expect(errRec).toBeDefined();
    });

    it('warns on slow response times', () => {
      service.recordAPICall('/a', 'GET', 600, 200);
      const r = service.getHealthRecommendations();
      const slowRec = r.recommendations.find(x => x.message.includes('Slow'));
      expect(slowRec).toBeDefined();
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('exportMetrics', () => {
    it('returns json by default', () => {
      const data = service.exportMetrics();
      expect(data.exportedAt).toBeDefined();
      expect(data.systemUptime).toContain('seconds');
      expect(data.metrics).toBeDefined();
    });

    it('returns csv string', () => {
      service.recordAPICall('/a', 'GET', 10, 200);
      service.recordError(new Error('e'));
      const csv = service.exportMetrics('csv');
      expect(csv).toContain('Timestamp,Type,Value,Details');
      expect(csv).toContain('API_CALL');
      expect(csv).toContain('ERROR');
    });
  });
});

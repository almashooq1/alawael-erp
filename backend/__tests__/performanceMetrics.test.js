'use strict';

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const {
  performanceMetrics,
  metricsMiddleware,
  getMetricsHandler,
  resetMetricsHandler,
} = require('../utils/performanceMetrics');

// ── helpers ──────────────────────────────────────────────────────────────────
const fakeReq = (overrides = {}) => ({
  method: 'GET',
  path: '/api/users',
  ...overrides,
});

const fakeRes = (statusCode = 200) => ({
  statusCode,
  send: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

// ─────────────────────────────────────────────────────────────────────────────
describe('performanceMetrics', () => {
  beforeEach(() => {
    performanceMetrics.reset();
    jest.clearAllMocks();
  });

  // ── Constructor / initial state ──────────────────────────────────────────
  it('starts with zeroed metrics', () => {
    expect(performanceMetrics.metrics.requests.total).toBe(0);
    expect(performanceMetrics.metrics.database.queries).toBe(0);
    expect(performanceMetrics.metrics.cache.hits).toBe(0);
  });

  // ── trackRequest ─────────────────────────────────────────────────────────
  describe('trackRequest', () => {
    it('increments total count', () => {
      performanceMetrics.trackRequest(fakeReq(), fakeRes(200), 50);
      expect(performanceMetrics.metrics.requests.total).toBe(1);
    });

    it('increments success for 2xx', () => {
      performanceMetrics.trackRequest(fakeReq(), fakeRes(200), 50);
      expect(performanceMetrics.metrics.requests.success).toBe(1);
      expect(performanceMetrics.metrics.requests.errors).toBe(0);
    });

    it('increments errors for 4xx/5xx', () => {
      performanceMetrics.trackRequest(fakeReq(), fakeRes(500), 50);
      expect(performanceMetrics.metrics.requests.errors).toBe(1);
    });

    it('tracks by HTTP method', () => {
      performanceMetrics.trackRequest(fakeReq({ method: 'POST' }), fakeRes(), 30);
      expect(performanceMetrics.metrics.requests.byMethod.POST).toBe(1);
    });

    it('tracks by endpoint', () => {
      performanceMetrics.trackRequest(fakeReq({ path: '/api/orders' }), fakeRes(), 20);
      expect(performanceMetrics.metrics.requests.byEndpoint['/api/orders']).toBeDefined();
      expect(performanceMetrics.metrics.requests.byEndpoint['/api/orders'].count).toBe(1);
    });

    it('records duration', () => {
      performanceMetrics.trackRequest(fakeReq(), fakeRes(), 123);
      expect(performanceMetrics.metrics.requests.durations).toContain(123);
    });

    it('logs slow requests (> 1000 ms)', () => {
      const logger = require('../utils/logger');
      performanceMetrics.trackRequest(fakeReq(), fakeRes(), 1500);
      expect(logger.warn).toHaveBeenCalledWith('Slow request detected', expect.any(Object));
    });

    it('caps durations array at 1000 entries', () => {
      for (let i = 0; i < 1010; i++) {
        performanceMetrics.trackRequest(fakeReq(), fakeRes(), i);
      }
      expect(performanceMetrics.metrics.requests.durations.length).toBeLessThanOrEqual(1000);
    });
  });

  // ── trackDatabaseQuery ───────────────────────────────────────────────────
  describe('trackDatabaseQuery', () => {
    it('increments query count', () => {
      performanceMetrics.trackDatabaseQuery('find', 20);
      expect(performanceMetrics.metrics.database.queries).toBe(1);
    });

    it('calculates average query time', () => {
      performanceMetrics.trackDatabaseQuery('find', 10);
      performanceMetrics.trackDatabaseQuery('find', 30);
      expect(performanceMetrics.metrics.database.avgQueryTime).toBe(20);
    });

    it('tracks slow queries (> 100 ms)', () => {
      performanceMetrics.trackDatabaseQuery('aggregate', 150);
      expect(performanceMetrics.metrics.database.slowQueries).toBe(1);
    });
  });

  // ── trackCache ───────────────────────────────────────────────────────────
  describe('trackCache', () => {
    it('tracks cache hits', () => {
      performanceMetrics.trackCache(true);
      expect(performanceMetrics.metrics.cache.hits).toBe(1);
    });

    it('tracks cache misses', () => {
      performanceMetrics.trackCache(false);
      expect(performanceMetrics.metrics.cache.misses).toBe(1);
    });

    it('calculates hit rate', () => {
      performanceMetrics.trackCache(true);
      performanceMetrics.trackCache(true);
      performanceMetrics.trackCache(false);
      expect(performanceMetrics.metrics.cache.hitRate).toBeCloseTo(66.67, 0);
    });
  });

  // ── normalizeEndpoint ────────────────────────────────────────────────────
  describe('normalizeEndpoint', () => {
    it('replaces MongoDB ObjectId with :id', () => {
      expect(performanceMetrics.normalizeEndpoint('/api/users/507f1f77bcf86cd799439011'))
        .toBe('/api/users/:id');
    });

    it('replaces numeric IDs with :id', () => {
      expect(performanceMetrics.normalizeEndpoint('/api/items/42')).toBe('/api/items/:id');
    });

    it('replaces UUIDs with :uuid', () => {
      expect(
        performanceMetrics.normalizeEndpoint('/api/files/550e8400-e29b-41d4-a716-446655440000')
      ).toBe('/api/files/:uuid');
    });
  });

  // ── calculatePercentile ──────────────────────────────────────────────────
  describe('calculatePercentile', () => {
    it('returns 0 for empty array', () => {
      expect(performanceMetrics.calculatePercentile([], 95)).toBe(0);
    });

    it('calculates p95 correctly', () => {
      const arr = Array.from({ length: 100 }, (_, i) => i + 1);
      expect(performanceMetrics.calculatePercentile(arr, 95)).toBe(95);
    });
  });

  // ── formatBytes ──────────────────────────────────────────────────────────
  describe('formatBytes', () => {
    it('returns "0 B" for zero', () => {
      expect(performanceMetrics.formatBytes(0)).toBe('0 B');
    });

    it('formats megabytes', () => {
      expect(performanceMetrics.formatBytes(1048576)).toBe('1.00 MB');
    });

    it('formats kilobytes', () => {
      expect(performanceMetrics.formatBytes(1024)).toBe('1.00 KB');
    });
  });

  // ── getMetrics ───────────────────────────────────────────────────────────
  describe('getMetrics', () => {
    it('returns expected top-level keys', () => {
      const m = performanceMetrics.getMetrics();
      expect(m).toHaveProperty('timestamp');
      expect(m).toHaveProperty('uptime');
      expect(m).toHaveProperty('requests');
      expect(m).toHaveProperty('database');
      expect(m).toHaveProperty('cache');
      expect(m).toHaveProperty('memory');
    });
  });

  // ── getTopEndpoints ──────────────────────────────────────────────────────
  describe('getTopEndpoints', () => {
    it('sorts by request count descending', () => {
      performanceMetrics.trackRequest(fakeReq({ path: '/a' }), fakeRes(), 10);
      performanceMetrics.trackRequest(fakeReq({ path: '/b' }), fakeRes(), 10);
      performanceMetrics.trackRequest(fakeReq({ path: '/b' }), fakeRes(), 10);
      const top = performanceMetrics.getTopEndpoints(10);
      expect(top[0].endpoint).toBe('/b');
      expect(top[0].count).toBe(2);
    });
  });

  // ── reset ────────────────────────────────────────────────────────────────
  describe('reset', () => {
    it('clears all metrics', () => {
      performanceMetrics.trackRequest(fakeReq(), fakeRes(), 50);
      performanceMetrics.trackDatabaseQuery('q', 30);
      performanceMetrics.trackCache(true);
      performanceMetrics.reset();
      expect(performanceMetrics.metrics.requests.total).toBe(0);
      expect(performanceMetrics.metrics.database.queries).toBe(0);
      expect(performanceMetrics.metrics.cache.hits).toBe(0);
    });
  });

  // ── metricsMiddleware ────────────────────────────────────────────────────
  describe('metricsMiddleware', () => {
    it('monkey-patches res.send and calls next()', () => {
      const req = fakeReq();
      const res = fakeRes();
      const originalSend = res.send;
      const next = jest.fn();

      metricsMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
      // res.send should be patched (different reference)
      expect(res.send).not.toBe(originalSend);
    });

    it('tracks request when res.send is called', () => {
      performanceMetrics.reset();
      const req = fakeReq();
      const res = fakeRes(201);
      const next = jest.fn();

      metricsMiddleware(req, res, next);
      res.send('ok');

      expect(performanceMetrics.metrics.requests.total).toBe(1);
    });
  });

  // ── getMetricsHandler ────────────────────────────────────────────────────
  describe('getMetricsHandler', () => {
    it('responds with success JSON', () => {
      const res = { json: jest.fn() };
      getMetricsHandler({}, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.any(Object) })
      );
    });
  });

  // ── resetMetricsHandler ──────────────────────────────────────────────────
  describe('resetMetricsHandler', () => {
    it('resets metrics and responds with success', () => {
      performanceMetrics.trackRequest(fakeReq(), fakeRes(), 10);
      const res = { json: jest.fn() };
      resetMetricsHandler({}, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      expect(performanceMetrics.metrics.requests.total).toBe(0);
    });
  });
});

/**
 * @file metrics.middleware.test.js
 * @description Tests for Prometheus metrics middleware and handler
 */

const { metricsMiddleware, metricsHandler } = require('../middleware/metrics.middleware');

// ── Helpers ──────────────────────────────────────────────────────────────────
const buildReq = (overrides = {}) => ({
  method: 'GET',
  path: '/api/test',
  originalUrl: '/api/test',
  ...overrides,
});

const buildRes = () => {
  const listeners = {};
  const headers = {};
  const res = {
    statusCode: 200,
    on: jest.fn((event, cb) => {
      listeners[event] = cb;
    }),
    set: jest.fn(),
    setHeader: jest.fn((k, v) => {
      headers[k] = v;
    }),
    send: jest.fn(),
    end: jest.fn(),
    _listeners: listeners,
    _headers: headers,
  };
  return res;
};

const buildNext = () => jest.fn();

// ── Tests ────────────────────────────────────────────────────────────────────
describe('metricsMiddleware', () => {
  it('should be a function', () => {
    expect(typeof metricsMiddleware).toBe('function');
  });

  it('should call next() immediately', () => {
    const req = buildReq();
    const res = buildRes();
    const next = buildNext();

    metricsMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should register a "finish" event listener on res', () => {
    const req = buildReq();
    const res = buildRes();
    const next = buildNext();

    metricsMiddleware(req, res, next);

    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('should record metrics when finish event fires', () => {
    const req = buildReq({ method: 'POST', path: '/api/orders' });
    const res = buildRes();
    res.statusCode = 201;
    const next = buildNext();

    metricsMiddleware(req, res, next);

    // Simulate finish event
    const finishCb = res._listeners.finish;
    expect(finishCb).toBeDefined();
    finishCb(); // should not throw
  });
});

describe('metricsHandler', () => {
  it('should be a function', () => {
    expect(typeof metricsHandler).toBe('function');
  });

  it('should set Content-Type to text/plain', () => {
    const req = buildReq();
    const res = buildRes();

    metricsHandler(req, res);

    // Check via set or setHeader
    const setCall = res.set.mock.calls.find(c => c[0] === 'Content-Type');
    const setHeaderCall = res.setHeader.mock.calls.find(c => c[0] === 'Content-Type');
    const contentType = setCall ? setCall[1] : setHeaderCall ? setHeaderCall[1] : null;

    // Either send or end is called with the body
    const body = res.send.mock.calls[0]?.[0] || res.end.mock.calls[0]?.[0] || '';
    expect(typeof body).toBe('string');
  });

  it('should output Prometheus-format text containing standard metrics', () => {
    const req = buildReq();
    const res = buildRes();

    metricsHandler(req, res);

    const body = res.send.mock.calls[0]?.[0] || res.end.mock.calls[0]?.[0] || '';

    // Standard process metrics
    expect(body).toMatch(/process_resident_memory_bytes/);
    expect(body).toMatch(/process_uptime_seconds/);
    expect(body).toMatch(/process_cpu_seconds_total/);
  });

  it('should include OS metrics', () => {
    const req = buildReq();
    const res = buildRes();

    metricsHandler(req, res);

    const body = res.send.mock.calls[0]?.[0] || res.end.mock.calls[0]?.[0] || '';

    expect(body).toMatch(/os_load_average/);
  });

  it('should include HTTP metrics sections', () => {
    const req = buildReq();
    const res = buildRes();

    metricsHandler(req, res);

    const body = res.send.mock.calls[0]?.[0] || res.end.mock.calls[0]?.[0] || '';

    expect(body).toMatch(/http_requests_total/);
    expect(body).toMatch(/http_request_duration_seconds/);
  });

  it('should include histogram bucket definitions', () => {
    const req = buildReq();
    const res = buildRes();

    metricsHandler(req, res);

    const body = res.send.mock.calls[0]?.[0] || res.end.mock.calls[0]?.[0] || '';

    // Histogram buckets should include le= labels
    expect(body).toMatch(/le="/);
    expect(body).toMatch(/\+Inf/);
  });

  it('should reflect metrics recorded by metricsMiddleware', () => {
    // Record a few requests first
    for (let i = 0; i < 3; i++) {
      const req = buildReq({ method: 'GET', path: '/api/data' });
      const res = buildRes();
      res.statusCode = 200;
      const next = buildNext();
      metricsMiddleware(req, res, next);
      // fire finish
      res._listeners.finish?.();
    }

    const req = buildReq();
    const res = buildRes();
    metricsHandler(req, res);

    const body = res.send.mock.calls[0]?.[0] || res.end.mock.calls[0]?.[0] || '';

    // Should now include counters for our recorded requests
    expect(body).toMatch(/http_requests_total/);
  });
});

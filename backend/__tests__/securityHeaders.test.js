/**
 * @file securityHeaders.test.js
 * @description Tests for security headers middleware (Helmet + custom)
 */

jest.mock('helmet', () => {
  const helmetFn = jest.fn((_req, _res, next) => next());
  const factory = jest.fn(() => helmetFn);
  factory._handler = helmetFn;
  return factory;
});

const securityHeaders = require('../middleware/securityHeaders');

// ── Helpers ──────────────────────────────────────────────────────────────────
const buildReq = (path = '/api/products') => ({
  path,
  originalUrl: path,
});
const buildRes = () => {
  const headers = {};
  const res = {
    setHeader: jest.fn((k, v) => { headers[k] = v; }),
    _headers: headers,
  };
  return res;
};
const buildNext = () => jest.fn();

// ── Tests ────────────────────────────────────────────────────────────────────
describe('securityHeaders middleware', () => {
  it('should be a function with arity 3', () => {
    expect(typeof securityHeaders).toBe('function');
    expect(securityHeaders.length).toBe(3);
  });

  it('should set Permissions-Policy header', () => {
    const req = buildReq();
    const res = buildRes();
    const next = buildNext();

    securityHeaders(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Permissions-Policy',
      expect.any(String)
    );
    // Verify the header includes at least standard directives
    const ppCall = res.setHeader.mock.calls.find(c => c[0] === 'Permissions-Policy');
    expect(ppCall[1]).toMatch(/camera/);
    expect(ppCall[1]).toMatch(/microphone/);
  });

  it('should add no-cache headers for /api/auth routes', () => {
    const req = buildReq('/api/auth/login');
    const res = buildRes();
    const next = buildNext();

    securityHeaders(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      expect.stringContaining('no-store')
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Pragma',
      'no-cache'
    );
  });

  it('should add no-cache headers for /api/v1/auth routes', () => {
    const req = buildReq('/api/v1/auth/register');
    const res = buildRes();
    const next = buildNext();

    securityHeaders(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      expect.stringContaining('no-store')
    );
  });

  it('should NOT add no-cache headers for non-auth routes', () => {
    const req = buildReq('/api/products');
    const res = buildRes();
    const next = buildNext();

    securityHeaders(req, res, next);

    const cacheCall = res.setHeader.mock.calls.find(
      c => c[0] === 'Cache-Control'
    );
    expect(cacheCall).toBeUndefined();
  });

  it('should delegate to helmet middleware', () => {
    const helmet = require('helmet');
    const req = buildReq();
    const res = buildRes();
    const next = buildNext();

    securityHeaders(req, res, next);

    // helmet factory is called once at module load; the inner handler is called per-request
    expect(helmet._handler).toHaveBeenCalled();
  });

  it('should call next (via helmet delegation)', () => {
    const req = buildReq();
    const res = buildRes();
    const next = buildNext();

    securityHeaders(req, res, next);

    // next is called by the mocked helmet handler
    expect(next).toHaveBeenCalled();
  });
});

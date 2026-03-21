/**
 * Tests for requestId middleware
 * @module requestId.middleware.test
 *
 * Covers:
 * - generateRequestId: returns string, correct length, uniqueness
 * - requestIdMiddleware: generates new ID, preserves client ID,
 *   sets X-Request-Id header, attaches req.id, calls next()
 */

const { generateRequestId, requestIdMiddleware } = require('../middleware/requestId.middleware');

describe('generateRequestId', () => {
  it('returns a non-empty string', () => {
    const id = generateRequestId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('returns base64url encoded string (16 bytes = ~22 chars)', () => {
    const id = generateRequestId();
    // 16 bytes → base64url → 22 chars (no padding)
    expect(id.length).toBe(22);
  });

  it('contains only base64url characters', () => {
    const id = generateRequestId();
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('generates unique IDs across 100 calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateRequestId()));
    expect(ids.size).toBe(100);
  });
});

describe('requestIdMiddleware', () => {
  function createMocks(headers = {}) {
    const req = { headers };
    const res = { setHeader: jest.fn() };
    const next = jest.fn();
    return { req, res, next };
  }

  it('generates a new ID when no X-Request-Id header', () => {
    const { req, res, next } = createMocks();
    requestIdMiddleware(req, res, next);

    expect(typeof req.id).toBe('string');
    expect(req.id.length).toBeGreaterThan(0);
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.id);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('preserves client-sent X-Request-Id header', () => {
    const { req, res, next } = createMocks({ 'x-request-id': 'client-trace-abc' });
    requestIdMiddleware(req, res, next);

    expect(req.id).toBe('client-trace-abc');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'client-trace-abc');
  });

  it('calls next() to continue chain', () => {
    const { req, res, next } = createMocks();
    requestIdMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('sets response header even when client provides ID', () => {
    const { req, res, next } = createMocks({ 'x-request-id': 'ext-id' });
    requestIdMiddleware(req, res, next);
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'ext-id');
  });

  it('different requests get different generated IDs', () => {
    const mock1 = createMocks();
    const mock2 = createMocks();
    requestIdMiddleware(mock1.req, mock1.res, mock1.next);
    requestIdMiddleware(mock2.req, mock2.res, mock2.next);
    expect(mock1.req.id).not.toBe(mock2.req.id);
  });
});

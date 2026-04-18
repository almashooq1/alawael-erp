/**
 * safe-error.test.js — contract tests for utils/safeError.
 *
 * Particularly important because:
 *   1. The pass-through-4xx branch is what surfaces RateLimitError to
 *      clients with the right statusCode/code/retryAfterMs payload.
 *   2. The Retry-After header is what lets SDKs + browsers + proxies
 *      auto-backoff without parsing JSON bodies.
 *   3. The default 500 branch must NEVER leak err.message in production.
 */

'use strict';

const safeError = require('../utils/safeError');

function mockRes() {
  const res = {
    _status: null,
    _headers: {},
    _body: null,
    status(code) {
      this._status = code;
      return this;
    },
    set(name, value) {
      this._headers[name.toLowerCase()] = value;
      return this;
    },
    json(payload) {
      this._body = payload;
      return this;
    },
  };
  return res;
}

describe('safeError', () => {
  it('passes through 4xx statusCode with shaped body', () => {
    const res = mockRes();
    const err = new Error('rate limit exceeded for gosi');
    err.statusCode = 429;
    err.code = 'RATE_LIMITED';
    err.retryAfterMs = 30_000;
    err.scope = 'provider';
    err.provider = 'gosi';

    safeError(res, err, 'test.route');

    expect(res._status).toBe(429);
    expect(res._body).toEqual({
      success: false,
      message: 'rate limit exceeded for gosi',
      code: 'RATE_LIMITED',
      retryAfterMs: 30_000,
      scope: 'provider',
      provider: 'gosi',
    });
  });

  it('sets Retry-After header (integer seconds) on 429', () => {
    const res = mockRes();
    const err = new Error('too many');
    err.statusCode = 429;
    err.retryAfterMs = 12_500; // 12.5s → should round up to 13

    safeError(res, err);

    expect(res._headers['retry-after']).toBe('13');
  });

  it('does NOT set Retry-After on non-429 4xx', () => {
    const res = mockRes();
    const err = new Error('nope');
    err.statusCode = 403;
    err.retryAfterMs = 30_000;

    safeError(res, err);

    expect(res._headers['retry-after']).toBeUndefined();
  });

  it('does NOT set Retry-After on 429 when retryAfterMs is missing', () => {
    const res = mockRes();
    const err = new Error('too many');
    err.statusCode = 429;

    safeError(res, err);

    expect(res._headers['retry-after']).toBeUndefined();
  });

  it('falls through to 500 for non-4xx errors', () => {
    const res = mockRes();
    const err = new Error('mongo unreachable');

    safeError(res, err);

    expect(res._status).toBe(500);
    expect(res._body.success).toBe(false);
  });

  it('leaks err.message in non-prod (default)', () => {
    const res = mockRes();
    const err = new Error('DETAILS FOR DEV');

    safeError(res, err);

    expect(res._body.error).toBe('DETAILS FOR DEV');
  });

  it('500 statusCode does not trigger pass-through (upper bound is <500)', () => {
    const res = mockRes();
    const err = new Error('broken');
    err.statusCode = 500; // boundary

    safeError(res, err);

    expect(res._status).toBe(500);
    // Pass-through path would have included err.code + err.statusCode.
    // Here we expect the 500 fallback body shape:
    expect(res._body).toHaveProperty('error');
    expect(res._body.code).toBeUndefined();
  });
});

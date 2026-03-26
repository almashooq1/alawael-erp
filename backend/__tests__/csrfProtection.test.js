/**
 * @file csrfProtection.test.js
 * @description Tests for CSRF protection middleware
 *
 * Source: backend/middleware/csrfProtection.js (82 lines)
 * Batch 8 — pure utility, only depends on Node built-in crypto
 */

'use strict';

// We need access to internal helpers, so we read the module's internals
// via a small trick: the module only exports csrfProtection, but
// parseCookies and generateToken are used internally.
// We test them indirectly through the middleware's behaviour.

describe('csrfProtection middleware', () => {
  let csrfProtection;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.CSRF_DISABLE;
    delete process.env.CSRF_EXCLUDE_PATHS;
    csrfProtection = require('../middleware/csrfProtection');
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ── helpers ────────────────────────────────────────────────────────────
  const mockReq = (overrides = {}) => ({
    method: 'GET',
    path: '/api/data',
    headers: {},
    ...overrides,
  });

  const mockRes = () => {
    const res = {
      _headers: {},
      _cookies: [],
      _status: null,
      _json: null,
      status(code) {
        res._status = code;
        return res;
      },
      json(data) {
        res._json = data;
        return res;
      },
      setHeader(k, v) {
        res._headers[k] = v;
      },
      cookie(name, value, opts) {
        res._cookies.push({ name, value, opts });
      },
    };
    return res;
  };

  const next = jest.fn();

  beforeEach(() => next.mockClear());

  // ═══════════════════════════════════════════════════════════════════════
  // 1. CSRF_DISABLE=true bypass
  // ═══════════════════════════════════════════════════════════════════════
  describe('disabled mode (CSRF_DISABLE=true)', () => {
    it('should call next() immediately when disabled', () => {
      process.env.CSRF_DISABLE = 'true';
      jest.resetModules();
      const mw = require('../middleware/csrfProtection');
      const req = mockReq({ method: 'POST' });
      mw(req, mockRes(), next);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 2. Excluded paths
  // ═══════════════════════════════════════════════════════════════════════
  describe('excluded paths', () => {
    it('should skip CSRF for default excluded paths', () => {
      const defaults = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/v1/auth/login',
        '/api/v1/auth/register',
        '/api/test',
        '/test-first',
        '/health',
      ];
      for (const p of defaults) {
        next.mockClear();
        csrfProtection(mockReq({ method: 'POST', path: p }), mockRes(), next);
        expect(next).toHaveBeenCalledTimes(1);
      }
    });

    it('should skip CSRF for extra env-configured paths', () => {
      process.env.CSRF_EXCLUDE_PATHS = '/webhook, /api/public';
      jest.resetModules();
      const mw = require('../middleware/csrfProtection');
      const res = mockRes();
      mw(mockReq({ method: 'POST', path: '/webhook' }), res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 3. Safe methods (GET, HEAD, OPTIONS) — token provisioning
  // ═══════════════════════════════════════════════════════════════════════
  describe('safe methods — token provisioning', () => {
    it('should set csrf cookie and header on GET when no existing token', () => {
      const res = mockRes();
      csrfProtection(mockReq({ method: 'GET' }), res, next);
      expect(next).toHaveBeenCalled();
      expect(res._cookies.length).toBe(1);
      expect(res._cookies[0].name).toBe('csrf_token');
      expect(res._headers['X-CSRF-Token']).toBeDefined();
      // cookie value should match header value
      expect(res._cookies[0].value).toBe(res._headers['X-CSRF-Token']);
    });

    it('should NOT re-set cookie if token already exists in cookies', () => {
      const existingToken = 'existing-token-value';
      const res = mockRes();
      const req = mockReq({
        method: 'GET',
        headers: { cookie: `csrf_token=${existingToken}` },
      });
      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res._cookies.length).toBe(0); // no new cookie set
      expect(res._headers['X-CSRF-Token']).toBe(existingToken);
    });

    it('should work for HEAD and OPTIONS methods', () => {
      for (const method of ['HEAD', 'OPTIONS']) {
        next.mockClear();
        const res = mockRes();
        csrfProtection(mockReq({ method }), res, next);
        expect(next).toHaveBeenCalled();
        expect(res._headers['X-CSRF-Token']).toBeDefined();
      }
    });

    it('should set secure cookie in production', () => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      const mw = require('../middleware/csrfProtection');
      const res = mockRes();
      mw(mockReq({ method: 'GET' }), res, next);
      expect(res._cookies[0].opts.secure).toBe(true);
    });

    it('should set non-secure cookie in development', () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const mw = require('../middleware/csrfProtection');
      const res = mockRes();
      mw(mockReq({ method: 'GET' }), res, next);
      expect(res._cookies[0].opts.secure).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 4. Unsafe methods (POST, PUT, DELETE, PATCH) — validation
  // ═══════════════════════════════════════════════════════════════════════
  describe('unsafe methods — CSRF validation', () => {
    const token = 'valid-csrf-token-123';

    it('should allow request when cookie and header tokens match', () => {
      const req = mockReq({
        method: 'POST',
        headers: {
          cookie: `csrf_token=${token}`,
          'x-csrf-token': token,
        },
      });
      csrfProtection(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 when header token is missing', () => {
      const res = mockRes();
      const req = mockReq({
        method: 'POST',
        headers: { cookie: `csrf_token=${token}` },
      });
      csrfProtection(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res._status).toBe(403);
      expect(res._json.success).toBe(false);
      expect(res._json.message).toMatch(/CSRF/i);
    });

    it('should return 403 when cookie token is missing', () => {
      const res = mockRes();
      const req = mockReq({
        method: 'POST',
        headers: { 'x-csrf-token': token },
      });
      csrfProtection(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res._status).toBe(403);
    });

    it('should return 403 when tokens do not match', () => {
      const res = mockRes();
      const req = mockReq({
        method: 'POST',
        headers: {
          cookie: `csrf_token=${token}`,
          'x-csrf-token': 'wrong-token',
        },
      });
      csrfProtection(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res._status).toBe(403);
    });

    it('should work for PUT, DELETE, PATCH methods', () => {
      for (const method of ['PUT', 'DELETE', 'PATCH']) {
        next.mockClear();
        const res = mockRes();
        const req = mockReq({
          method,
          headers: {
            cookie: `csrf_token=${token}`,
            'x-csrf-token': token,
          },
        });
        csrfProtection(req, res, next);
        expect(next).toHaveBeenCalled();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 5. Auth-header bypass
  // ═══════════════════════════════════════════════════════════════════════
  describe('auth-header bypass', () => {
    it('should bypass CSRF when Authorization header is present and no CSRF tokens exist', () => {
      const req = mockReq({
        method: 'POST',
        headers: { authorization: 'Bearer some-jwt-token' },
      });
      csrfProtection(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('should bypass CSRF when X-API-Key header is present and no CSRF tokens exist', () => {
      const req = mockReq({
        method: 'POST',
        headers: { 'x-api-key': 'some-api-key' },
      });
      csrfProtection(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('should NOT bypass when auth header present BUT csrf tokens are also present (and mismatch)', () => {
      const res = mockRes();
      const req = mockReq({
        method: 'POST',
        headers: {
          authorization: 'Bearer jwt',
          cookie: 'csrf_token=abc',
          'x-csrf-token': 'xyz',
        },
      });
      csrfProtection(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res._status).toBe(403);
    });

    it('should allow when auth header + matching csrf tokens', () => {
      const req = mockReq({
        method: 'POST',
        headers: {
          authorization: 'Bearer jwt',
          cookie: 'csrf_token=abc',
          'x-csrf-token': 'abc',
        },
      });
      csrfProtection(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 6. Cookie parsing edge cases
  // ═══════════════════════════════════════════════════════════════════════
  describe('cookie parsing edge cases', () => {
    it('should handle multiple cookies correctly', () => {
      const token = 'my-csrf-token';
      const req = mockReq({
        method: 'POST',
        headers: {
          cookie: `session=abc123; csrf_token=${token}; lang=ar`,
          'x-csrf-token': token,
        },
      });
      csrfProtection(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('should handle URL-encoded cookie values', () => {
      const token = 'token+with spaces';
      const encoded = encodeURIComponent(token);
      const req = mockReq({
        method: 'POST',
        headers: {
          cookie: `csrf_token=${encoded}`,
          'x-csrf-token': token,
        },
      });
      csrfProtection(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('should handle empty cookie header gracefully', () => {
      const res = mockRes();
      const req = mockReq({
        method: 'POST',
        headers: { cookie: '' },
      });
      csrfProtection(req, res, next);
      // No cookie token, no header token, no auth header → 403
      expect(res._status).toBe(403);
    });
  });
});

'use strict';

/**
 * W422 — verifies the safeError helper's new `opts.shape` parameter.
 *
 * Background: 54 route files were converted to safeError in the
 * e603d4deb / 0d7651d1f / 5662c3b2b / a1c9a87b5 / cfb324223 / 2482b46c6
 * sweep. All of them previously responded with `{ success: false, ...}`
 * so the default safeError shape was a clean drop-in.
 *
 * 11 files remain in the backlog responding with `{ ok: false, error: ...}`
 * — converting them to the default safeError shape would change the
 * response key from `ok` to `success`, breaking any frontend caller that
 * specifically checks `response.ok`. W422 extends safeError with an
 * opt-in `{ shape: 'ok' }` parameter that preserves the legacy key set.
 *
 * The default behaviour MUST remain unchanged (`{success: false, error: ...}`)
 * so the 54 converted files keep working. W422 verifies BOTH shapes.
 */

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
}));

const safeError = require('../utils/safeError');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
}

describe('W422 safeError shape parameter', () => {
  describe('default (omitted opts) — 500 path', () => {
    it('responds with { success: false, error: <msg> }', () => {
      const res = mockRes();
      safeError(res, new Error('boom'), 'ctx');
      expect(res.status).toHaveBeenCalledWith(500);
      const body = res.json.mock.calls[0][0];
      expect(body).toEqual({ success: false, error: 'boom' });
    });
  });

  describe("shape: 'success' (explicit) — 500 path", () => {
    it('responds with { success: false, error: <msg> }', () => {
      const res = mockRes();
      safeError(res, new Error('boom'), 'ctx', { shape: 'success' });
      const body = res.json.mock.calls[0][0];
      expect(body).toEqual({ success: false, error: 'boom' });
    });
  });

  describe("shape: 'ok' — 500 path", () => {
    it('responds with { ok: false, error: <msg> }', () => {
      const res = mockRes();
      safeError(res, new Error('boom'), 'ctx', { shape: 'ok' });
      expect(res.status).toHaveBeenCalledWith(500);
      const body = res.json.mock.calls[0][0];
      expect(body).toEqual({ ok: false, error: 'boom' });
      // No `success` key in the body — opt-in is strict
      expect('success' in body).toBe(false);
    });
  });

  describe('passthrough 4xx — default shape', () => {
    it('preserves { success: false, message, code } shape', () => {
      const res = mockRes();
      const err = Object.assign(new Error('rate limit'), {
        statusCode: 429,
        code: 'RATE_LIMITED',
      });
      safeError(res, err, 'ctx');
      expect(res.status).toHaveBeenCalledWith(429);
      const body = res.json.mock.calls[0][0];
      expect(body).toEqual({
        success: false,
        message: 'rate limit',
        code: 'RATE_LIMITED',
      });
    });
  });

  describe("passthrough 4xx — shape: 'ok'", () => {
    it('responds with { ok: false, error, code } shape', () => {
      const res = mockRes();
      const err = Object.assign(new Error('forbidden'), {
        statusCode: 403,
        code: 'FORBIDDEN_X',
      });
      safeError(res, err, 'ctx', { shape: 'ok' });
      expect(res.status).toHaveBeenCalledWith(403);
      const body = res.json.mock.calls[0][0];
      expect(body).toEqual({
        ok: false,
        error: 'forbidden',
        code: 'FORBIDDEN_X',
      });
      expect('success' in body).toBe(false);
      expect('message' in body).toBe(false);
    });
  });

  describe('Retry-After header on 429 still set under both shapes', () => {
    it('default shape', () => {
      const res = mockRes();
      const err = Object.assign(new Error('slow down'), {
        statusCode: 429,
        retryAfterMs: 12000,
      });
      safeError(res, err, 'ctx');
      expect(res.set).toHaveBeenCalledWith('Retry-After', '12');
    });

    it("shape: 'ok'", () => {
      const res = mockRes();
      const err = Object.assign(new Error('slow down'), {
        statusCode: 429,
        retryAfterMs: 12000,
      });
      safeError(res, err, 'ctx', { shape: 'ok' });
      expect(res.set).toHaveBeenCalledWith('Retry-After', '12');
    });
  });

  describe('unknown shape value falls back to default', () => {
    it('treats { shape: "weird" } as { shape: "success" }', () => {
      const res = mockRes();
      safeError(res, new Error('boom'), 'ctx', { shape: 'weird' });
      const body = res.json.mock.calls[0][0];
      expect(body).toEqual({ success: false, error: 'boom' });
    });
  });
});

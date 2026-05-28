'use strict';

/**
 * auth-validate-middleware-regression-wave529.test.js — W529.
 *
 * Two shared-middleware regressions found while auditing the HR surface — both
 * caused production endpoints to 500 / hang regardless of the caller's role:
 *
 * 1. authorize() — a 2026-03-27 case-insensitive refactor (e870f5c9a) changed
 *    `roles.includes(role)` → `roles.some(...)`. Strings have .includes but NOT
 *    .some, so the ~300 call sites that pass VARARGS — authorize('admin','mgr')
 *    — began throwing "roles.some is not a function" → 500. Fix: accept both
 *    authorize('a','b') and authorize(['a','b']) via args.flat().
 *
 * 2. validate — is a factory: validate([checks]) returns a middleware. Several
 *    route files used it as a BARE middleware (`[checks], validate, handler`),
 *    so Express called validate(req,res,next), which returned a function and
 *    never called next() → the request hung forever. Fix: make validate
 *    polymorphic (factory form OR bare-middleware form).
 *
 * Pure unit tests — no DB, no HTTP.
 */

const { authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { query, validationResult } = require('express-validator');

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
  };
}

describe('W529 · authorize() accepts varargs AND array (regression)', () => {
  test("varargs form authorize('admin','manager') allows a matching role", () => {
    const mw = authorize('admin', 'manager');
    const req = { user: { role: 'admin' } };
    const res = mockRes();
    let nexted = false;
    expect(() =>
      mw(req, res, () => {
        nexted = true;
      })
    ).not.toThrow();
    expect(nexted).toBe(true);
    expect(res.statusCode).toBeNull();
  });

  test("single-string varargs authorize('admin') does NOT throw (the regression)", () => {
    const mw = authorize('admin');
    const req = { user: { role: 'admin' } };
    const res = mockRes();
    let nexted = false;
    expect(() =>
      mw(req, res, () => {
        nexted = true;
      })
    ).not.toThrow();
    expect(nexted).toBe(true);
  });

  test('array form authorize([...]) still works', () => {
    const mw = authorize(['admin', 'manager']);
    const req = { user: { role: 'manager' } };
    const res = mockRes();
    let nexted = false;
    mw(req, res, () => {
      nexted = true;
    });
    expect(nexted).toBe(true);
  });

  test('role comparison is case-insensitive', () => {
    const mw = authorize('admin');
    const req = { user: { role: 'ADMIN' } };
    const res = mockRes();
    let nexted = false;
    mw(req, res, () => {
      nexted = true;
    });
    expect(nexted).toBe(true);
  });

  test('non-matching role → 403', () => {
    const mw = authorize('admin', 'manager');
    const req = { user: { role: 'beneficiary' } };
    const res = mockRes();
    let nexted = false;
    mw(req, res, () => {
      nexted = true;
    });
    expect(nexted).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  test('missing user → 401', () => {
    const mw = authorize('admin');
    const res = mockRes();
    mw({}, res, () => {});
    expect(res.statusCode).toBe(401);
  });

  test('no roles configured → allows any authenticated user', () => {
    const mw = authorize();
    const req = { user: { role: 'whoever' } };
    const res = mockRes();
    let nexted = false;
    mw(req, res, () => {
      nexted = true;
    });
    expect(nexted).toBe(true);
  });
});

describe('W529 · validate is polymorphic (factory + bare middleware)', () => {
  test('factory form validate([check]) → next() when valid', async () => {
    const mw = validate([query('n').optional().isInt()]);
    const req = { query: { n: '5' } };
    const res = mockRes();
    let nexted = false;
    await mw(req, res, () => {
      nexted = true;
    });
    expect(nexted).toBe(true);
    expect(res.statusCode).toBeNull();
  });

  test('factory form → 400 when invalid', async () => {
    const mw = validate([query('n').isInt().withMessage('n must be int')]);
    const req = { query: { n: 'abc' } };
    const res = mockRes();
    let nexted = false;
    await mw(req, res, () => {
      nexted = true;
    });
    expect(nexted).toBe(false);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('bare-middleware form responds (does NOT hang) — next() when valid', async () => {
    // Simulate the route pattern: the [checks] array ran first, THEN bare validate.
    const req = { query: { n: '7' } };
    const res = mockRes();
    await query('n').optional().isInt().run(req); // preceding chain
    let nexted = false;
    // Express would call: validate(req, res, next)
    validate(req, res, () => {
      nexted = true;
    });
    expect(nexted).toBe(true); // <-- on the old code this never fired (hang)
  });

  test('bare-middleware form → 400 when a preceding check failed', async () => {
    const req = { query: { n: 'nope' } };
    const res = mockRes();
    await query('n').isInt().withMessage('bad').run(req);
    let nexted = false;
    validate(req, res, () => {
      nexted = true;
    });
    expect(nexted).toBe(false);
    expect(res.statusCode).toBe(400);
  });

  test('sanity: validationResult is the mechanism both forms rely on', async () => {
    const req = { query: {} };
    await query('x').optional().isInt().run(req);
    expect(validationResult(req).isEmpty()).toBe(true);
  });
});

'use strict';

/**
 * W1445 — CCTV async-router hang regression guard.
 *
 * BUG (pre-fix): CCTV routers are mounted via `cctv.registry.js` `safeMount` (plain
 * `app.use`, no async-error adapter) on Express 4 (no built-in promise handling). A
 * bare `await` that rejected (e.g. `GET /cctv/cameras/not-an-objectid` →
 * `CctvCamera.findById` → CastError) became an unhandled rejection that never reached
 * the error middleware → the request hung ~120s and leaked a pending handler.
 *
 * FIX: every CCTV router is created via `require('./asyncRouter')(express.Router())`,
 * which forwards handler rejections to `next(err)` → a real response.
 *
 * This guard proves (a) the wrapper converts a rejection into an error-handler
 * response, (b) normal handlers still work, (c) 4-arg error middleware is untouched,
 * and (d) all CCTV route files actually adopt the wrapper.
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const request = require('supertest');

const asyncRouter = require('../routes/cctv/asyncRouter');

describe('W1445 cctv asyncRouter behavior', () => {
  test('forwards an async handler rejection to the error handler instead of hanging', async () => {
    const app = express();
    const router = asyncRouter(express.Router());
    router.get('/boom/:id', async () => {
      const err = new Error('Cast to ObjectId failed');
      err.name = 'CastError';
      throw err; // simulates Mongoose CastError on a malformed :id
    });
    app.use('/t', router);
    app.use((err, req, res, _next) => res.status(500).json({ error: err.message }));

    const res = await request(app).get('/t/boom/not-an-objectid');
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Cast to ObjectId/);
  });

  test('passes a normal async handler through unchanged', async () => {
    const app = express();
    const router = asyncRouter(express.Router());
    router.get('/ok', async (req, res) => res.json({ ok: true }));
    app.use('/t', router);

    const res = await request(app).get('/t/ok');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  test('leaves 4-arg error-handling middleware un-wrapped (preserves its signature)', () => {
    const captured = [];
    const fakeRouter = { get: (...args) => captured.push(args) };
    const errHandler = (err, req, res, next) => next(err);

    asyncRouter(fakeRouter).get('/x', errHandler);

    expect(captured[0][1]).toBe(errHandler); // same reference, not wrapped
  });
});

describe('W1445 all CCTV route files adopt asyncRouter', () => {
  const cctvDir = path.join(__dirname, '..', 'routes', 'cctv');
  const routeFiles = fs.readdirSync(cctvDir).filter(f => f.endsWith('.routes.js'));

  test('there are CCTV route files to check', () => {
    expect(routeFiles.length).toBeGreaterThanOrEqual(12);
  });

  test.each(routeFiles)('%s creates its router via asyncRouter', file => {
    const src = fs.readFileSync(path.join(cctvDir, file), 'utf8');
    // Must NOT use a bare express.Router() (that's the unsafe pattern).
    expect(src).toMatch(/require\(['"]\.\/asyncRouter['"]\)\(express\.Router\(\)\)/);
    expect(src).not.toMatch(/=\s*express\.Router\(\)\s*;/);
  });
});

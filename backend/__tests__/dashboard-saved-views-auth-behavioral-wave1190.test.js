/**
 * W1190 — behavioral counterpart: the router rejects anonymous requests on a
 * bare (auth-less) mount, proving the router-level gate actually fires.
 *
 * This reproduces the phases.registry `safeMount` path: mount the route's
 * DEFAULT export (the exact instance safeMount `require()`s) at a prefix WITHOUT
 * injecting any auth middleware, then assert every verb returns 401 when no
 * Authorization header is present. A static guard can confirm the source text;
 * only this confirms the middleware truly runs and short-circuits before the
 * handlers (W356–W384 static+behavioral pairing doctrine).
 *
 * No DB / no token needed — `authenticate` returns 401 on a missing Bearer token
 * before any handler (and before `getStore`), so the saved-view store is never
 * touched.
 */

'use strict';

const express = require('express');
const request = require('supertest');

// The DEFAULT export === `buildRouter()` instance — the one phases.registry
// safeMount mounts with NO middleware.
const savedViewsRouter = require('../routes/dashboard-saved-views.routes');

function bareApp() {
  const app = express();
  // Deliberately auth-less mount, mirroring safeMount(app, '/api/dashboard-saved-views', …)
  app.use('/api/dashboard-saved-views', savedViewsRouter);
  return app;
}

describe('W1190 dashboard-saved-views rejects anonymous access on a bare mount (behavioral)', () => {
  const app = bareApp();

  test('GET / (list) → 401 without a token', async () => {
    const res = await request(app).get('/api/dashboard-saved-views/');
    expect(res.status).toBe(401);
  });

  test('POST / (create) → 401 without a token (no owner-less view can be seeded)', async () => {
    const res = await request(app)
      .post('/api/dashboard-saved-views/')
      .send({ dashboardId: 'd1', title: 'x' });
    expect(res.status).toBe(401);
  });

  test('GET /:id → 401 without a token', async () => {
    const res = await request(app).get('/api/dashboard-saved-views/anything');
    expect(res.status).toBe(401);
  });

  test('PATCH /:id → 401 without a token (no anonymous tamper of owner-less views)', async () => {
    const res = await request(app)
      .patch('/api/dashboard-saved-views/anything')
      .send({ title: 'hijack' });
    expect(res.status).toBe(401);
  });

  test('DELETE /:id → 401 without a token', async () => {
    const res = await request(app).delete('/api/dashboard-saved-views/anything');
    expect(res.status).toBe(401);
  });
});

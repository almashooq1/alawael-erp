'use strict';

/**
 * tenant-routes-wiring-wave721.test.js — static + behavioral guard.
 *
 * W721 fixed a misrouting bug: tenant.routes.js gated the (fully-built, ~590
 * LOC) tenant.controller behind `tenantController._router` (Express Routers
 * don't have that) + treated `typeof === 'function'` as the non-router branch,
 * so EVERY request hit a 501 stub — the whole multi-tenant surface was dark.
 *
 * Because the controller carries NO internal auth and safeMount adds none, the
 * fix MUST also gate the surface (authenticate + requireAdmin) — otherwise
 * un-gating would expose unauthenticated tenant CRUD. This guard locks BOTH:
 * the controller is mounted, AND it is admin-gated.
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const request = require('supertest');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'routes', 'tenant.routes.js'), 'utf8');

describe('W721 static — tenant controller mounted + admin-gated', () => {
  it('no longer carries the broken `_router` check', () => {
    expect(SRC).not.toMatch(/tenantController\._router/);
  });
  it('mounts the real controller (router.use with tenantController)', () => {
    expect(SRC).toMatch(/router\.use\(\s*['"]\/['"]\s*,\s*tenantController\s*\)/);
  });
  it('applies authenticate + requireAdmin on the whole surface', () => {
    expect(SRC).toMatch(/require\('\.\.\/middleware\/auth'\)/);
    expect(SRC).toMatch(/router\.use\(authenticate\)/);
    expect(SRC).toMatch(/router\.use\(requireAdmin\)/);
  });
  it('auth guards are declared BEFORE the controller mount', () => {
    const authIdx = SRC.indexOf('router.use(requireAdmin)');
    const mountIdx = SRC.search(/router\.use\(\s*['"]\/['"]\s*,\s*tenantController/);
    expect(authIdx).toBeGreaterThan(-1);
    expect(mountIdx).toBeGreaterThan(authIdx);
  });
});

describe('W721 behavioral — surface rejects unauthenticated / non-admin', () => {
  // Mount the real route file but stub auth via a header so we exercise the
  // ACTUAL guard ordering. We rely on the real authenticate rejecting a
  // request with no token.
  let app;
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/tenants', require('../routes/tenant.routes'));
  });

  it('GET /tenants without a token is denied (401/403, never 200)', async () => {
    const res = await request(app).get('/api/v1/tenants');
    expect([401, 403]).toContain(res.status);
  });

  it('POST /tenants without a token is denied (never creates)', async () => {
    const res = await request(app).post('/api/v1/tenants').send({ name: 'X', email: 'x@y.z' });
    expect([401, 403]).toContain(res.status);
  });
});

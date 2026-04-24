/**
 * dashboards-platform-routes.test.js — Phase 18 Commit 1.
 *
 * Exercises the HTTP surface of the dashboard platform using
 * supertest against a minimal express app. Bypasses the real
 * authentication middleware; injects `req.user` via a stub so we
 * can control the caller's role.
 */

'use strict';

const express = require('express');
const request = require('supertest');

const { buildRouter } = require('../routes/dashboards-platform.routes');

function mountApp(role, { kpiResolver } = {}) {
  const app = express();
  app.use((req, _res, next) => {
    req.user = role ? { primaryRole: role } : {};
    next();
  });
  app.use('/api/v1/dashboards', buildRouter({ kpiResolver }));
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ ok: false, error: err.message });
  });
  return app;
}

describe('GET /api/v1/dashboards/catalog', () => {
  it('lists dashboards the caller can access', async () => {
    const app = mountApp('group_cfo');
    const res = await request(app).get('/api/v1/dashboards/catalog');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const ids = res.body.dashboards.map(d => d.id);
    expect(ids).toContain('executive');
    expect(ids).toContain('functional.finance');
  });

  it('super_admin sees every dashboard', async () => {
    const app = mountApp('super_admin');
    const res = await request(app).get('/api/v1/dashboards/catalog');
    expect(res.body.dashboards.length).toBeGreaterThanOrEqual(7);
  });

  it('unknown role returns an empty list', async () => {
    const app = mountApp('not_a_role');
    const res = await request(app).get('/api/v1/dashboards/catalog');
    expect(res.status).toBe(200);
    expect(res.body.dashboards).toEqual([]);
  });
});

describe('GET /api/v1/dashboards/widgets', () => {
  it('returns the widget catalog', async () => {
    const app = mountApp('ceo');
    const res = await request(app).get('/api/v1/dashboards/widgets');
    expect(res.status).toBe(200);
    expect(res.body.widgets.length).toBeGreaterThan(0);
    expect(res.body.dataShapes).toContain('narrative');
  });
});

describe('GET /api/v1/dashboards/kpis', () => {
  it('returns KPIs visible to the role via accessible dashboards', async () => {
    const app = mountApp('group_cfo');
    const res = await request(app).get('/api/v1/dashboards/kpis');
    expect(res.status).toBe(200);
    const ids = res.body.kpis.map(k => k.id);
    expect(ids).toContain('finance.ar.dso.days');
  });

  it('returns empty list for roles with no visible dashboards', async () => {
    const app = mountApp('not_a_role');
    const res = await request(app).get('/api/v1/dashboards/kpis');
    expect(res.body.kpis).toEqual([]);
  });
});

describe('GET /api/v1/dashboards/:id', () => {
  it('returns 404 for unknown dashboard ids', async () => {
    const app = mountApp('ceo');
    const res = await request(app).get('/api/v1/dashboards/does-not-exist');
    expect(res.status).toBe(404);
  });

  it('returns 403 when the role is not in the audience', async () => {
    const app = mountApp('therapist');
    const res = await request(app).get('/api/v1/dashboards/executive');
    expect(res.status).toBe(403);
  });

  it('returns a full payload for authorised roles', async () => {
    const resolver = () =>
      Promise.resolve({ value: 90, delta: 0.03, sparkline: [], asOf: null, source: 'test' });
    const app = mountApp('ceo', { kpiResolver: resolver });
    const res = await request(app).get('/api/v1/dashboards/executive');
    expect(res.status).toBe(200);
    expect(res.body.dashboard.id).toBe('executive');
    expect(Array.isArray(res.body.heroKpis)).toBe(true);
    expect(res.body.heroKpis.length).toBeGreaterThan(0);
    expect(res.body.narrative).toBeTruthy();
    expect(res.body.asOf).toBeTruthy();
  });

  it('applies recognised filters from the query string', async () => {
    const resolver = jest.fn(() =>
      Promise.resolve({ value: 10, delta: 0, sparkline: [], asOf: null, source: 'test' })
    );
    const app = mountApp('ceo', { kpiResolver: resolver });
    await request(app).get(
      '/api/v1/dashboards/executive?branch=riyadh-2&dateRange=MTD&unknown=ignored'
    );
    const calls = resolver.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const filters = calls[0][1];
    expect(filters.branch).toBe('riyadh-2');
    expect(filters.dateRange).toBe('MTD');
    expect(filters.unknown).toBeUndefined();
  });
});

describe('GET /api/v1/dashboards/:id/narrative', () => {
  it('returns only the narrative slice', async () => {
    const resolver = () =>
      Promise.resolve({ value: 95, delta: 0.2, sparkline: [], asOf: null, source: 'test' });
    const app = mountApp('ceo', { kpiResolver: resolver });
    const res = await request(app).get('/api/v1/dashboards/executive/narrative');
    expect(res.status).toBe(200);
    expect(res.body.narrative).toBeTruthy();
    expect(res.body).not.toHaveProperty('heroKpis');
    expect(res.body).not.toHaveProperty('widgets');
  });

  it('returns 403 when the role is not authorised', async () => {
    const app = mountApp('therapist');
    const res = await request(app).get('/api/v1/dashboards/executive/narrative');
    expect(res.status).toBe(403);
  });
});

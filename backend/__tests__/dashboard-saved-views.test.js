/**
 * dashboard-saved-views.test.js — Phase 18 Commit 9.
 *
 * Exercises the store + HTTP surface for saved dashboard views.
 */

'use strict';

const express = require('express');
const request = require('supertest');

const {
  createInMemorySavedViewStore,
  sanitiseFilters,
} = require('../services/savedViewStore.service');
const { buildRouter } = require('../routes/dashboard-saved-views.routes');

function mountApp({ user = { id: 'u-1', primaryRole: 'ceo' }, store } = {}) {
  const app = express();
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app._savedViewStore = store;
  app.use('/api/v1/dashboards/saved-views', buildRouter());
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ ok: false, error: err.message });
  });
  return app;
}

// ─── Store ─────────────────────────────────────────────────────

describe('savedViewStore — create + update + remove', () => {
  it('creates a view with a generated id', () => {
    const store = createInMemorySavedViewStore();
    const v = store.create({ dashboardId: 'executive', title: 'مراقبتي اليومية' });
    expect(v.id).toMatch(/^sv_/);
    expect(v.dashboardId).toBe('executive');
    expect(v.createdAt).toBe(v.updatedAt);
  });

  it('rejects missing dashboardId or title', () => {
    const store = createInMemorySavedViewStore();
    expect(() => store.create({ title: 'x' })).toThrow(/dashboardId/);
    expect(() => store.create({ dashboardId: 'x', title: '' })).toThrow(/title/);
  });

  it('sanitises filter keys + coerces values to strings', () => {
    const clean = sanitiseFilters({ branch: 'riyadh', dateRange: 12, bogus: null });
    expect(clean).toEqual({ branch: 'riyadh', dateRange: '12' });
  });

  it('caps title length at 200 characters', () => {
    const store = createInMemorySavedViewStore();
    const title = 'x'.repeat(500);
    const v = store.create({ dashboardId: 'x', title });
    expect(v.title.length).toBe(200);
  });

  it('update patches fields, leaves others intact', () => {
    const store = createInMemorySavedViewStore();
    const v = store.create({ dashboardId: 'x', title: 'old' });
    const updated = store.update(v.id, { title: 'new' });
    expect(updated.title).toBe('new');
    expect(updated.dashboardId).toBe('x');
    expect(updated.updatedAt).toBeGreaterThanOrEqual(v.updatedAt);
  });

  it('remove returns true/false', () => {
    const store = createInMemorySavedViewStore();
    const v = store.create({ dashboardId: 'x', title: 't' });
    expect(store.remove(v.id)).toBe(true);
    expect(store.remove(v.id)).toBe(false);
  });

  it('enforces maxViews via LRU', () => {
    const store = createInMemorySavedViewStore({ maxViews: 2 });
    const a = store.create({ dashboardId: 'x', title: 'a' });
    store.create({ dashboardId: 'x', title: 'b' });
    store.create({ dashboardId: 'x', title: 'c' });
    expect(store.get(a.id)).toBeNull();
  });
});

describe('savedViewStore.listVisibleTo', () => {
  it('returns private views only to their owner', () => {
    const store = createInMemorySavedViewStore();
    store.create({ dashboardId: 'x', title: 'mine', ownerUserId: 'u-1' });
    store.create({ dashboardId: 'x', title: 'other', ownerUserId: 'u-2' });
    const forU1 = store.listVisibleTo({ userId: 'u-1' });
    expect(forU1.map(v => v.title)).toEqual(['mine']);
  });

  it('returns shared views to any caller with the role', () => {
    const store = createInMemorySavedViewStore();
    store.create({
      dashboardId: 'x',
      title: 'exec-wide',
      ownerUserId: 'u-1',
      sharedWithRoles: ['ceo'],
    });
    const forU2 = store.listVisibleTo({ userId: 'u-2', role: 'ceo' });
    expect(forU2.map(v => v.title)).toEqual(['exec-wide']);
  });

  it('public views (no owner + no roles) are visible to everyone', () => {
    const store = createInMemorySavedViewStore();
    store.create({ dashboardId: 'x', title: 'public-one' });
    const out = store.listVisibleTo({});
    expect(out.length).toBe(1);
  });

  it('filters by dashboardId when provided', () => {
    const store = createInMemorySavedViewStore();
    store.create({ dashboardId: 'a', title: 'x' });
    store.create({ dashboardId: 'b', title: 'y' });
    const onlyA = store.listVisibleTo({ dashboardId: 'a' });
    expect(onlyA.length).toBe(1);
    expect(onlyA[0].dashboardId).toBe('a');
  });
});

// ─── Routes ────────────────────────────────────────────────────

describe('saved-views routes', () => {
  it('returns 503 when the store is missing', async () => {
    const app = mountApp({ store: null });
    const res = await request(app).get('/api/v1/dashboards/saved-views');
    expect(res.status).toBe(503);
  });

  it('POST creates a view owned by the caller', async () => {
    const store = createInMemorySavedViewStore();
    const app = mountApp({ store });
    const res = await request(app)
      .post('/api/v1/dashboards/saved-views')
      .send({ dashboardId: 'executive', title: 'مراقبتي', filters: { branch: 'riyadh-2' } });
    expect(res.status).toBe(201);
    expect(res.body.view.ownerUserId).toBe('u-1');
    expect(res.body.view.filters.branch).toBe('riyadh-2');
  });

  it('POST returns 400 on invalid input', async () => {
    const store = createInMemorySavedViewStore();
    const app = mountApp({ store });
    const res = await request(app)
      .post('/api/v1/dashboards/saved-views')
      .send({ dashboardId: 'x' });
    expect(res.status).toBe(400);
  });

  it('GET / lists only views visible to the caller', async () => {
    const store = createInMemorySavedViewStore();
    store.create({ dashboardId: 'x', title: 'other', ownerUserId: 'u-2' });
    store.create({ dashboardId: 'x', title: 'mine', ownerUserId: 'u-1' });
    const app = mountApp({ store });
    const res = await request(app).get('/api/v1/dashboards/saved-views');
    expect(res.status).toBe(200);
    expect(res.body.views.map(v => v.title)).toEqual(['mine']);
  });

  it('GET /:id returns 403 when the caller cannot see the view', async () => {
    const store = createInMemorySavedViewStore();
    const v = store.create({ dashboardId: 'x', title: 'secret', ownerUserId: 'u-2' });
    const app = mountApp({ store });
    const res = await request(app).get(`/api/v1/dashboards/saved-views/${v.id}`);
    expect(res.status).toBe(403);
  });

  it('GET /:id returns public views to any caller', async () => {
    const store = createInMemorySavedViewStore();
    const v = store.create({ dashboardId: 'x', title: 'open' });
    const app = mountApp({ store });
    const res = await request(app).get(`/api/v1/dashboards/saved-views/${v.id}`);
    expect(res.status).toBe(200);
  });

  it('PATCH only works for the owner', async () => {
    const store = createInMemorySavedViewStore();
    const v = store.create({ dashboardId: 'x', title: 'mine', ownerUserId: 'u-2' });
    const app = mountApp({ store });
    const res = await request(app)
      .patch(`/api/v1/dashboards/saved-views/${v.id}`)
      .send({ title: 'stolen' });
    expect(res.status).toBe(403);
  });

  it('DELETE only works for the owner', async () => {
    const store = createInMemorySavedViewStore();
    const v = store.create({ dashboardId: 'x', title: 'mine', ownerUserId: 'u-1' });
    const app = mountApp({ store });
    const res = await request(app).delete(`/api/v1/dashboards/saved-views/${v.id}`);
    expect(res.status).toBe(200);
    expect(store.get(v.id)).toBeNull();
  });

  it('GET /:id returns 404 for unknown ids', async () => {
    const store = createInMemorySavedViewStore();
    const app = mountApp({ store });
    const res = await request(app).get('/api/v1/dashboards/saved-views/nope');
    expect(res.status).toBe(404);
  });

  it('GET / supports ?dashboardId=', async () => {
    const store = createInMemorySavedViewStore();
    store.create({ dashboardId: 'a', title: 'x' });
    store.create({ dashboardId: 'b', title: 'y' });
    const app = mountApp({ store });
    const res = await request(app).get('/api/v1/dashboards/saved-views?dashboardId=a');
    expect(res.body.views.every(v => v.dashboardId === 'a')).toBe(true);
  });
});

/**
 * alert-coordinator-and-routes.test.js — Phase 18 Commit 8.
 *
 * Exercises the coordinator end-to-end with the in-memory state
 * store, plus the admin HTTP surface.
 */

'use strict';

const express = require('express');
const request = require('supertest');

const { createInMemoryStore, makeCorrelationKey } = require('../services/alertStateStore.service');
const { buildAlertCoordinator } = require('../services/dashboardAlertCoordinator.service');
const { buildRouter } = require('../routes/dashboard-alerts.routes');

function stubClock(start = Date.parse('2026-04-24T10:00:00Z')) {
  let t = start;
  return {
    now: () => t,
    advance(ms) {
      t += ms;
      return t;
    },
    set(ms) {
      t = ms;
      return t;
    },
  };
}

function makeCoord({ dispatcher = jest.fn(() => Promise.resolve()), clock } = {}) {
  const store = createInMemoryStore({ clock });
  const coord = buildAlertCoordinator({
    stateStore: store,
    dispatcher,
    clock,
    logger: { warn: () => {} },
  });
  return { coord, store, dispatcher };
}

// ─── Coordinator ────────────────────────────────────────────────

describe('alertCoordinator.evaluateSnapshot — fire / dedup / escalate', () => {
  it('fires on the second red tick for a policy with minConsecutiveTicks=2', async () => {
    const clock = stubClock();
    const { coord, dispatcher } = makeCoord({ clock });
    const heroKpis = [{ id: 'finance.ar.dso.days', classification: 'red' }];

    const firstTick = await coord.evaluateSnapshot({ heroKpis });
    expect(firstTick.some(d => d.action === 'fire')).toBe(false);

    clock.advance(60_000);
    const secondTick = await coord.evaluateSnapshot({ heroKpis });
    const fire = secondTick.find(d => d.policyId === 'exec.dso.breach');
    expect(fire.action).toBe('fire');
    expect(dispatcher).toHaveBeenCalled();
  });

  it('dedup suppresses dispatcher calls inside the window', async () => {
    const clock = stubClock();
    const { coord, dispatcher } = makeCoord({ clock });
    const heroKpis = [{ id: 'finance.ar.dso.days', classification: 'red' }];

    await coord.evaluateSnapshot({ heroKpis }); // tick 1
    clock.advance(1000);
    await coord.evaluateSnapshot({ heroKpis }); // tick 2 — fires
    const callsAfterFire = dispatcher.mock.calls.length;
    clock.advance(1000);
    await coord.evaluateSnapshot({ heroKpis }); // still within dedup
    expect(dispatcher.mock.calls.length).toBe(callsAfterFire);
  });

  it('advances the escalation step after the ladder afterMs', async () => {
    const clock = stubClock();
    const { coord } = makeCoord({ clock });
    const heroKpis = [{ id: 'finance.ar.dso.days', classification: 'red' }];

    await coord.evaluateSnapshot({ heroKpis });
    clock.advance(60_000);
    await coord.evaluateSnapshot({ heroKpis }); // fires at step 0
    // critical.oncall step 1 = 30 min
    clock.advance(31 * 60 * 1000);
    const res = await coord.evaluateSnapshot({ heroKpis });
    const dec = res.find(d => d.policyId === 'exec.dso.breach');
    expect(dec.action).toBe('escalate');
    expect(dec.escalationStep).toBeGreaterThanOrEqual(1);
  });

  it('recovers when classification returns to green', async () => {
    const clock = stubClock();
    const { coord } = makeCoord({ clock });
    // push it to fire
    await coord.evaluateSnapshot({
      heroKpis: [{ id: 'finance.ar.dso.days', classification: 'red' }],
    });
    clock.advance(60_000);
    await coord.evaluateSnapshot({
      heroKpis: [{ id: 'finance.ar.dso.days', classification: 'red' }],
    });
    clock.advance(60_000);
    const res = await coord.evaluateSnapshot({
      heroKpis: [{ id: 'finance.ar.dso.days', classification: 'green' }],
    });
    const dec = res.find(d => d.policyId === 'exec.dso.breach');
    expect(dec.action).toBe('recover');
  });

  it('swallows dispatcher errors silently', async () => {
    const clock = stubClock();
    const dispatcher = jest.fn(() => Promise.reject(new Error('boom')));
    const { coord } = makeCoord({ clock, dispatcher });
    const heroKpis = [{ id: 'finance.ar.dso.days', classification: 'red' }];
    await coord.evaluateSnapshot({ heroKpis });
    clock.advance(60_000);
    await expect(coord.evaluateSnapshot({ heroKpis })).resolves.toBeDefined();
  });
});

describe('alertCoordinator — ack / snooze / mute + list', () => {
  it('ack hides the alert from the active list', async () => {
    const clock = stubClock();
    const { coord } = makeCoord({ clock });
    const heroKpis = [{ id: 'finance.ar.dso.days', classification: 'red' }];
    await coord.evaluateSnapshot({ heroKpis });
    clock.advance(60_000);
    const res = await coord.evaluateSnapshot({ heroKpis });
    const key = res.find(d => d.policyId === 'exec.dso.breach').correlationKey;

    expect(coord.listActive().some(a => a.correlationKey === key)).toBe(true);
    coord.ack(key, { userId: 'u-1' });
    expect(coord.listActive().some(a => a.correlationKey === key)).toBe(false);
  });

  it('snooze excludes the alert by default, reveals with includeSuppressed', async () => {
    const clock = stubClock();
    const { coord } = makeCoord({ clock });
    const heroKpis = [{ id: 'finance.ar.dso.days', classification: 'red' }];
    await coord.evaluateSnapshot({ heroKpis });
    clock.advance(60_000);
    const res = await coord.evaluateSnapshot({ heroKpis });
    const key = res.find(d => d.policyId === 'exec.dso.breach').correlationKey;

    coord.snooze(key, { minutes: 15 });
    expect(coord.listActive().some(a => a.correlationKey === key)).toBe(false);
    expect(coord.listActive({ includeSuppressed: true }).some(a => a.correlationKey === key)).toBe(
      true
    );
  });

  it('mute stores a reason + auto-expires after hours', async () => {
    const clock = stubClock();
    const { coord } = makeCoord({ clock });
    const heroKpis = [{ id: 'finance.ar.dso.days', classification: 'red' }];
    await coord.evaluateSnapshot({ heroKpis });
    clock.advance(60_000);
    const res = await coord.evaluateSnapshot({ heroKpis });
    const key = res.find(d => d.policyId === 'exec.dso.breach').correlationKey;

    const entry = coord.mute(key, { hours: 1, reason: 'capa-linked' });
    expect(entry.muteReason).toBe('capa-linked');
    expect(entry.mutedUntil).toBeGreaterThan(clock.now());
  });

  it('ack returns null for unknown keys', () => {
    const { coord } = makeCoord({});
    expect(coord.ack('does-not-exist', {})).toBeNull();
  });
});

describe('alertStateStore', () => {
  it('evicts expired entries', () => {
    const clock = stubClock();
    const store = createInMemoryStore({ ttlMs: 1000, clock });
    store.upsert('k1', { firstFiredAt: clock.now() });
    expect(store.get('k1')).toBeTruthy();
    clock.advance(2000);
    expect(store.get('k1')).toBeNull();
  });

  it('enforces maxEntries via LRU eviction', () => {
    const clock = stubClock();
    const store = createInMemoryStore({ maxEntries: 2, clock });
    store.upsert('a', { firstFiredAt: 1 });
    store.upsert('b', { firstFiredAt: 2 });
    store.upsert('c', { firstFiredAt: 3 });
    expect(store.get('a')).toBeNull();
    expect(store.get('b')).toBeTruthy();
    expect(store.get('c')).toBeTruthy();
  });

  it('makeCorrelationKey is deterministic', () => {
    const a = makeCorrelationKey({ policyId: 'x', kpiId: 'y', scope: 'z' });
    const b = makeCorrelationKey({ policyId: 'x', kpiId: 'y', scope: 'z' });
    expect(a).toBe(b);
  });
});

// ─── HTTP routes ───────────────────────────────────────────────

function mountApp(coord) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id: 'user-1' };
    next();
  });
  app._alertCoordinator = coord;
  app.use('/api/v1/dashboards/alerts', buildRouter());
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ ok: false, error: err.message });
  });
  return app;
}

describe('dashboard-alerts routes', () => {
  it('GET / lists active alerts', async () => {
    const clock = stubClock();
    const { coord } = makeCoord({ clock });
    const heroKpis = [{ id: 'finance.ar.dso.days', classification: 'red' }];
    await coord.evaluateSnapshot({ heroKpis });
    clock.advance(60_000);
    await coord.evaluateSnapshot({ heroKpis });

    const res = await request(mountApp(coord)).get('/api/v1/dashboards/alerts');
    expect(res.status).toBe(200);
    expect(res.body.alerts.length).toBeGreaterThan(0);
    expect(res.body).toHaveProperty('count');
  });

  it('GET /policies returns the full catalogue', async () => {
    const { coord } = makeCoord({});
    const res = await request(mountApp(coord)).get('/api/v1/dashboards/alerts/policies');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.policies)).toBe(true);
    expect(res.body.policies.length).toBeGreaterThan(0);
    expect(res.body.ladders['critical.oncall']).toBeTruthy();
  });

  it('POST /:key/ack returns 404 for unknown keys', async () => {
    const { coord } = makeCoord({});
    const res = await request(mountApp(coord))
      .post('/api/v1/dashboards/alerts/does-not-exist/ack')
      .send({});
    expect(res.status).toBe(404);
  });

  it('POST /:key/snooze persists the snoozeUntil', async () => {
    const clock = stubClock();
    const { coord } = makeCoord({ clock });
    const heroKpis = [{ id: 'finance.ar.dso.days', classification: 'red' }];
    await coord.evaluateSnapshot({ heroKpis });
    clock.advance(60_000);
    const decisions = await coord.evaluateSnapshot({ heroKpis });
    const key = decisions.find(d => d.action === 'fire').correlationKey;

    const res = await request(mountApp(coord))
      .post(`/api/v1/dashboards/alerts/${encodeURIComponent(key)}/snooze`)
      .send({ minutes: 30 });
    expect(res.status).toBe(200);
    expect(res.body.alert.snoozeUntil).toBeGreaterThan(clock.now());
  });

  it('POST /:key/mute persists hours + reason', async () => {
    const clock = stubClock();
    const { coord } = makeCoord({ clock });
    const heroKpis = [{ id: 'finance.ar.dso.days', classification: 'red' }];
    await coord.evaluateSnapshot({ heroKpis });
    clock.advance(60_000);
    const decisions = await coord.evaluateSnapshot({ heroKpis });
    const key = decisions.find(d => d.action === 'fire').correlationKey;

    const res = await request(mountApp(coord))
      .post(`/api/v1/dashboards/alerts/${encodeURIComponent(key)}/mute`)
      .send({ hours: 2, reason: 'capa-linked' });
    expect(res.status).toBe(200);
    expect(res.body.alert.muteReason).toBe('capa-linked');
  });

  it('GET / returns 503 when the coordinator is missing', async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = { id: 'u' };
      next();
    });
    app.use('/api/v1/dashboards/alerts', buildRouter());
    const res = await request(app).get('/api/v1/dashboards/alerts');
    expect(res.status).toBe(503);
  });
});

'use strict';
/**
 * ops-schedulers-health-endpoint.test.js — Wave 321
 *
 * Uptime-monitor hook contract. `GET /api/ops/schedulers/health` MUST:
 *   - return 200 + status:'ok'        when every entry is 'ok' or 'never-run'
 *   - return 503 + status:'degraded'  when any entry is 'failed' or 'stale'
 *   - return 200 + status:'ok' + total:0 when registry is empty
 *   - never throw on a registry load error (returns empty list instead)
 */

const express = require('express');
const request = require('supertest');

jest.isolateModules(() => {}); // ensure fresh require per test below

describe('GET /api/ops/schedulers/health (W321)', () => {
  let registry;
  let app;

  beforeEach(() => {
    jest.resetModules();
    registry = require('../intelligence/scheduler-registry');
    registry.clear ? registry.clear() : registry._reset();
    const { createOpsSchedulersRouter } = require('../routes/ops-schedulers.routes');
    app = express();
    app.use('/api/ops', createOpsSchedulersRouter());
  });

  afterEach(() => {
    if (
      registry &&
      (typeof registry.clear === 'function' || typeof registry._reset === 'function')
    ) {
      (registry.clear || registry._reset).call(registry);
    }
  });

  it('returns 200 + ok when registry is empty', async () => {
    const res = await request(app).get('/api/ops/schedulers/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.total).toBe(0);
    expect(res.body.degraded).toBe(0);
  });

  it('returns 200 + ok when all entries are healthy', async () => {
    registry.register('alpha', { meta: { intervalMs: 60_000 } });
    registry.recordRun('alpha', { ok: true, durationMs: 5 });
    const res = await request(app).get('/api/ops/schedulers/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.total).toBe(1);
    expect(res.body.degraded).toBe(0);
    expect(res.body.entries[0]).toEqual({ key: 'alpha', health: 'ok' });
  });

  it('returns 200 + ok when entry is never-run (just registered)', async () => {
    registry.register('beta', { meta: { intervalMs: 60_000 } });
    const res = await request(app).get('/api/ops/schedulers/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.entries[0].health).toBe('never-run');
  });

  it('returns 503 + degraded when an entry is failed', async () => {
    registry.register('gamma', { meta: { intervalMs: 60_000 } });
    registry.recordRun('gamma', { ok: false, error: new Error('boom'), durationMs: 1 });
    const res = await request(app).get('/api/ops/schedulers/health');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.degraded).toBe(1);
    expect(res.body.entries.find(e => e.key === 'gamma').health).toBe('failed');
  });

  it('returns 503 + degraded when an entry is stale (last ok > 2× cadence)', async () => {
    const realNow = Date.now;
    try {
      registry.register('delta', { meta: { intervalMs: 1000 } });
      // record a successful run "now"
      registry.recordRun('delta', { ok: true, durationMs: 1 });
      // fast-forward beyond 2× cadence
      Date.now = () => realNow() + 5000;
      const res = await request(app).get('/api/ops/schedulers/health');
      expect(res.status).toBe(503);
      expect(res.body.entries.find(e => e.key === 'delta').health).toBe('stale');
    } finally {
      Date.now = realNow;
    }
  });

  it('mixed states: degraded if any one fails, healthy entries still listed', async () => {
    registry.register('ok-one', { meta: { intervalMs: 60_000 } });
    registry.recordRun('ok-one', { ok: true, durationMs: 1 });
    registry.register('bad-one', { meta: { intervalMs: 60_000 } });
    registry.recordRun('bad-one', { ok: false, error: new Error('x'), durationMs: 1 });
    const res = await request(app).get('/api/ops/schedulers/health');
    expect(res.status).toBe(503);
    expect(res.body.total).toBe(2);
    expect(res.body.degraded).toBe(1);
  });
});

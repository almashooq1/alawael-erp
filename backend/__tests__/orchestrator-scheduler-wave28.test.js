/**
 * orchestrator-scheduler-wave28.test.js — Wave 28.
 *
 *   1. computeNextRun for each cadence type
 *      • interval-min: lastRunAt + everyMin
 *      • interval-min lag recovery (catch-up doesn't fire all missed ticks)
 *      • daily-ksa: next UTC instant matching the KSA HH:MM
 *      • weekly-ksa: walks forward to the target dayOfWeek
 *      • ksaToUtcDate converts +3 offset correctly
 *
 *   2. Scheduler tick
 *      • runs generators whose nextRunAt has passed
 *      • skips generators whose nextRunAt is in the future
 *      • updates state (lastRunAt, runs counter, nextRunAt) per fire
 *      • orchestrator throw doesn't break the tick
 *      • disabled generator (cadence set to null) doesn't fire
 *
 *   3. runNow — admin "fire now" bypasses cadence
 *
 *   4. getStatus — returns per-generator state including stubbed ones
 *
 *   5. Loaders registry
 *      • buildLoaders returns the stub set + reference loader for DQ
 *      • dataQualityLoader produces snapshots from registry
 *      • realLoaders overrides override the stubs
 *      • null factory return drops the generator from the map
 *
 *   6. Status route (/orchestrator/status) — returns 503 when scheduler
 *      not attached, returns status when attached
 */

'use strict';

const express = require('express');
const request = require('supertest');

const {
  createOrchestratorScheduler,
  DEFAULT_CADENCES,
} = require('../intelligence/orchestrator-scheduler.service');
const {
  buildLoaders,
  dataQualityLoader,
} = require('../intelligence/orchestrator-loaders.registry');
const dqRegistry = require('../intelligence/data-quality.registry');

// ─── 1. computeNextRun ─────────────────────────────────────────

describe('orchestrator-scheduler — computeNextRun', () => {
  const mockOrch = { runGenerator: async () => ({ ok: true }) };
  const fixedNow = new Date('2026-05-17T10:00:00Z');
  const sched = createOrchestratorScheduler({
    orchestrator: mockOrch,
    now: () => fixedNow,
    logger: { info: () => {}, warn: () => {} },
  });
  const { computeNextRun, ksaToUtcDate } = sched._internal;

  test('interval-min: lastRun + everyMin', () => {
    const next = computeNextRun(
      { type: 'interval-min', everyMin: 15 },
      new Date('2026-05-17T10:00:00Z'),
      new Date('2026-05-17T10:05:00Z')
    );
    expect(next.toISOString()).toBe('2026-05-17T10:15:00.000Z');
  });

  test('interval-min lag recovery: if next < now, jump to now + interval', () => {
    // lastRunAt was an hour ago, everyMin=15 → next "should be" 45min ago
    // recovery: emit now + 15min, not 4 missed ticks
    const next = computeNextRun(
      { type: 'interval-min', everyMin: 15 },
      new Date('2026-05-17T09:00:00Z'),
      new Date('2026-05-17T10:00:00Z')
    );
    expect(next.toISOString()).toBe('2026-05-17T10:15:00.000Z');
  });

  test('ksaToUtcDate: KSA 16:30 = UTC 13:30', () => {
    const utc = ksaToUtcDate(16, 30, new Date('2026-05-17T05:00:00Z'));
    expect(utc.toISOString()).toBe('2026-05-17T13:30:00.000Z');
  });

  test('ksaToUtcDate: KSA 02:00 wraps to previous UTC day', () => {
    // KSA 02:00 = UTC 23:00 of PREVIOUS day
    const utc = ksaToUtcDate(2, 0, new Date('2026-05-17T20:00:00Z'));
    // Target is today 23:00 UTC (= tomorrow 02:00 KSA) — future
    expect(utc.toISOString()).toBe('2026-05-17T23:00:00.000Z');
  });

  test('ksaToUtcDate: rolls forward when target already past today', () => {
    // KSA 08:00 = UTC 05:00. If now is UTC 06:00, today's run has passed.
    const utc = ksaToUtcDate(8, 0, new Date('2026-05-17T06:00:00Z'));
    expect(utc.toISOString()).toBe('2026-05-18T05:00:00.000Z');
  });

  test('daily-ksa: returns the next UTC instant for the cadence', () => {
    // Cadence: KSA 16:30. Now: KSA 12:00 (UTC 09:00). Target: UTC 13:30.
    const next = computeNextRun(
      { type: 'daily-ksa', hour: 16, minute: 30 },
      null,
      new Date('2026-05-17T09:00:00Z')
    );
    expect(next.toISOString()).toBe('2026-05-17T13:30:00.000Z');
  });

  test('weekly-ksa: Monday 07:00 from a Sunday', () => {
    // 2026-05-17 was a Sunday. Cadence: Monday (1) 07:00 KSA = 04:00 UTC.
    const next = computeNextRun(
      { type: 'weekly-ksa', dayOfWeek: 1, hour: 7, minute: 0 },
      null,
      new Date('2026-05-17T10:00:00Z') // Sunday
    );
    expect(next.getUTCDay()).toBe(1); // Monday
    expect(next.getUTCHours()).toBe(4); // 07:00 KSA
  });
});

// ─── 2. Scheduler tick ─────────────────────────────────────────

describe('orchestrator-scheduler — tick', () => {
  function makeMockOrch(fireResults = {}) {
    const calls = [];
    return {
      calls,
      async runGenerator(generatorId) {
        calls.push({ generatorId, at: Date.now() });
        const v = fireResults[generatorId];
        if (typeof v === 'function') return v();
        return v || { ok: true, generatorId };
      },
    };
  }

  test('fires generators whose nextRunAt has passed', async () => {
    const orch = makeMockOrch();
    let nowTime = new Date('2026-05-17T10:00:00Z').getTime();
    const clock = () => new Date(nowTime);
    const sched = createOrchestratorScheduler({
      orchestrator: orch,
      cadences: {
        'care-gap.v1': { type: 'interval-min', everyMin: 5 },
        // disable the rest for this test
        'anomaly.v1': null,
        'trend-deviation.v1': null,
        'data-quality.v1': null,
        'end-of-day.v1': null,
        'executive-digest.v1': null,
      },
      now: clock,
      logger: { info: () => {}, warn: () => {} },
    });

    // First tick — nextRunAt is 5 min from boot, so nothing fires yet
    let r = await sched.tick();
    expect(r.fired).toHaveLength(0);

    // Advance 6 minutes
    nowTime += 6 * 60_000;
    r = await sched.tick();
    expect(r.fired).toHaveLength(1);
    expect(r.fired[0].generatorId).toBe('care-gap.v1');

    // Status reflects the run
    const status = sched.getStatus();
    expect(status.generators['care-gap.v1'].runs).toBe(1);
    expect(status.generators['care-gap.v1'].nextRunAt).toBeInstanceOf(Date);
  });

  test('orchestrator throw is caught + counted as failure', async () => {
    let nowTime = new Date('2026-05-17T10:00:00Z').getTime();
    const orch = {
      runGenerator: async () => {
        throw new Error('boom');
      },
    };
    const sched = createOrchestratorScheduler({
      orchestrator: orch,
      cadences: {
        'care-gap.v1': { type: 'interval-min', everyMin: 1 },
        'anomaly.v1': null,
        'trend-deviation.v1': null,
        'data-quality.v1': null,
        'end-of-day.v1': null,
        'executive-digest.v1': null,
      },
      now: () => new Date(nowTime),
      logger: { info: () => {}, warn: () => {} },
    });
    nowTime += 2 * 60_000; // past first run
    const r = await sched.tick();
    expect(r.fired).toHaveLength(1);
    expect(r.fired[0].error).toMatch(/boom/);
    expect(sched.getStatus().generators['care-gap.v1'].failures).toBe(1);
  });

  test('disabled generator (cadence null) does not fire', async () => {
    let nowTime = new Date('2026-05-17T10:00:00Z').getTime();
    const orch = makeMockOrch();
    const sched = createOrchestratorScheduler({
      orchestrator: orch,
      cadences: {
        'care-gap.v1': null, // explicitly disabled
        'anomaly.v1': null,
        'trend-deviation.v1': null,
        'data-quality.v1': null,
        'end-of-day.v1': null,
        'executive-digest.v1': null,
      },
      now: () => new Date(nowTime),
      logger: { info: () => {}, warn: () => {} },
    });
    nowTime += 60 * 60_000;
    const r = await sched.tick();
    expect(r.fired).toHaveLength(0);
    expect(orch.calls).toHaveLength(0);
  });
});

// ─── 3. runNow ─────────────────────────────────────────────────

describe('orchestrator-scheduler — runNow', () => {
  test('fires immediately regardless of cadence', async () => {
    const orch = { runGenerator: async gid => ({ ok: true, generatorId: gid }) };
    const sched = createOrchestratorScheduler({
      orchestrator: orch,
      now: () => new Date('2026-05-17T10:00:00Z'),
      logger: { info: () => {}, warn: () => {} },
    });
    const r = await sched.runNow('care-gap.v1');
    expect(r.ok).toBe(true);
    expect(sched.getStatus().generators['care-gap.v1'].runs).toBe(1);
  });

  test('catches orchestrator throw + counts as failure', async () => {
    const orch = {
      runGenerator: async () => {
        throw new Error('kaboom');
      },
    };
    const sched = createOrchestratorScheduler({
      orchestrator: orch,
      now: () => new Date('2026-05-17T10:00:00Z'),
      logger: { info: () => {}, warn: () => {} },
    });
    const r = await sched.runNow('care-gap.v1');
    expect(r.error).toMatch(/kaboom/);
    expect(sched.getStatus().generators['care-gap.v1'].failures).toBe(1);
  });
});

// ─── 4. getStatus ──────────────────────────────────────────────

describe('orchestrator-scheduler — getStatus', () => {
  test('reports every registered generator with cadence + nextRunAt', () => {
    const orch = { runGenerator: async () => ({ ok: true }) };
    const sched = createOrchestratorScheduler({
      orchestrator: orch,
      now: () => new Date('2026-05-17T10:00:00Z'),
      logger: { info: () => {}, warn: () => {} },
    });
    const status = sched.getStatus();
    // All 6 default cadences should be pre-initialized
    expect(Object.keys(status.generators)).toHaveLength(Object.keys(DEFAULT_CADENCES).length);
    expect(status.tickIntervalMs).toBe(60_000);
    for (const gid of Object.keys(DEFAULT_CADENCES)) {
      expect(status.generators[gid].nextRunAt).toBeInstanceOf(Date);
    }
  });
});

// ─── 5. Loaders registry ──────────────────────────────────────

describe('orchestrator-loaders — buildLoaders', () => {
  test('returns 5 stub loaders + 1 reference loader (data-quality.v1)', () => {
    const { loaders, stubbedGeneratorIds } = buildLoaders({
      deps: { dqRegistry },
      logger: { info: () => {}, warn: () => {} },
    });
    expect(Object.keys(loaders)).toEqual(
      expect.arrayContaining([
        'care-gap.v1',
        'anomaly.v1',
        'trend-deviation.v1',
        'data-quality.v1',
        'end-of-day.v1',
        'executive-digest.v1',
      ])
    );
    expect(stubbedGeneratorIds).toEqual(
      expect.arrayContaining([
        'care-gap.v1',
        'anomaly.v1',
        'trend-deviation.v1',
        'end-of-day.v1',
        'executive-digest.v1',
      ])
    );
    // data-quality.v1 is NOT in stubs — it's the reference
    expect(stubbedGeneratorIds).not.toContain('data-quality.v1');
  });

  test('dataQualityLoader emits one snapshot per registered dataset', async () => {
    const factory = dataQualityLoader({ dqRegistry, logger: { warn: () => {} } });
    const ctx = await factory();
    expect(ctx.snapshots.length).toBeGreaterThanOrEqual(12);
    expect(ctx.snapshots[0].datasetId).toBeTruthy();
    expect(ctx.snapshots[0].sampleSize).toBe(100);
  });

  test('dataQualityLoader returns null when dqRegistry missing', () => {
    const factory = dataQualityLoader({ logger: { warn: () => {} } });
    expect(factory).toBeNull();
  });

  test('realLoaders override the stubs', () => {
    const realCareGap = () => ({ beneficiaries: [{ _id: 'b1' }] });
    const { loaders } = buildLoaders({
      deps: { dqRegistry },
      realLoaders: { 'care-gap.v1': realCareGap },
    });
    expect(loaders['care-gap.v1']).toBe(realCareGap);
  });

  test('stub loaders return empty contexts (no spurious payloads)', async () => {
    const { loaders } = buildLoaders({ deps: { dqRegistry } });
    expect(await loaders['care-gap.v1']()).toEqual({ beneficiaries: [] });
    expect(await loaders['anomaly.v1']()).toEqual({ series: [] });
    expect(await loaders['end-of-day.v1']()).toEqual({ summaries: [] });
    expect(await loaders['executive-digest.v1']()).toEqual({ comparisons: [] });
  });
});

// ─── 6. Status route ──────────────────────────────────────────

describe('insights.routes — orchestrator status endpoint', () => {
  const { createInsightsRouter } = require('../routes/insights.routes');

  function buildApp({ schedulerOnApp = null } = {}) {
    const insightsStub = {
      confirmInsight: async () => ({ ok: true }),
      generatorScoreboard: async () => [],
    };
    const app = express();
    app.use(express.json());
    if (schedulerOnApp) app._intelligenceScheduler = schedulerOnApp;
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = { id: 'u1', role: 'manager' };
      next();
    });
    app.use('/api/v1/insights', createInsightsRouter({ insights: insightsStub }));
    return app;
  }

  test('GET /orchestrator/status returns 503 when scheduler not attached', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/v1/insights/orchestrator/status');
    expect(res.status).toBe(503);
    expect(res.body.reason).toBe('ORCHESTRATOR_NOT_RUNNING');
    expect(res.body.hint).toMatch(/INTELLIGENCE_ORCHESTRATOR_ENABLED/);
  });

  test('GET /orchestrator/status returns scheduler status when attached', async () => {
    const orch = { runGenerator: async () => ({ ok: true }) };
    const scheduler = createOrchestratorScheduler({
      orchestrator: orch,
      logger: { info: () => {}, warn: () => {} },
    });
    const app = buildApp({ schedulerOnApp: scheduler });
    const res = await request(app).get('/api/v1/insights/orchestrator/status');
    expect(res.status).toBe(200);
    expect(res.body.data.tickIntervalMs).toBe(60_000);
    expect(Object.keys(res.body.data.generators).length).toBeGreaterThan(0);
  });

  test('POST /orchestrator/run-now/:id 503 when not running', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/v1/insights/orchestrator/run-now/care-gap.v1');
    expect(res.status).toBe(503);
  });

  test('POST /orchestrator/run-now/:id fires the generator', async () => {
    const orchCalls = [];
    const orch = {
      runGenerator: async gid => {
        orchCalls.push(gid);
        return { ok: true, generatorId: gid };
      },
    };
    const scheduler = createOrchestratorScheduler({
      orchestrator: orch,
      logger: { info: () => {}, warn: () => {} },
    });
    const app = buildApp({ schedulerOnApp: scheduler });
    const res = await request(app).post('/api/v1/insights/orchestrator/run-now/care-gap.v1');
    expect(res.status).toBe(200);
    expect(orchCalls).toContain('care-gap.v1');
  });
});

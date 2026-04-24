'use strict';

/**
 * hr-ops-anomaly-scheduler.test.js — Phase 11 Commit 24 (4.0.41).
 *
 * Supertest coverage for the ops observability + manual-tick
 * surface on top of hrAnomalyScheduler (C23).
 */

const express = require('express');
const request = require('supertest');

const { createHrOpsRouter } = require('../routes/hr/hr-ops.routes');
const { ROLES } = require('../config/rbac.config');

function fakeScheduler(overrides = {}) {
  const defaultStatus = {
    isRunning: true,
    scanInFlight: false,
    intervalMs: 900000,
    runOnStart: true,
    lastRunAt: '2026-04-23T12:00:00.000Z',
    runCount: 17,
    skipCount: 1,
    lastReport: {
      scannedAt: '2026-04-23T12:00:00.000Z',
      totals: { read_anomalies: 2, export_anomalies: 0, cooldown_skipped: 1 },
      flagged: [],
    },
    lastError: null,
  };
  return {
    getStatus: jest.fn(() => overrides.status || defaultStatus),
    tick: jest.fn(
      overrides.tick ||
        (async () => ({
          skipped: false,
          report: {
            scannedAt: '2026-04-23T12:00:00.000Z',
            totals: { read_anomalies: 0, export_anomalies: 0, cooldown_skipped: 0 },
            flagged: [],
          },
        }))
    ),
  };
}

function buildApp({ user, scheduler }) {
  const app = express();
  app.use(express.json());
  if (user) {
    app.use((req, _res, next) => {
      req.user = user;
      next();
    });
  }
  app.use(
    createHrOpsRouter({
      resolveScheduler: () => scheduler,
    })
  );
  return app;
}

// ─── Construction ───────────────────────────────────────────────

describe('createHrOpsRouter — construction', () => {
  it('throws when resolveScheduler is missing', () => {
    expect(() => createHrOpsRouter({})).toThrow(/resolveScheduler function/);
  });
});

// ─── GET /ops/anomaly-scheduler ─────────────────────────────────

describe('GET /ops/anomaly-scheduler', () => {
  it('401 without auth', async () => {
    const app = buildApp({ scheduler: fakeScheduler() });
    const res = await request(app).get('/ops/anomaly-scheduler');
    expect(res.status).toBe(401);
  });

  it('403 for non-manager role', async () => {
    const res = await request(
      buildApp({ user: { id: 'u', role: ROLES.HR_OFFICER }, scheduler: fakeScheduler() })
    ).get('/ops/anomaly-scheduler');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('requires manager tier');
  });

  it('503 when scheduler not yet initialized', async () => {
    const res = await request(
      buildApp({ user: { id: 'u', role: ROLES.HR_MANAGER }, scheduler: null })
    ).get('/ops/anomaly-scheduler');
    expect(res.status).toBe(503);
    expect(res.body.error).toBe('scheduler not yet initialized');
  });

  it('200 returns getStatus() payload for MANAGER tier', async () => {
    const sched = fakeScheduler();
    const res = await request(
      buildApp({ user: { id: 'u', role: ROLES.HR_MANAGER }, scheduler: sched })
    ).get('/ops/anomaly-scheduler');
    expect(res.status).toBe(200);
    expect(res.body.isRunning).toBe(true);
    expect(res.body.runCount).toBe(17);
    expect(res.body.lastReport.totals.read_anomalies).toBe(2);
    expect(sched.getStatus).toHaveBeenCalledTimes(1);
  });

  it('works for SUPER_ADMIN + COMPLIANCE_OFFICER', async () => {
    for (const role of [
      ROLES.SUPER_ADMIN,
      ROLES.HEAD_OFFICE_ADMIN,
      ROLES.COMPLIANCE_OFFICER,
      ROLES.GROUP_CHRO,
      ROLES.HR_SUPERVISOR,
    ]) {
      const res = await request(
        buildApp({ user: { id: 'u', role }, scheduler: fakeScheduler() })
      ).get('/ops/anomaly-scheduler');
      expect(res.status).toBe(200);
    }
  });
});

// ─── POST /ops/anomaly-scheduler/tick ───────────────────────────

describe('POST /ops/anomaly-scheduler/tick', () => {
  it('401 without auth', async () => {
    const app = buildApp({ scheduler: fakeScheduler() });
    const res = await request(app).post('/ops/anomaly-scheduler/tick');
    expect(res.status).toBe(401);
  });

  it('403 for THERAPIST', async () => {
    const res = await request(
      buildApp({ user: { id: 'u', role: ROLES.THERAPIST }, scheduler: fakeScheduler() })
    ).post('/ops/anomaly-scheduler/tick');
    expect(res.status).toBe(403);
  });

  it('403 for HR_OFFICER — officer tier below manager', async () => {
    const res = await request(
      buildApp({ user: { id: 'u', role: ROLES.HR_OFFICER }, scheduler: fakeScheduler() })
    ).post('/ops/anomaly-scheduler/tick');
    expect(res.status).toBe(403);
  });

  it('503 when scheduler not yet initialized', async () => {
    const res = await request(
      buildApp({ user: { id: 'u', role: ROLES.HR_MANAGER }, scheduler: null })
    ).post('/ops/anomaly-scheduler/tick');
    expect(res.status).toBe(503);
  });

  it('200 triggers a scan and returns the report', async () => {
    const sched = fakeScheduler();
    const res = await request(
      buildApp({ user: { id: 'u', role: ROLES.HR_MANAGER }, scheduler: sched })
    ).post('/ops/anomaly-scheduler/tick');
    expect(res.status).toBe(200);
    expect(res.body.triggered).toBe(true);
    expect(res.body.report.totals.read_anomalies).toBe(0);
    expect(sched.tick).toHaveBeenCalledTimes(1);
  });

  it('409 on overlap — scan already in flight', async () => {
    const sched = fakeScheduler({
      tick: async () => ({ skipped: true, reason: 'overlap' }),
    });
    const res = await request(
      buildApp({ user: { id: 'u', role: ROLES.HR_MANAGER }, scheduler: sched })
    ).post('/ops/anomaly-scheduler/tick');
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('scan_in_flight');
    expect(res.body.reason).toBe('overlap');
  });

  it('500 when scheduler.tick returns an error', async () => {
    const sched = fakeScheduler({
      tick: async () => ({ skipped: false, error: 'DB unreachable' }),
    });
    const res = await request(
      buildApp({ user: { id: 'u', role: ROLES.HR_MANAGER }, scheduler: sched })
    ).post('/ops/anomaly-scheduler/tick');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('scan_failed');
    expect(res.body.message).toBe('DB unreachable');
  });

  it('500 when scheduler.tick throws', async () => {
    const sched = fakeScheduler({
      tick: async () => {
        throw new Error('totally broken');
      },
    });
    const res = await request(
      buildApp({ user: { id: 'u', role: ROLES.HR_MANAGER }, scheduler: sched })
    ).post('/ops/anomaly-scheduler/tick');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('tick failed');
  });
});

// ─── Late-binding ───────────────────────────────────────────────

describe('late-binding', () => {
  it('resolveScheduler is called per-request, not at mount time', async () => {
    let currentScheduler = null;
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = { id: 'u', role: ROLES.HR_MANAGER };
      next();
    });
    app.use(createHrOpsRouter({ resolveScheduler: () => currentScheduler }));

    // First call: scheduler not available yet
    let res = await request(app).get('/ops/anomaly-scheduler');
    expect(res.status).toBe(503);

    // Scheduler comes up later
    currentScheduler = fakeScheduler();
    res = await request(app).get('/ops/anomaly-scheduler');
    expect(res.status).toBe(200);
  });
});

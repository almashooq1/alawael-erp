'use strict';

/**
 * hr-health.test.js — Phase 11 Commit 30 (4.0.47).
 *
 * Service + route tests for the aggregated HR health check.
 */

jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createHrHealthService, DEFAULT_THRESHOLDS } = require('../services/hr/hrHealthService');
const { createHrOpsRouter } = require('../routes/hr/hr-ops.routes');
const { ROLES } = require('../config/rbac.config');

let mongoServer;
let AuditLog;
let HrChangeRequest;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'hr-health-test' });
  AuditLog = require('../models/auditLog.model').AuditLog;
  HrChangeRequest = require('../models/hr/HrChangeRequest');
}, 60_000);

afterAll(async () => {
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  if (mongoServer) await mongoServer.stop();
}, 60_000);

beforeEach(async () => {
  await AuditLog.deleteMany({});
  await HrChangeRequest.deleteMany({});
});

const NOW = new Date('2026-04-23T12:00:00.000Z');

function fakeScheduler(overrides = {}) {
  return {
    getStatus: () =>
      Object.assign(
        {
          isRunning: true,
          scanInFlight: false,
          intervalMs: 900000,
          runOnStart: true,
          lastRunAt: new Date(NOW.getTime() - 5 * 60 * 1000).toISOString(),
          runCount: 42,
          skipCount: 1,
          lastReport: null,
          lastError: null,
        },
        overrides
      ),
  };
}

function buildService({ getScheduler = () => fakeScheduler(), thresholds = {} } = {}) {
  return createHrHealthService({
    auditLogModel: AuditLog,
    changeRequestModel: HrChangeRequest,
    getScheduler,
    now: () => NOW,
    thresholds,
  });
}

async function seedAnomaly({ requiresReview = true }) {
  return AuditLog.create({
    eventType: 'security.suspicious_activity',
    eventCategory: 'security',
    severity: 'high',
    status: 'success',
    userId: new mongoose.Types.ObjectId(),
    resource: 'hr:anomaly:test',
    message: 'test',
    metadata: { custom: { reason: 'excessive_reads' } },
    tags: ['hr', 'hr:anomaly'],
    flags: { isSuspicious: true, requiresReview },
  });
}

async function seedChangeRequest({ status = 'pending' }) {
  const _id = new mongoose.Types.ObjectId();
  await mongoose.connection.db.collection(HrChangeRequest.collection.collectionName).insertOne({
    _id,
    employee_id: new mongoose.Types.ObjectId(),
    branch_id: new mongoose.Types.ObjectId(),
    requestor_user_id: new mongoose.Types.ObjectId(),
    requestor_role: 'hr_manager',
    proposed_changes: {},
    baseline_values: {},
    rules_triggered: [],
    status,
    deleted_at: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

async function seedHrAuditRow({ isArchived = false }) {
  return AuditLog.create({
    eventType: 'data.read',
    eventCategory: 'data',
    severity: 'info',
    status: 'success',
    userId: new mongoose.Types.ObjectId(),
    resource: 'hr:test',
    message: 'test',
    metadata: { custom: {} },
    tags: ['hr'],
    flags: { isArchived },
  });
}

// ─── Defaults ───────────────────────────────────────────────────

describe('createHrHealthService', () => {
  it('exposes DEFAULT_THRESHOLDS', () => {
    expect(DEFAULT_THRESHOLDS.schedulerStaleAfterMs).toBeGreaterThan(0);
    expect(DEFAULT_THRESHOLDS.hotLogCeilingRows).toBeGreaterThan(0);
    expect(DEFAULT_THRESHOLDS.changeRequestQueueWarning).toBeGreaterThan(0);
  });
});

// ─── Healthy baseline ───────────────────────────────────────────

describe('checkHealth — healthy baseline', () => {
  it('returns status=healthy with empty warnings on clean state', async () => {
    const report = await buildService().checkHealth();
    expect(report.status).toBe('healthy');
    expect(report.warnings).toEqual([]);
    expect(report.subsystems.scheduler.status).toBe('healthy');
    expect(report.subsystems.audit_log.status).toBe('healthy');
    expect(report.subsystems.change_request_queue.status).toBe('healthy');
    expect(report.subsystems.anomaly_queue.status).toBe('healthy');
    expect(report.checkedAt).toBe(NOW.toISOString());
  });
});

// ─── Scheduler checks ───────────────────────────────────────────

describe('checkHealth — scheduler', () => {
  it('flags as unhealthy when scheduler is stopped', async () => {
    const svc = buildService({
      getScheduler: () => fakeScheduler({ isRunning: false }),
    });
    const report = await svc.checkHealth();
    expect(report.status).toBe('unhealthy');
    expect(report.subsystems.scheduler.severity).toBe('critical');
    expect(report.subsystems.scheduler.status).toBe('stopped');
  });

  it('flags as degraded when last run is stale', async () => {
    const svc = buildService({
      getScheduler: () =>
        fakeScheduler({
          lastRunAt: new Date(NOW.getTime() - 3 * 60 * 60 * 1000).toISOString(),
        }),
    });
    const report = await svc.checkHealth();
    expect(report.status).toBe('degraded');
    expect(report.subsystems.scheduler.status).toBe('stale');
    expect(report.subsystems.scheduler.severity).toBe('warning');
  });

  it('flags as degraded when scheduler reports recent error', async () => {
    const svc = buildService({
      getScheduler: () => fakeScheduler({ lastError: { message: 'Mongo unreachable' } }),
    });
    const report = await svc.checkHealth();
    expect(report.status).toBe('degraded');
    expect(report.subsystems.scheduler.status).toBe('recent_error');
    expect(report.subsystems.scheduler.details).toContain('Mongo');
  });

  it('flags as degraded when scheduler is absent', async () => {
    const svc = buildService({ getScheduler: () => null });
    const report = await svc.checkHealth();
    expect(report.status).toBe('degraded');
    expect(report.subsystems.scheduler.status).toBe('absent');
    expect(report.subsystems.scheduler.severity).toBe('warning');
  });
});

// ─── Audit log checks ───────────────────────────────────────────

describe('checkHealth — audit_log', () => {
  it('flags over_ceiling when hot tier exceeds threshold', async () => {
    const svc = buildService({
      thresholds: { hotLogCeilingRows: 2, hotLogWarningRows: 1 },
    });
    await seedHrAuditRow({ isArchived: false });
    await seedHrAuditRow({ isArchived: false });
    await seedHrAuditRow({ isArchived: false });
    const report = await svc.checkHealth();
    expect(report.status).toBe('unhealthy');
    expect(report.subsystems.audit_log.status).toBe('over_ceiling');
    expect(report.subsystems.audit_log.severity).toBe('critical');
  });

  it('flags high_volume when hot tier crosses warning but not ceiling', async () => {
    const svc = buildService({
      thresholds: { hotLogCeilingRows: 10, hotLogWarningRows: 2 },
    });
    await seedHrAuditRow({ isArchived: false });
    await seedHrAuditRow({ isArchived: false });
    await seedHrAuditRow({ isArchived: false });
    const report = await svc.checkHealth();
    expect(report.status).toBe('degraded');
    expect(report.subsystems.audit_log.status).toBe('high_volume');
    expect(report.subsystems.audit_log.severity).toBe('warning');
  });

  it('archived rows do NOT count toward hot-tier threshold', async () => {
    const svc = buildService({
      thresholds: { hotLogCeilingRows: 2, hotLogWarningRows: 1 },
    });
    for (let i = 0; i < 5; i++) {
      await seedHrAuditRow({ isArchived: true });
    }
    const report = await svc.checkHealth();
    expect(report.subsystems.audit_log.status).toBe('healthy');
  });
});

// ─── Change-request queue ───────────────────────────────────────

describe('checkHealth — change_request_queue', () => {
  it('flags backlog_critical when pending >= critical threshold', async () => {
    const svc = buildService({
      thresholds: { changeRequestQueueCritical: 3, changeRequestQueueWarning: 1 },
    });
    for (let i = 0; i < 4; i++) {
      await seedChangeRequest({ status: 'pending' });
    }
    const report = await svc.checkHealth();
    expect(report.status).toBe('unhealthy');
    expect(report.subsystems.change_request_queue.severity).toBe('critical');
  });

  it('flags backlog_warning when pending crosses warning but not critical', async () => {
    const svc = buildService({
      thresholds: { changeRequestQueueCritical: 10, changeRequestQueueWarning: 2 },
    });
    for (let i = 0; i < 3; i++) {
      await seedChangeRequest({ status: 'pending' });
    }
    const report = await svc.checkHealth();
    expect(report.status).toBe('degraded');
    expect(report.subsystems.change_request_queue.severity).toBe('warning');
  });

  it('non-pending statuses do NOT count', async () => {
    const svc = buildService({
      thresholds: { changeRequestQueueWarning: 1 },
    });
    for (let i = 0; i < 5; i++) {
      await seedChangeRequest({ status: 'applied' });
    }
    const report = await svc.checkHealth();
    expect(report.subsystems.change_request_queue.status).toBe('healthy');
  });
});

// ─── Anomaly queue ──────────────────────────────────────────────

describe('checkHealth — anomaly_queue', () => {
  it('flags backlog_critical when anomaly pending-review count crosses threshold', async () => {
    const svc = buildService({
      thresholds: { anomalyQueueCritical: 3, anomalyQueueWarning: 1 },
    });
    for (let i = 0; i < 4; i++) {
      await seedAnomaly({ requiresReview: true });
    }
    const report = await svc.checkHealth();
    expect(report.status).toBe('unhealthy');
    expect(report.subsystems.anomaly_queue.severity).toBe('critical');
  });

  it('reviewed anomalies do NOT count', async () => {
    const svc = buildService({
      thresholds: { anomalyQueueWarning: 1 },
    });
    for (let i = 0; i < 5; i++) {
      await seedAnomaly({ requiresReview: false });
    }
    const report = await svc.checkHealth();
    expect(report.subsystems.anomaly_queue.status).toBe('healthy');
  });
});

// ─── Aggregation semantics ──────────────────────────────────────

describe('aggregate status', () => {
  it('warnings array collates every non-healthy subsystem message', async () => {
    const svc = buildService({
      getScheduler: () => fakeScheduler({ isRunning: false }),
      thresholds: { anomalyQueueCritical: 1 },
    });
    await seedAnomaly({ requiresReview: true });

    const report = await svc.checkHealth();
    expect(report.status).toBe('unhealthy');
    expect(report.warnings.length).toBeGreaterThanOrEqual(2);
    expect(report.warnings.some(w => w.startsWith('scheduler:'))).toBe(true);
    expect(report.warnings.some(w => w.startsWith('anomaly_queue:'))).toBe(true);
  });

  it('unhealthy wins over degraded in aggregate verdict', async () => {
    const svc = buildService({
      getScheduler: () =>
        fakeScheduler({
          lastRunAt: new Date(NOW.getTime() - 3 * 60 * 60 * 1000).toISOString(), // warning
        }),
      thresholds: { anomalyQueueCritical: 1 },
    });
    await seedAnomaly({ requiresReview: true }); // critical

    const report = await svc.checkHealth();
    expect(report.status).toBe('unhealthy');
  });
});

// ─── Route layer ────────────────────────────────────────────────

describe('GET /ops/health route', () => {
  function buildApp({ user, health, scheduler = null }) {
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
        healthService: health,
      })
    );
    return app;
  }

  it('401 without auth', async () => {
    const app = buildApp({ health: buildService() });
    const res = await request(app).get('/ops/health');
    expect(res.status).toBe(401);
  });

  it('403 for non-manager role', async () => {
    const res = await request(
      buildApp({ user: { id: 'u', role: ROLES.HR_OFFICER }, health: buildService() })
    ).get('/ops/health');
    expect(res.status).toBe(403);
  });

  it('503 when healthService is absent', async () => {
    const res = await request(
      buildApp({ user: { id: 'u', role: ROLES.HR_MANAGER }, health: null })
    ).get('/ops/health');
    expect(res.status).toBe(503);
  });

  it('200 on healthy aggregate', async () => {
    const res = await request(
      buildApp({ user: { id: 'u', role: ROLES.HR_MANAGER }, health: buildService() })
    ).get('/ops/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.subsystems).toBeDefined();
    expect(res.body.checkedAt).toBeDefined();
  });

  it('200 on degraded aggregate (warnings present but non-critical)', async () => {
    const svc = buildService({
      getScheduler: () =>
        fakeScheduler({
          lastRunAt: new Date(NOW.getTime() - 3 * 60 * 60 * 1000).toISOString(),
        }),
    });
    const res = await request(
      buildApp({ user: { id: 'u', role: ROLES.HR_MANAGER }, health: svc })
    ).get('/ops/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('degraded');
    expect(res.body.warnings.length).toBeGreaterThan(0);
  });

  it('503 on unhealthy aggregate (uptime monitor should page)', async () => {
    const svc = buildService({
      getScheduler: () => fakeScheduler({ isRunning: false }),
    });
    const res = await request(
      buildApp({ user: { id: 'u', role: ROLES.HR_MANAGER }, health: svc })
    ).get('/ops/health');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('unhealthy');
  });
});

'use strict';

/**
 * hr-metrics.test.js — Phase 11 Commit 26 (4.0.43).
 *
 * Service tests for Prometheus text-exposition format + supertest
 * coverage of the /ops/metrics route.
 */

jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createHrMetricsService } = require('../services/hr/hrMetricsService');
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
  await mongoose.connect(mongoServer.getUri(), { dbName: 'hr-metrics-test' });
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
const MS_PER_DAY = 24 * 3600 * 1000;

async function seedAnomaly({
  reason = 'excessive_reads',
  daysAgo = 1,
  requiresReview = true,
  outcome = null,
}) {
  const createdAt = new Date(NOW.getTime() - daysAgo * MS_PER_DAY);
  const custom = { reason };
  if (outcome) {
    custom.review = {
      outcome,
      reviewerUserId: String(new mongoose.Types.ObjectId()),
      reviewedAt: createdAt.toISOString(),
    };
  }
  return AuditLog.create({
    eventType: 'security.suspicious_activity',
    eventCategory: 'security',
    severity: 'high',
    status: 'success',
    userId: new mongoose.Types.ObjectId(),
    resource: `hr:anomaly:${reason}`,
    message: 'test',
    metadata: { custom },
    tags: ['hr', 'hr:anomaly', reason],
    flags: { isSuspicious: true, requiresReview: outcome ? false : requiresReview },
    createdAt,
    updatedAt: createdAt,
  });
}

async function seedChangeRequest({ status = 'pending', daysAgo = 1 }) {
  const _id = new mongoose.Types.ObjectId();
  const createdAt = new Date(NOW.getTime() - daysAgo * MS_PER_DAY);
  await mongoose.connection.db.collection(HrChangeRequest.collection.collectionName).insertOne({
    _id,
    employee_id: new mongoose.Types.ObjectId(),
    branch_id: new mongoose.Types.ObjectId(),
    requestor_user_id: new mongoose.Types.ObjectId(),
    requestor_role: 'hr_manager',
    proposed_changes: { basic_salary: 15000 },
    baseline_values: {},
    rules_triggered: [],
    status,
    deleted_at: null,
    createdAt,
    updatedAt: createdAt,
  });
}

function fakeScheduler(overrides = {}) {
  return {
    getStatus: () => ({
      isRunning: true,
      scanInFlight: false,
      intervalMs: 900000,
      runOnStart: true,
      lastRunAt: '2026-04-23T11:45:00.000Z',
      runCount: 17,
      skipCount: 2,
      lastReport: null,
      lastError: null,
      ...overrides,
    }),
  };
}

function buildService({ withScheduler = true } = {}) {
  return createHrMetricsService({
    auditLogModel: AuditLog,
    changeRequestModel: HrChangeRequest,
    scheduler: withScheduler ? fakeScheduler() : null,
    now: () => NOW,
  });
}

// ─── Anomaly metrics ────────────────────────────────────────────

describe('anomaly metrics', () => {
  it('emits __none__ bucket for empty system', async () => {
    const body = await buildService().buildPrometheusText();
    expect(body).toContain('hr_anomalies_total{reason="__none__"} 0');
    expect(body).toContain('hr_anomaly_pending_count 0');
  });

  it('counts anomalies by reason over 30 days', async () => {
    await seedAnomaly({ reason: 'excessive_reads', daysAgo: 1 });
    await seedAnomaly({ reason: 'excessive_reads', daysAgo: 5 });
    await seedAnomaly({ reason: 'excessive_exports', daysAgo: 3 });
    // Outside window — excluded
    await seedAnomaly({ reason: 'excessive_reads', daysAgo: 60 });

    const body = await buildService().buildPrometheusText();
    expect(body).toContain('hr_anomalies_total{reason="excessive_reads"} 2');
    expect(body).toContain('hr_anomalies_total{reason="excessive_exports"} 1');
  });

  it('emits pending count as gauge (not 30d-scoped)', async () => {
    await seedAnomaly({ daysAgo: 1, requiresReview: true });
    await seedAnomaly({ daysAgo: 200, requiresReview: true }); // still pending, still counted
    await seedAnomaly({ daysAgo: 1, requiresReview: false });

    const body = await buildService().buildPrometheusText();
    expect(body).toContain('hr_anomaly_pending_count 2');
  });

  it('emits outcomes breakdown with all 5 buckets', async () => {
    await seedAnomaly({ daysAgo: 1, outcome: 'confirmed_breach' });
    await seedAnomaly({ daysAgo: 2, outcome: 'confirmed_breach' });
    await seedAnomaly({ daysAgo: 3, outcome: 'false_positive' });
    await seedAnomaly({ daysAgo: 4, outcome: 'needs_investigation' });
    await seedAnomaly({ daysAgo: 5 }); // unreviewed

    const body = await buildService().buildPrometheusText();
    expect(body).toContain('hr_anomaly_outcomes_total{outcome="confirmed_breach"} 2');
    expect(body).toContain('hr_anomaly_outcomes_total{outcome="false_positive"} 1');
    expect(body).toContain('hr_anomaly_outcomes_total{outcome="needs_investigation"} 1');
    expect(body).toContain('hr_anomaly_outcomes_total{outcome="policy_exception"} 0');
    expect(body).toContain('hr_anomaly_outcomes_total{outcome="unreviewed"} 1');
  });

  it('computes FP rate gauge', async () => {
    await seedAnomaly({ daysAgo: 1, outcome: 'confirmed_breach' });
    await seedAnomaly({ daysAgo: 2, outcome: 'confirmed_breach' });
    await seedAnomaly({ daysAgo: 3, outcome: 'confirmed_breach' });
    await seedAnomaly({ daysAgo: 4, outcome: 'false_positive' });

    const body = await buildService().buildPrometheusText();
    expect(body).toContain('hr_anomaly_false_positive_rate_pct 25');
  });

  it('emits NaN for FP rate when no decided outcomes', async () => {
    await seedAnomaly({ daysAgo: 1 }); // unreviewed only
    const body = await buildService().buildPrometheusText();
    expect(body).toContain('hr_anomaly_false_positive_rate_pct NaN');
  });
});

// ─── Change-request metrics ─────────────────────────────────────

describe('change-request metrics', () => {
  it('emits all status buckets even with zero counts', async () => {
    const body = await buildService().buildPrometheusText();
    for (const s of ['pending', 'approved', 'rejected', 'applied', 'cancelled']) {
      expect(body).toContain(`hr_change_requests_total{status="${s}"} 0`);
    }
    expect(body).toContain('hr_change_requests_pending 0');
  });

  it('counts by status in last 30 days', async () => {
    await seedChangeRequest({ status: 'applied', daysAgo: 5 });
    await seedChangeRequest({ status: 'applied', daysAgo: 10 });
    await seedChangeRequest({ status: 'rejected', daysAgo: 3 });
    await seedChangeRequest({ status: 'pending', daysAgo: 1 });
    // Outside window
    await seedChangeRequest({ status: 'applied', daysAgo: 60 });

    const body = await buildService().buildPrometheusText();
    expect(body).toContain('hr_change_requests_total{status="applied"} 2');
    expect(body).toContain('hr_change_requests_total{status="rejected"} 1');
    expect(body).toContain('hr_change_requests_total{status="pending"} 1');
  });

  it('pending gauge counts all-time, not 30d', async () => {
    await seedChangeRequest({ status: 'pending', daysAgo: 1 });
    await seedChangeRequest({ status: 'pending', daysAgo: 90 }); // still pending, still counted
    await seedChangeRequest({ status: 'applied', daysAgo: 2 });

    const body = await buildService().buildPrometheusText();
    expect(body).toContain('hr_change_requests_pending 2');
  });
});

// ─── Scheduler metrics ──────────────────────────────────────────

describe('scheduler metrics', () => {
  it('emits is_running + interval + counters', async () => {
    const body = await buildService().buildPrometheusText();
    expect(body).toContain('hr_scheduler_is_running 1');
    expect(body).toContain('hr_scheduler_interval_ms 900000');
    expect(body).toContain('hr_scheduler_run_count_total 17');
    expect(body).toContain('hr_scheduler_skip_count_total 2');
    expect(body).toContain('hr_scheduler_last_run_timestamp_seconds');
  });

  it('omits scheduler metrics when scheduler is missing', async () => {
    const body = await buildService({ withScheduler: false }).buildPrometheusText();
    expect(body).not.toContain('hr_scheduler_is_running');
    expect(body).not.toContain('hr_scheduler_interval_ms');
  });

  it('emits is_running=0 when scheduler reports stopped', async () => {
    const svc = createHrMetricsService({
      auditLogModel: AuditLog,
      changeRequestModel: HrChangeRequest,
      scheduler: fakeScheduler({ isRunning: false }),
      now: () => NOW,
    });
    const body = await svc.buildPrometheusText();
    expect(body).toContain('hr_scheduler_is_running 0');
  });
});

// ─── Storage metrics (C29) ──────────────────────────────────────

describe('storage metrics', () => {
  async function seedRow({ isArchived = false, tags = ['hr'] }) {
    return AuditLog.create({
      eventType: 'data.read',
      eventCategory: 'data',
      severity: 'info',
      status: 'success',
      userId: new mongoose.Types.ObjectId(),
      resource: 'hr:seed',
      message: 'test',
      metadata: { custom: {} },
      tags,
      flags: { isArchived },
    });
  }

  it('counts total, hot, and archived HR rows', async () => {
    await seedRow({ isArchived: false });
    await seedRow({ isArchived: false });
    await seedRow({ isArchived: false });
    await seedRow({ isArchived: true });
    await seedRow({ isArchived: true });
    // Non-HR row — excluded
    await seedRow({ isArchived: false, tags: ['billing'] });

    const body = await buildService().buildPrometheusText();
    expect(body).toContain('hr_audit_log_total_count 5');
    expect(body).toContain('hr_audit_log_hot_count 3');
    expect(body).toContain('hr_audit_log_archived_count 2');
  });

  it('emits zero when collection is empty', async () => {
    const body = await buildService().buildPrometheusText();
    expect(body).toContain('hr_audit_log_total_count 0');
    expect(body).toContain('hr_audit_log_hot_count 0');
    expect(body).toContain('hr_audit_log_archived_count 0');
  });

  it('excludes non-HR tagged rows', async () => {
    await seedRow({ tags: ['billing'] });
    await seedRow({ tags: ['clinical'] });
    const body = await buildService().buildPrometheusText();
    expect(body).toContain('hr_audit_log_total_count 0');
  });

  it('storage metrics omitted when auditLogModel is absent', async () => {
    const svc = createHrMetricsService({
      changeRequestModel: HrChangeRequest,
      scheduler: fakeScheduler(),
      now: () => NOW,
    });
    const body = await svc.buildPrometheusText();
    expect(body).not.toContain('hr_audit_log_total_count');
  });
});

// ─── Output shape ───────────────────────────────────────────────

describe('Prometheus text format', () => {
  it('has # HELP + # TYPE comments before every metric', async () => {
    const body = await buildService().buildPrometheusText();
    const metricNames = [
      'hr_anomalies_total',
      'hr_anomaly_pending_count',
      'hr_anomaly_outcomes_total',
      'hr_anomaly_false_positive_rate_pct',
      'hr_change_requests_total',
      'hr_change_requests_pending',
      'hr_scheduler_is_running',
      'hr_audit_log_total_count',
      'hr_audit_log_hot_count',
      'hr_audit_log_archived_count',
    ];
    for (const m of metricNames) {
      expect(body).toMatch(new RegExp(`# HELP ${m} `));
      expect(body).toMatch(new RegExp(`# TYPE ${m} (counter|gauge)`));
    }
  });

  it('escapes quotes and backslashes in label values', async () => {
    // Seed an anomaly with a reason containing quotes + backslashes
    await AuditLog.create({
      eventType: 'security.suspicious_activity',
      eventCategory: 'security',
      severity: 'high',
      status: 'success',
      userId: new mongoose.Types.ObjectId(),
      resource: 'hr:anomaly:test',
      message: 'test',
      metadata: { custom: { reason: 'weird"reason\\with-stuff' } },
      tags: ['hr', 'hr:anomaly'],
      flags: { isSuspicious: true, requiresReview: true },
      createdAt: new Date(NOW.getTime() - MS_PER_DAY),
    });
    const body = await buildService().buildPrometheusText();
    // Backslash and quote both escaped
    expect(body).toMatch(/hr_anomalies_total\{reason="weird\\"reason\\\\with-stuff"\} 1/);
  });
});

// ─── Route layer ────────────────────────────────────────────────

describe('GET /hr/ops/metrics route', () => {
  function buildApp({ user, service }) {
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
        resolveScheduler: () => null,
        metricsService: service,
      })
    );
    return app;
  }

  it('401 without auth', async () => {
    const app = buildApp({ service: buildService() });
    const res = await request(app).get('/ops/metrics');
    expect(res.status).toBe(401);
  });

  it('403 for non-manager role', async () => {
    const res = await request(
      buildApp({ user: { id: 'u', role: ROLES.HR_OFFICER }, service: buildService() })
    ).get('/ops/metrics');
    expect(res.status).toBe(403);
  });

  it('503 when metricsService is not wired', async () => {
    const res = await request(
      buildApp({ user: { id: 'u', role: ROLES.HR_MANAGER }, service: null })
    ).get('/ops/metrics');
    expect(res.status).toBe(503);
  });

  it('200 with Content-Type: text/plain; version=0.0.4', async () => {
    await seedAnomaly({ reason: 'excessive_reads', daysAgo: 1 });
    const res = await request(
      buildApp({ user: { id: 'u', role: ROLES.HR_MANAGER }, service: buildService() })
    ).get('/ops/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.headers['content-type']).toContain('version=0.0.4');
    expect(res.text).toContain('hr_anomalies_total');
  });
});

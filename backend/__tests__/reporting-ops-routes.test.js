/**
 * reporting-ops-routes.test.js — Phase 10 Commit 17.
 *
 * Drives the ops observability endpoint via supertest with injected
 * fakes for every collaborator. Proves the aggregation + scheduler
 * snapshot + catalog listing + health response shape.
 */

'use strict';

const express = require('express');
const request = require('supertest');

const {
  buildRouter,
  aggregateDeliveries,
  aggregateApprovals,
  schedulerSnapshot,
  catalogSnapshot,
  rateLimiterSnapshot,
} = require('../routes/reports-ops.routes');

function makeDeliveryModel(counts = {}) {
  // counts is a map of filter-signature → count
  return {
    model: {
      countDocuments: jest.fn(async filter => {
        // Build a deterministic key from the filter so tests can pin
        // expectations: "status=<value>|channel=<value>"
        const statusPart = filter.status ? String(filter.status) : 'all';
        const channelPart = filter.channel ? String(filter.channel) : 'all';
        const key = `${statusPart}|${channelPart}`;
        return counts[key] != null ? counts[key] : 0;
      }),
    },
  };
}

function makeApprovalModel(counts = {}) {
  return {
    model: {
      countDocuments: jest.fn(async filter => counts[filter.state] || 0),
    },
  };
}

function makeScheduler(jobNames = [], running = true) {
  const jobs = new Map();
  for (const n of jobNames) jobs.set(n, { stop: () => {} });
  return {
    _jobs: jobs,
    isRunning: () => running,
  };
}

function makePlatform(overrides = {}) {
  return {
    scheduler: makeScheduler(['daily', 'weekly', 'monthly']),
    opsScheduler: makeScheduler(['retry', 'escalation', 'retention']),
    rateLimiter: { limits: { guardian: 20, executive: 80 } },
    engine: { valueResolver: async () => 0 },
    ...overrides,
  };
}

function makeCatalog(reports = []) {
  return {
    REPORTS: reports,
    classify: () => ({
      total: reports.length,
      enabled: reports.filter(r => r.enabled !== false).length,
      byPeriodicity: { daily: 3, weekly: 5 },
    }),
  };
}

function makeApp(deps) {
  const app = express();
  app.use(express.json());
  app.use('/ops', buildRouter(deps));
  return app;
}

// ─── Pure aggregators ────────────────────────────────────────────

describe('aggregateDeliveries', () => {
  test('counts by status + channel; computes success/failure rates', async () => {
    const counts = {
      'all|all': 100,
      'SENT|all': 10,
      'DELIVERED|all': 30,
      'READ|all': 40,
      'FAILED|all': 15,
      'ESCALATED|all': 3,
      'RETRYING|all': 2,
      'CANCELLED|all': 0,
      'all|email': 50,
      'all|sms': 20,
      'all|whatsapp': 20,
      'all|in_app': 10,
      'all|portal_inbox': 0,
      'all|pdf_download': 0,
    };
    const out = await aggregateDeliveries(makeDeliveryModel(counts), new Date(0).toISOString());
    expect(out.total).toBe(100);
    expect(out.byStatus.READ).toBe(40);
    expect(out.byChannel.email).toBe(50);
    // settled = delivered(30) + read(40) + failed(15) + escalated(3) = 88
    // success = delivered + read = 70 → 70/88 ≈ 0.795
    expect(out.successRate).toBeCloseTo(70 / 88);
    expect(out.failureRate).toBeCloseTo(18 / 88);
  });

  test('returns null when DeliveryModel has no countDocuments', async () => {
    const out = await aggregateDeliveries({ model: {} }, new Date().toISOString());
    // countBy returns null for each query; total ends up 0 and rates null
    expect(out.total).toBe(0);
    expect(out.successRate).toBeNull();
  });

  test('returns null when DeliveryModel is absent entirely', async () => {
    expect(await aggregateDeliveries(null, new Date().toISOString())).toBeNull();
  });
});

describe('aggregateApprovals', () => {
  test('counts every approval state', async () => {
    const counts = { PENDING: 3, APPROVED: 7, REJECTED: 1, DISPATCHED: 5, EXPIRED: 2 };
    const out = await aggregateApprovals(makeApprovalModel(counts));
    expect(out).toEqual(counts);
  });

  test('returns null when ApprovalModel is absent', async () => {
    expect(await aggregateApprovals(null)).toBeNull();
  });
});

describe('schedulerSnapshot', () => {
  test('exposes running flag + job names', () => {
    const s = makeScheduler(['weekly', 'monthly'], true);
    const snap = schedulerSnapshot(s);
    expect(snap.running).toBe(true);
    expect(snap.jobCount).toBe(2);
    expect(snap.jobs.sort()).toEqual(['monthly', 'weekly']);
  });

  test('null for missing scheduler', () => {
    expect(schedulerSnapshot(null)).toBeNull();
  });
});

describe('catalogSnapshot', () => {
  test('delegates to catalog.classify()', () => {
    const c = makeCatalog([{ id: 'a' }, { id: 'b', enabled: false }]);
    const snap = catalogSnapshot(c);
    expect(snap.total).toBe(2);
  });

  test('null for catalog without classify()', () => {
    expect(catalogSnapshot({})).toBeNull();
  });
});

describe('rateLimiterSnapshot', () => {
  test('returns limits map', () => {
    expect(rateLimiterSnapshot({ limits: { guardian: 20 } })).toEqual({
      limits: { guardian: 20 },
    });
  });
  test('null for missing limiter', () => {
    expect(rateLimiterSnapshot(null)).toBeNull();
  });
});

// ─── Routes ─────────────────────────────────────────────────────

describe('GET /ops/status', () => {
  test('aggregates everything and returns 200', async () => {
    const DeliveryModel = makeDeliveryModel({ 'all|all': 42 });
    const ApprovalModel = makeApprovalModel({ PENDING: 2 });
    const catalog = makeCatalog([{ id: 'r.x', enabled: true, periodicity: 'daily' }]);
    const platform = makePlatform();
    const app = makeApp({ platform, DeliveryModel, ApprovalModel, catalog });
    const res = await request(app).get('/ops/status');
    expect(res.status).toBe(200);
    expect(res.body.delivery.total).toBe(42);
    expect(res.body.approvals.PENDING).toBe(2);
    expect(res.body.scheduler.jobCount).toBe(3);
    expect(res.body.opsScheduler.jobCount).toBe(3);
    expect(res.body.catalog.total).toBe(1);
    expect(res.body.rateLimiter.limits.guardian).toBe(20);
    expect(res.body.engine.valueResolverWired).toBe(true);
    expect(res.body.platformVersion).toBe('4.0.16');
  });

  test('windowHours clamped to [1, 168]', async () => {
    const DeliveryModel = makeDeliveryModel();
    const app = makeApp({
      platform: makePlatform(),
      DeliveryModel,
      ApprovalModel: makeApprovalModel(),
      catalog: makeCatalog(),
    });
    const r1 = await request(app).get('/ops/status').query({ windowHours: '9999' });
    expect(r1.body.windowHours).toBe(168);
    const r2 = await request(app).get('/ops/status').query({ windowHours: '0' });
    expect(r2.body.windowHours).toBe(1);
  });

  test('gracefully degrades when platform / models missing', async () => {
    const app = makeApp({});
    const res = await request(app).get('/ops/status');
    expect(res.status).toBe(200);
    expect(res.body.delivery).toBeNull();
    expect(res.body.approvals).toBeNull();
    expect(res.body.scheduler).toBeNull();
  });
});

describe('GET /ops/health', () => {
  test('200 when every surface is wired', async () => {
    const app = makeApp({
      platform: makePlatform(),
      DeliveryModel: makeDeliveryModel(),
      ApprovalModel: makeApprovalModel(),
      catalog: makeCatalog(),
    });
    const res = await request(app).get('/ops/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.valueResolverWired).toBe(true);
  });

  test('503 when platform surfaces missing', async () => {
    const app = makeApp({});
    const res = await request(app).get('/ops/health');
    expect(res.status).toBe(503);
    expect(res.body.ok).toBe(false);
  });
});

describe('GET /ops/catalog', () => {
  test('lists every report with metadata', async () => {
    const catalog = makeCatalog([
      {
        id: 'ben.progress.weekly',
        nameEn: 'Weekly progress',
        nameAr: 'تقدم أسبوعي',
        category: 'clinical',
        periodicity: 'weekly',
        audiences: ['guardian'],
        channels: ['email', 'in_app'],
        confidentiality: 'restricted',
        approvalRequired: false,
        enabled: true,
      },
    ]);
    const app = makeApp({
      platform: makePlatform(),
      DeliveryModel: makeDeliveryModel(),
      ApprovalModel: makeApprovalModel(),
      catalog,
    });
    const res = await request(app).get('/ops/catalog');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.items[0]).toMatchObject({
      id: 'ben.progress.weekly',
      periodicity: 'weekly',
      approvalRequired: false,
    });
  });

  test('503 when catalog not wired', async () => {
    const app = makeApp({ platform: makePlatform() });
    const res = await request(app).get('/ops/catalog');
    expect(res.status).toBe(503);
  });
});

'use strict';

/**
 * hr-anomalies-review.test.js — Phase 11 Commit 21 (4.0.38).
 *
 * Integration + supertest coverage for the anomaly-review surface.
 */

jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createHrAnomalyReviewService } = require('../services/hr/hrAnomalyReviewService');
const { createHrAnomaliesRouter } = require('../routes/hr/hr-anomalies.routes');
const { ROLES } = require('../config/rbac.config');

let mongoServer;
let AuditLog;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'anomaly-review' });
  AuditLog = require('../models/auditLog.model').AuditLog;
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
});

const NOW = new Date('2026-04-22T12:00:00.000Z');
const MS_PER_DAY = 24 * 3600 * 1000;

async function seedAnomaly({
  userId = new mongoose.Types.ObjectId(),
  reason = 'excessive_reads',
  observedCount = 150,
  daysAgo = 1,
  requiresReview = true,
  reviewed = null,
} = {}) {
  const createdAt = new Date(NOW.getTime() - daysAgo * MS_PER_DAY);
  const custom = { reason, observedCount };
  if (reviewed) custom.review = reviewed;
  return AuditLog.create({
    eventType: 'security.suspicious_activity',
    eventCategory: 'security',
    severity: 'high',
    status: 'success',
    userId,
    userRole: 'hr_officer',
    resource: `hr:anomaly:${reason}`,
    message: `seeded anomaly ${reason}`,
    metadata: { custom },
    tags: ['hr', 'hr:anomaly', reason],
    flags: { isSuspicious: true, requiresReview },
    createdAt,
    updatedAt: createdAt,
  });
}

function buildService() {
  return createHrAnomalyReviewService({
    auditLogModel: AuditLog,
    now: () => NOW,
  });
}

function buildApp(user) {
  const svc = buildService();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use(createHrAnomaliesRouter({ service: svc }));
  return app;
}

// ─── listAnomalies (service) ────────────────────────────────────

describe('listAnomalies (service)', () => {
  it('defaults to status:pending', async () => {
    await seedAnomaly({ requiresReview: true });
    await seedAnomaly({ requiresReview: false });
    const res = await buildService().listAnomalies();
    expect(res.total).toBe(1);
    expect(res.items[0].flags.requiresReview).toBe(true);
  });

  it('status:reviewed narrows to reviewed rows', async () => {
    await seedAnomaly({ requiresReview: false });
    await seedAnomaly({ requiresReview: false });
    await seedAnomaly({ requiresReview: true });
    const res = await buildService().listAnomalies({ status: 'reviewed' });
    expect(res.total).toBe(2);
  });

  it('status:all returns everything', async () => {
    await seedAnomaly({ requiresReview: true });
    await seedAnomaly({ requiresReview: false });
    const res = await buildService().listAnomalies({ status: 'all' });
    expect(res.total).toBe(2);
  });

  it('sorts newest-first', async () => {
    await seedAnomaly({ daysAgo: 7 });
    await seedAnomaly({ daysAgo: 1 });
    await seedAnomaly({ daysAgo: 3 });
    const res = await buildService().listAnomalies();
    const dates = res.items.map(i => new Date(i.createdAt).getTime());
    const sorted = [...dates].sort((a, b) => b - a);
    expect(dates).toEqual(sorted);
  });

  it('limit clamped at 100', async () => {
    const res = await buildService().listAnomalies({ limit: 10000 });
    expect(res.limit).toBe(100);
  });
});

// ─── reviewAnomaly (service) ────────────────────────────────────

describe('reviewAnomaly (service)', () => {
  it('rejects invalid outcome', async () => {
    const anomaly = await seedAnomaly();
    const res = await buildService().reviewAnomaly({
      id: anomaly._id,
      reviewerUserId: new mongoose.Types.ObjectId(),
      reviewerRole: ROLES.HR_MANAGER,
      outcome: 'NOT_A_VALID_OUTCOME',
    });
    expect(res.result).toBe('invalid_outcome');
    expect(res.validOutcomes).toEqual(
      expect.arrayContaining([
        'confirmed_breach',
        'false_positive',
        'needs_investigation',
        'policy_exception',
      ])
    );
  });

  it('requires notes for false_positive/needs_investigation/policy_exception', async () => {
    const anomaly = await seedAnomaly();
    const svc = buildService();
    for (const outcome of ['false_positive', 'needs_investigation', 'policy_exception']) {
      const res = await svc.reviewAnomaly({
        id: anomaly._id,
        reviewerUserId: new mongoose.Types.ObjectId(),
        reviewerRole: ROLES.HR_MANAGER,
        outcome,
        notes: null,
      });
      expect(res.result).toBe('notes_required');
      expect(res.outcome).toBe(outcome);
    }
  });

  it('confirmed_breach allows empty notes', async () => {
    const anomaly = await seedAnomaly();
    const res = await buildService().reviewAnomaly({
      id: anomaly._id,
      reviewerUserId: new mongoose.Types.ObjectId(),
      reviewerRole: ROLES.HR_MANAGER,
      outcome: 'confirmed_breach',
      notes: null,
    });
    expect(res.result).toBe('reviewed');
  });

  it('marks anomaly as reviewed and flips requiresReview flag', async () => {
    const anomaly = await seedAnomaly();
    const reviewerId = new mongoose.Types.ObjectId();

    const res = await buildService().reviewAnomaly({
      id: anomaly._id,
      reviewerUserId: reviewerId,
      reviewerRole: ROLES.HR_MANAGER,
      outcome: 'false_positive',
      notes: 'Monthly payroll processing — expected spike',
    });
    expect(res.result).toBe('reviewed');
    expect(res.anomaly.flags.requiresReview).toBe(false);
    expect(res.anomaly.metadata.custom.review).toMatchObject({
      reviewerUserId: String(reviewerId),
      reviewerRole: ROLES.HR_MANAGER,
      outcome: 'false_positive',
      notes: 'Monthly payroll processing — expected spike',
    });
    expect(res.anomaly.metadata.custom.review.reviewedAt).toBeTruthy();
    // Original reason preserved
    expect(res.anomaly.metadata.custom.reason).toBe('excessive_reads');
  });

  it('rejects self-review', async () => {
    const subjectId = new mongoose.Types.ObjectId();
    const anomaly = await seedAnomaly({ userId: subjectId });
    const res = await buildService().reviewAnomaly({
      id: anomaly._id,
      reviewerUserId: subjectId, // same person
      reviewerRole: ROLES.HR_MANAGER,
      outcome: 'false_positive',
      notes: 'trying to close my own',
    });
    expect(res.result).toBe('denied');
    expect(res.reason).toBe('self_review_forbidden');
  });

  it('idempotent: second review returns already_reviewed with current outcome', async () => {
    const anomaly = await seedAnomaly();
    const reviewerA = new mongoose.Types.ObjectId();
    const reviewerB = new mongoose.Types.ObjectId();

    const first = await buildService().reviewAnomaly({
      id: anomaly._id,
      reviewerUserId: reviewerA,
      reviewerRole: ROLES.HR_MANAGER,
      outcome: 'confirmed_breach',
    });
    expect(first.result).toBe('reviewed');

    const second = await buildService().reviewAnomaly({
      id: anomaly._id,
      reviewerUserId: reviewerB,
      reviewerRole: ROLES.HR_MANAGER,
      outcome: 'false_positive',
      notes: 'reverse decision',
    });
    expect(second.result).toBe('already_reviewed');
    expect(second.currentOutcome).toBe('confirmed_breach');
    expect(String(second.reviewedBy)).toBe(String(reviewerA));
  });

  it('returns not_found for unknown id or non-anomaly audit row', async () => {
    const svc = buildService();
    const res = await svc.reviewAnomaly({
      id: new mongoose.Types.ObjectId(),
      reviewerUserId: new mongoose.Types.ObjectId(),
      reviewerRole: ROLES.HR_MANAGER,
      outcome: 'confirmed_breach',
    });
    expect(res.result).toBe('not_found');
  });

  it('emits chain-of-custody audit event via injected audit service', async () => {
    const anomaly = await seedAnomaly();
    const auditService = {
      logHrAccess: jest.fn(async () => ({ logged: true })),
    };
    const svc = createHrAnomalyReviewService({
      auditLogModel: AuditLog,
      auditService,
      now: () => NOW,
    });
    await svc.reviewAnomaly({
      id: anomaly._id,
      reviewerUserId: new mongoose.Types.ObjectId(),
      reviewerRole: ROLES.HR_MANAGER,
      outcome: 'confirmed_breach',
    });
    expect(auditService.logHrAccess).toHaveBeenCalledTimes(1);
    const payload = auditService.logHrAccess.mock.calls[0][0];
    expect(payload.action).toBe('anomaly_reviewed');
    expect(payload.entityType).toBe('anomaly');
    expect(payload.metadata.outcome).toBe('confirmed_breach');
  });
});

// ─── Route layer ────────────────────────────────────────────────

describe('GET /hr/anomalies route', () => {
  it('401 without auth', async () => {
    const svc = buildService();
    const app = express();
    app.use(express.json());
    app.use(createHrAnomaliesRouter({ service: svc }));
    const res = await request(app).get('/anomalies');
    expect(res.status).toBe(401);
  });

  it('403 for non-manager role', async () => {
    await seedAnomaly();
    const res = await request(
      buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.HR_OFFICER })
    ).get('/anomalies');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('requires manager tier');
  });

  it('200 with list for MANAGER tier', async () => {
    await seedAnomaly();
    const res = await request(
      buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.HR_MANAGER })
    ).get('/anomalies');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
  });

  it('respects ?status=all query param', async () => {
    await seedAnomaly({ requiresReview: true });
    await seedAnomaly({ requiresReview: false });
    const res = await request(
      buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.HR_MANAGER })
    ).get('/anomalies?status=all');
    expect(res.body.total).toBe(2);
  });
});

describe('GET /hr/anomalies/:id route', () => {
  it('404 on unknown id', async () => {
    const res = await request(
      buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.HR_MANAGER })
    ).get(`/anomalies/${new mongoose.Types.ObjectId()}`);
    expect(res.status).toBe(404);
  });

  it('400 on invalid id format', async () => {
    const res = await request(
      buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.HR_MANAGER })
    ).get('/anomalies/not-an-id');
    expect(res.status).toBe(400);
  });

  it('200 with anomaly body', async () => {
    const doc = await seedAnomaly();
    const res = await request(
      buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.HR_MANAGER })
    ).get(`/anomalies/${doc._id}`);
    expect(res.status).toBe(200);
    expect(res.body.anomaly.metadata.custom.reason).toBe('excessive_reads');
  });
});

describe('POST /hr/anomalies/:id/review route', () => {
  it('403 for non-manager', async () => {
    const doc = await seedAnomaly();
    const res = await request(
      buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.HR_OFFICER })
    )
      .post(`/anomalies/${doc._id}/review`)
      .send({ outcome: 'confirmed_breach' });
    expect(res.status).toBe(403);
  });

  it('400 on invalid outcome', async () => {
    const doc = await seedAnomaly();
    const res = await request(
      buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.HR_MANAGER })
    )
      .post(`/anomalies/${doc._id}/review`)
      .send({ outcome: 'typo' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_outcome');
    expect(res.body.validOutcomes.length).toBeGreaterThan(0);
  });

  it('400 notes_required when notes missing for false_positive', async () => {
    const doc = await seedAnomaly();
    const res = await request(
      buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.HR_MANAGER })
    )
      .post(`/anomalies/${doc._id}/review`)
      .send({ outcome: 'false_positive' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('notes_required');
    expect(res.body.outcome).toBe('false_positive');
  });

  it('200 on valid review', async () => {
    const doc = await seedAnomaly();
    const res = await request(
      buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.HR_MANAGER })
    )
      .post(`/anomalies/${doc._id}/review`)
      .send({ outcome: 'confirmed_breach' });
    expect(res.status).toBe(200);
    expect(res.body.reviewed).toBe(true);
    expect(res.body.anomaly.metadata.custom.review.outcome).toBe('confirmed_breach');
  });

  it('409 on repeat review', async () => {
    const doc = await seedAnomaly();
    const app = buildApp({
      id: new mongoose.Types.ObjectId(),
      role: ROLES.HR_MANAGER,
    });
    await request(app).post(`/anomalies/${doc._id}/review`).send({ outcome: 'confirmed_breach' });
    const second = await request(app)
      .post(`/anomalies/${doc._id}/review`)
      .send({ outcome: 'false_positive', notes: 'reverse it' });
    expect(second.status).toBe(409);
    expect(second.body.currentOutcome).toBe('confirmed_breach');
  });

  it('403 on self-review attempt', async () => {
    const subjectId = new mongoose.Types.ObjectId();
    const doc = await seedAnomaly({ userId: subjectId });
    const res = await request(buildApp({ id: subjectId, role: ROLES.HR_MANAGER }))
      .post(`/anomalies/${doc._id}/review`)
      .send({ outcome: 'confirmed_breach' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('self_review_forbidden');
  });
});

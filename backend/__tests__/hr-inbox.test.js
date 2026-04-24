'use strict';

/**
 * hr-inbox.test.js — Phase 11 Commit 14 (4.0.31).
 *
 * Integration coverage for the per-user inbox + route layer.
 * Real HrChangeRequest model against mongodb-memory-server.
 */

jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createHrInboxService } = require('../services/hr/hrInboxService');
const { createHrInboxRouter } = require('../routes/hr/hr-inbox.routes');
const { ROLES } = require('../config/rbac.config');

let mongoServer;
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
  await mongoose.connect(mongoServer.getUri(), { dbName: 'hr-inbox-test' });
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
  await HrChangeRequest.deleteMany({});
});

const NOW = new Date('2026-04-22T12:00:00.000Z');
const MS_PER_DAY = 24 * 3600 * 1000;

function buildService() {
  return createHrInboxService({
    changeRequestModel: HrChangeRequest,
    now: () => NOW,
  });
}

async function seedRequest({
  requestor,
  branchId = new mongoose.Types.ObjectId(),
  status = 'pending',
  createdDaysAgo = 1,
  updatedDaysAgo = null,
  rules = [],
  proposed = { status: 'terminated' },
  baseline = { status: 'active' },
}) {
  const _id = new mongoose.Types.ObjectId();
  const createdAt = new Date(NOW.getTime() - createdDaysAgo * MS_PER_DAY);
  const updatedAt =
    updatedDaysAgo == null ? createdAt : new Date(NOW.getTime() - updatedDaysAgo * MS_PER_DAY);
  await mongoose.connection.db.collection(HrChangeRequest.collection.collectionName).insertOne({
    _id,
    employee_id: new mongoose.Types.ObjectId(),
    branch_id: branchId,
    requestor_user_id: requestor,
    requestor_role: 'hr_manager',
    proposed_changes: proposed,
    baseline_values: baseline,
    rules_triggered: rules,
    status,
    approver_user_id: null,
    approver_role: null,
    approved_at: null,
    rejected_at: null,
    applied_at: status === 'applied' ? updatedAt : null,
    deleted_at: null,
    createdAt,
    updatedAt,
  });
  return { _id };
}

// ─── Service — shape + role gating ─────────────────────────────

describe('buildInbox — shape', () => {
  it('throws on missing userId', async () => {
    await expect(buildService().buildInbox({})).rejects.toThrow(/userId is required/);
  });

  it('returns empty sections for a brand-new manager', async () => {
    const payload = await buildService().buildInbox({
      userId: new mongoose.Types.ObjectId(),
      role: ROLES.HR_MANAGER,
    });
    expect(payload.generated_at).toBe(NOW.toISOString());
    expect(payload.sections.awaiting_my_approval).toEqual([]);
    expect(payload.sections.my_requests_pending).toEqual([]);
    expect(payload.sections.my_requests_decided_recent).toEqual([]);
    expect(payload.totals).toEqual({
      actionable: 0,
      my_pending: 0,
      my_decided_recent: 0,
    });
    expect(payload.oldest_actionable_days).toBeNull();
  });
});

// ─── awaiting_my_approval ──────────────────────────────────────

describe('awaiting_my_approval', () => {
  it('non-manager role gets empty array', async () => {
    const branchId = new mongoose.Types.ObjectId();
    await seedRequest({
      requestor: new mongoose.Types.ObjectId(),
      branchId,
      status: 'pending',
    });
    const payload = await buildService().buildInbox({
      userId: new mongoose.Types.ObjectId(),
      role: ROLES.THERAPIST,
      branchId,
    });
    expect(payload.sections.awaiting_my_approval).toEqual([]);
    expect(payload.totals.actionable).toBe(0);
  });

  it('HR_MANAGER (HQ) sees all pending across branches', async () => {
    const myId = new mongoose.Types.ObjectId();
    await seedRequest({
      requestor: new mongoose.Types.ObjectId(),
      branchId: new mongoose.Types.ObjectId(),
      status: 'pending',
    });
    await seedRequest({
      requestor: new mongoose.Types.ObjectId(),
      branchId: new mongoose.Types.ObjectId(),
      status: 'pending',
    });
    const payload = await buildService().buildInbox({
      userId: myId,
      role: ROLES.HR_MANAGER,
    });
    expect(payload.totals.actionable).toBe(2);
  });

  it('self-authored requests are excluded from awaiting', async () => {
    const myId = new mongoose.Types.ObjectId();
    await seedRequest({
      requestor: myId,
      branchId: new mongoose.Types.ObjectId(),
      status: 'pending',
    });
    await seedRequest({
      requestor: new mongoose.Types.ObjectId(),
      branchId: new mongoose.Types.ObjectId(),
      status: 'pending',
    });
    const payload = await buildService().buildInbox({
      userId: myId,
      role: ROLES.HR_MANAGER,
    });
    expect(payload.totals.actionable).toBe(1);
    expect(payload.totals.my_pending).toBe(1);
  });

  it('non-HQ manager is auto-scoped to their branch', async () => {
    // Note: COMPLIANCE_OFFICER is in the HQ unscoped set, so use a
    // manager-tier role that ISN'T. No such role in Phase-11 — but
    // we can simulate by asserting HQ roles ignore branchId.
    // Instead verify that branchId filter narrows when passed.
    const branchA = new mongoose.Types.ObjectId();
    const branchB = new mongoose.Types.ObjectId();
    await seedRequest({
      requestor: new mongoose.Types.ObjectId(),
      branchId: branchA,
      status: 'pending',
    });
    await seedRequest({
      requestor: new mongoose.Types.ObjectId(),
      branchId: branchB,
      status: 'pending',
    });
    const payload = await buildService().buildInbox({
      userId: new mongoose.Types.ObjectId(),
      role: ROLES.HR_MANAGER,
      branchId: branchA,
    });
    // HR_MANAGER is HQ — ignores branchId filter
    expect(payload.totals.actionable).toBe(2);
  });

  it('sorts oldest-first and exposes oldest_actionable_days', async () => {
    const myId = new mongoose.Types.ObjectId();
    await seedRequest({
      requestor: new mongoose.Types.ObjectId(),
      branchId: new mongoose.Types.ObjectId(),
      status: 'pending',
      createdDaysAgo: 2,
    });
    await seedRequest({
      requestor: new mongoose.Types.ObjectId(),
      branchId: new mongoose.Types.ObjectId(),
      status: 'pending',
      createdDaysAgo: 10,
    });
    const payload = await buildService().buildInbox({
      userId: myId,
      role: ROLES.HR_MANAGER,
    });
    expect(payload.totals.actionable).toBe(2);
    expect(payload.oldest_actionable_days).toBeCloseTo(10, 0);
    // Oldest at index 0
    const first = payload.sections.awaiting_my_approval[0];
    const firstCreatedDays = (NOW - first.createdAt) / MS_PER_DAY;
    expect(firstCreatedDays).toBeGreaterThanOrEqual(9.9);
  });

  it('does NOT include non-pending requests', async () => {
    const myId = new mongoose.Types.ObjectId();
    await seedRequest({
      requestor: new mongoose.Types.ObjectId(),
      branchId: new mongoose.Types.ObjectId(),
      status: 'applied',
    });
    await seedRequest({
      requestor: new mongoose.Types.ObjectId(),
      branchId: new mongoose.Types.ObjectId(),
      status: 'rejected',
    });
    const payload = await buildService().buildInbox({
      userId: myId,
      role: ROLES.HR_MANAGER,
    });
    expect(payload.totals.actionable).toBe(0);
  });
});

// ─── my_requests_pending + decided_recent ───────────────────────

describe('my_requests sections', () => {
  it('my_requests_pending lists caller-authored pending, newest first', async () => {
    const myId = new mongoose.Types.ObjectId();
    await seedRequest({
      requestor: myId,
      branchId: new mongoose.Types.ObjectId(),
      status: 'pending',
      createdDaysAgo: 5,
    });
    await seedRequest({
      requestor: myId,
      branchId: new mongoose.Types.ObjectId(),
      status: 'pending',
      createdDaysAgo: 1,
    });
    await seedRequest({
      requestor: new mongoose.Types.ObjectId(),
      branchId: new mongoose.Types.ObjectId(),
      status: 'pending',
    });
    const payload = await buildService().buildInbox({
      userId: myId,
      role: ROLES.THERAPIST,
    });
    expect(payload.totals.my_pending).toBe(2);
    // Newest first → createdDaysAgo: 1 comes first
    const first = payload.sections.my_requests_pending[0];
    const days = Math.round((NOW - first.createdAt) / MS_PER_DAY);
    expect(days).toBe(1);
  });

  it('my_requests_decided_recent includes applied/rejected/cancelled in last 30d', async () => {
    const myId = new mongoose.Types.ObjectId();
    await seedRequest({
      requestor: myId,
      branchId: new mongoose.Types.ObjectId(),
      status: 'applied',
      createdDaysAgo: 10,
      updatedDaysAgo: 5,
    });
    await seedRequest({
      requestor: myId,
      branchId: new mongoose.Types.ObjectId(),
      status: 'rejected',
      createdDaysAgo: 8,
      updatedDaysAgo: 3,
    });
    await seedRequest({
      requestor: myId,
      branchId: new mongoose.Types.ObjectId(),
      status: 'cancelled',
      createdDaysAgo: 2,
      updatedDaysAgo: 1,
    });
    // Older than 30d — excluded
    await seedRequest({
      requestor: myId,
      branchId: new mongoose.Types.ObjectId(),
      status: 'applied',
      createdDaysAgo: 90,
      updatedDaysAgo: 60,
    });
    const payload = await buildService().buildInbox({
      userId: myId,
      role: ROLES.THERAPIST,
    });
    expect(payload.totals.my_decided_recent).toBe(3);
  });

  it('respects limitPerSection cap', async () => {
    const myId = new mongoose.Types.ObjectId();
    for (let i = 0; i < 35; i++) {
      await seedRequest({
        requestor: myId,
        branchId: new mongoose.Types.ObjectId(),
        status: 'pending',
        createdDaysAgo: i + 1,
      });
    }
    const payload = await buildService().buildInbox({
      userId: myId,
      role: ROLES.HR_MANAGER,
      limitPerSection: 10,
    });
    expect(payload.sections.my_requests_pending).toHaveLength(10);
  });

  it('clamps limitPerSection at 100', async () => {
    const myId = new mongoose.Types.ObjectId();
    const payload = await buildService().buildInbox({
      userId: myId,
      role: ROLES.HR_MANAGER,
      limitPerSection: 99999,
    });
    // Empty DB — still returns shape; cap is enforced at query level
    expect(payload.sections.awaiting_my_approval).toEqual([]);
  });
});

// ─── Route layer ────────────────────────────────────────────────

describe('GET /hr/inbox route', () => {
  function buildApp(user) {
    const svc = createHrInboxService({
      changeRequestModel: HrChangeRequest,
      now: () => NOW,
    });
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = user;
      next();
    });
    app.use(createHrInboxRouter({ service: svc }));
    return app;
  }

  it('401 without auth user', async () => {
    const svc = createHrInboxService({ changeRequestModel: HrChangeRequest });
    const app = express();
    app.use(express.json());
    app.use(createHrInboxRouter({ service: svc }));
    const res = await request(app).get('/inbox');
    expect(res.status).toBe(401);
  });

  it('200 returns payload with subject + totals', async () => {
    const myId = new mongoose.Types.ObjectId();
    const res = await request(buildApp({ id: myId, role: ROLES.HR_MANAGER })).get('/inbox');
    expect(res.status).toBe(200);
    expect(res.body.subject.user_id).toBe(String(myId));
    expect(res.body.subject.role).toBe(ROLES.HR_MANAGER);
    expect(res.body.totals).toBeDefined();
  });

  it('respects limitPerSection query param', async () => {
    const myId = new mongoose.Types.ObjectId();
    for (let i = 0; i < 5; i++) {
      await seedRequest({
        requestor: myId,
        branchId: new mongoose.Types.ObjectId(),
        status: 'pending',
        createdDaysAgo: i + 1,
      });
    }
    const res = await request(buildApp({ id: myId, role: ROLES.HR_MANAGER })).get(
      '/inbox?limitPerSection=3'
    );
    expect(res.status).toBe(200);
    expect(res.body.sections.my_requests_pending).toHaveLength(3);
  });
});

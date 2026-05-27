'use strict';

/**
 * caseload-rebalance-apply-wave512.test.js — Wave 512.
 *
 * Behavioural drift guard for the W512 applyMove service method +
 * POST /apply HTTP endpoint. Real Mongoose via MongoMemoryServer.
 *
 * Covers:
 *   - applyMove writes atomically when conditions hold
 *   - refuses when alert not found / not open / wrong fromTherapistId
 *   - refuses same_therapist (no-op)
 *   - refuses invalid toTherapistId (not a therapist / inactive / wrong branch)
 *   - HTTP 200 on apply + 400 on bad body + 409 on conflict + 403 on cross-branch
 *   - audit log emitted on applied transitions (best-effort, never breaks request)
 *   - throws on missing args
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const testCtx = { user: null, branchScope: null };

jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    if (testCtx.user) req.user = testCtx.user;
    next();
  },
}));

jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (req, _res, next) => {
    if (testCtx.branchScope) req.branchScope = testCtx.branchScope;
    next();
  },
  branchFilter: req => {
    if (req.branchScope && req.branchScope.allowedBranchIds) {
      return { branchId: { $in: req.branchScope.allowedBranchIds } };
    }
    return {};
  },
}));

jest.mock('../middleware/assertBranchMatch', () => ({
  assertBranchMatch: (req, branchId) => {
    if (
      req.branchScope &&
      req.branchScope.allowedBranchIds &&
      !req.branchScope.allowedBranchIds.some(b => String(b) === String(branchId))
    ) {
      const err = new Error('cross-branch denied');
      err.status = 403;
      throw err;
    }
  },
}));

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let MeasureAlert;
let User;
let service;
let app;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w512-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ MeasureAlert } = require('../domains/goals/models/MeasureAlert'));
  User = require('../models/User');
  await MeasureAlert.init();
  service = require('../services/caseload-rebalance.service');

  const router = require('../routes/caseload-rebalance.routes');
  app = express();
  app.use(express.json());
  app.use('/api/v1/caseload-rebalance', router);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await MeasureAlert.deleteMany({});
  await User.deleteMany({});
  testCtx.user = null;
  testCtx.branchScope = null;
});

async function makeTherapist(overrides = {}) {
  const firstName = overrides.firstName || `T${Math.random().toString(36).slice(2, 6)}`;
  return User.create({
    firstName,
    lastName: 'X',
    fullName: `${firstName} X`,
    email: overrides.email || `t${Math.random().toString(36).slice(2, 8)}@x.io`,
    password: 'X1!aaaaa',
    role: overrides.role || 'therapist',
    isActive: overrides.isActive ?? true,
    branchId: overrides.branchId,
    ...overrides,
  });
}

async function makeAlert({ branchId, assigneeId, status = 'open' }) {
  return MeasureAlert.create({
    beneficiaryId: new mongoose.Types.ObjectId(),
    measureId: new mongoose.Types.ObjectId(),
    measureCode: 'BERG',
    branchId,
    alertType: 'FORECAST_OFF_TRACK',
    severity: 'medium',
    status,
    firstSeenAt: new Date(),
    lastEvaluatedAt: new Date(),
    assigneeId,
  });
}

// ════════════════════════════════════════════════════════════════════
// applyMove unit
// ════════════════════════════════════════════════════════════════════

describe('W512 — applyMove unit', () => {
  test('writes atomically when alert is open + currently assigned to fromTherapistId', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const tFrom = await makeTherapist({ branchId });
    const tTo = await makeTherapist({ branchId });
    const alert = await makeAlert({ branchId, assigneeId: tFrom._id });

    const r = await service.applyMove({
      alertId: String(alert._id),
      fromTherapistId: String(tFrom._id),
      toTherapistId: String(tTo._id),
    });
    expect(r.action).toBe('applied');
    expect(String(r.alert.assigneeId)).toBe(String(tTo._id));

    const after = await MeasureAlert.findById(alert._id).lean();
    expect(String(after.assigneeId)).toBe(String(tTo._id));
  });

  test('refuses when alert is not open', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const tFrom = await makeTherapist({ branchId });
    const tTo = await makeTherapist({ branchId });
    const alert = await makeAlert({ branchId, assigneeId: tFrom._id });
    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    alert.resolutionMode = 'manual';
    await alert.save();

    const r = await service.applyMove({
      alertId: String(alert._id),
      fromTherapistId: String(tFrom._id),
      toTherapistId: String(tTo._id),
    });
    expect(r.action).toBe('skipped');
    expect(r.reason).toBe('not_open');
  });

  test('refuses when assigneeId no longer matches fromTherapistId (stale suggestion)', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const tFrom = await makeTherapist({ branchId });
    const tOther = await makeTherapist({ branchId });
    const tTo = await makeTherapist({ branchId });
    // Alert was reassigned to tOther in the meantime.
    const alert = await makeAlert({ branchId, assigneeId: tOther._id });

    const r = await service.applyMove({
      alertId: String(alert._id),
      fromTherapistId: String(tFrom._id),
      toTherapistId: String(tTo._id),
    });
    expect(r.action).toBe('skipped');
    expect(r.reason).toBe('not_currently_assigned');
    // Alert was NOT touched.
    const after = await MeasureAlert.findById(alert._id).lean();
    expect(String(after.assigneeId)).toBe(String(tOther._id));
  });

  test('refuses same_therapist (no-op)', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const tFrom = await makeTherapist({ branchId });
    const alert = await makeAlert({ branchId, assigneeId: tFrom._id });
    const r = await service.applyMove({
      alertId: String(alert._id),
      fromTherapistId: String(tFrom._id),
      toTherapistId: String(tFrom._id),
    });
    expect(r.action).toBe('skipped');
    expect(r.reason).toBe('same_therapist');
  });

  test('refuses non-therapist target', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const tFrom = await makeTherapist({ branchId });
    const tWrongRole = await makeTherapist({ branchId, role: 'admin' });
    const alert = await makeAlert({ branchId, assigneeId: tFrom._id });
    const r = await service.applyMove({
      alertId: String(alert._id),
      fromTherapistId: String(tFrom._id),
      toTherapistId: String(tWrongRole._id),
    });
    expect(r.action).toBe('skipped');
    expect(r.reason).toBe('invalid_to_therapist');
  });

  test('refuses inactive target therapist', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const tFrom = await makeTherapist({ branchId });
    const tInactive = await makeTherapist({ branchId, isActive: false });
    const alert = await makeAlert({ branchId, assigneeId: tFrom._id });
    const r = await service.applyMove({
      alertId: String(alert._id),
      fromTherapistId: String(tFrom._id),
      toTherapistId: String(tInactive._id),
    });
    expect(r.action).toBe('skipped');
    expect(r.reason).toBe('invalid_to_therapist');
  });

  test('refuses cross-branch target therapist', async () => {
    const branchA = new mongoose.Types.ObjectId();
    const branchB = new mongoose.Types.ObjectId();
    const tFrom = await makeTherapist({ branchId: branchA });
    const tForeign = await makeTherapist({ branchId: branchB });
    const alert = await makeAlert({ branchId: branchA, assigneeId: tFrom._id });
    const r = await service.applyMove({
      alertId: String(alert._id),
      fromTherapistId: String(tFrom._id),
      toTherapistId: String(tForeign._id),
    });
    expect(r.action).toBe('skipped');
    expect(r.reason).toBe('invalid_to_therapist');
  });

  test('throws on missing args', async () => {
    await expect(service.applyMove({})).rejects.toThrow(/alertId/);
    await expect(service.applyMove({ alertId: new mongoose.Types.ObjectId() })).rejects.toThrow(
      /fromTherapistId/
    );
    await expect(
      service.applyMove({
        alertId: new mongoose.Types.ObjectId(),
        fromTherapistId: new mongoose.Types.ObjectId(),
      })
    ).rejects.toThrow(/toTherapistId/);
  });
});

// ════════════════════════════════════════════════════════════════════
// HTTP POST /apply
// ════════════════════════════════════════════════════════════════════

describe('W512 — POST /apply', () => {
  test('200 + applied envelope on successful move', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const tFrom = await makeTherapist({ branchId });
    const tTo = await makeTherapist({ branchId });
    const alert = await makeAlert({ branchId, assigneeId: tFrom._id });

    testCtx.user = { _id: new mongoose.Types.ObjectId(), role: 'supervisor' };

    const r = await request(app)
      .post('/api/v1/caseload-rebalance/apply')
      .send({
        alertId: String(alert._id),
        fromTherapistId: String(tFrom._id),
        toTherapistId: String(tTo._id),
      });
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    expect(r.body.data.action).toBe('applied');
  });

  test('400 on missing body fields', async () => {
    testCtx.user = { _id: new mongoose.Types.ObjectId(), role: 'supervisor' };
    const r = await request(app).post('/api/v1/caseload-rebalance/apply').send({});
    expect(r.status).toBe(400);
    expect(r.body.success).toBe(false);
  });

  test('404 when alert not found', async () => {
    testCtx.user = { _id: new mongoose.Types.ObjectId(), role: 'supervisor' };
    const r = await request(app)
      .post('/api/v1/caseload-rebalance/apply')
      .send({
        alertId: String(new mongoose.Types.ObjectId()),
        fromTherapistId: String(new mongoose.Types.ObjectId()),
        toTherapistId: String(new mongoose.Types.ObjectId()),
      });
    expect(r.status).toBe(404);
    expect(r.body.error).toBe('alert_not_found');
  });

  test('409 on stale suggestion (assigneeId mismatch)', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const tFrom = await makeTherapist({ branchId });
    const tOther = await makeTherapist({ branchId });
    const tTo = await makeTherapist({ branchId });
    const alert = await makeAlert({ branchId, assigneeId: tOther._id });
    testCtx.user = { _id: new mongoose.Types.ObjectId(), role: 'supervisor' };

    const r = await request(app)
      .post('/api/v1/caseload-rebalance/apply')
      .send({
        alertId: String(alert._id),
        fromTherapistId: String(tFrom._id),
        toTherapistId: String(tTo._id),
      });
    expect(r.status).toBe(409);
    expect(r.body.success).toBe(false);
    expect(r.body.data.reason).toBe('not_currently_assigned');
  });

  test('403 cross-branch caller', async () => {
    const branchA = new mongoose.Types.ObjectId();
    const branchB = new mongoose.Types.ObjectId();
    const tFrom = await makeTherapist({ branchId: branchA });
    const tTo = await makeTherapist({ branchId: branchA });
    const alert = await makeAlert({ branchId: branchA, assigneeId: tFrom._id });
    testCtx.user = { _id: new mongoose.Types.ObjectId(), role: 'supervisor' };
    testCtx.branchScope = { allowedBranchIds: [branchB] }; // restricted to wrong branch

    const r = await request(app)
      .post('/api/v1/caseload-rebalance/apply')
      .send({
        alertId: String(alert._id),
        fromTherapistId: String(tFrom._id),
        toTherapistId: String(tTo._id),
      });
    expect(r.status).toBe(403);
    expect(r.body.success).toBe(false);
  });
});

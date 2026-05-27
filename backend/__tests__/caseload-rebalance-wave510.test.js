'use strict';

/**
 * caseload-rebalance-wave510.test.js — Wave 510 (Phase E3).
 *
 * Behavioural drift guard for services/caseload-rebalance.service.js +
 * routes/caseload-rebalance.routes.js. Real Mongoose via MongoMemoryServer.
 *
 * Covers:
 *   - suggestRebalanceMoves returns empty when no overload exists
 *   - suggests moves when one therapist is overloaded + another is empty
 *   - sorts suggestions DESC by scoreImprovement (most impactful first)
 *   - honours scoreImprovementThreshold (won't suggest marginal moves)
 *   - throws on missing branchId
 *   - service NEVER writes — assigneeId unchanged after suggestion run
 *   - HTTP route returns the analysis envelope under success+data
 *   - cross-branch caller hit by 403 when querying foreign branch
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
let Beneficiary;
let User;
let rebalance;
let app;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w510-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ MeasureAlert } = require('../domains/goals/models/MeasureAlert'));
  Beneficiary = require('../models/Beneficiary');
  User = require('../models/User');
  await MeasureAlert.init();
  rebalance = require('../services/caseload-rebalance.service');

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
  await Beneficiary.deleteMany({});
  await User.deleteMany({});
  testCtx.user = null;
  testCtx.branchScope = null;
});

// ─── Fixtures ─────────────────────────────────────────────────────

async function makeBeneficiary(overrides = {}) {
  return Beneficiary.create({
    firstName: overrides.firstName || 'Test',
    lastName: overrides.lastName || 'Ben',
    firstName_ar: overrides.firstName_ar || 'تجربة',
    lastName_ar: overrides.lastName_ar || 'مستفيد',
    branchId: overrides.branchId,
    ...overrides,
  });
}

async function makeTherapist(overrides = {}) {
  const firstName = overrides.firstName || `T${Math.random().toString(36).slice(2, 6)}`;
  const lastName = overrides.lastName || 'X';
  return User.create({
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    email: overrides.email || `t${Math.random().toString(36).slice(2, 8)}@x.io`,
    password: 'X1!aaaaa',
    role: 'therapist',
    isActive: overrides.isActive ?? true,
    branchId: overrides.branchId,
    experienceYears: overrides.experienceYears ?? 5,
    ...overrides,
  });
}

async function seedOpenAlerts({ beneficiaryId, branchId, assigneeId, count }) {
  const created = [];
  for (let i = 0; i < count; i++) {
    const doc = await MeasureAlert.create({
      beneficiaryId: beneficiaryId || new mongoose.Types.ObjectId(),
      measureId: new mongoose.Types.ObjectId(),
      measureCode: 'BERG',
      branchId,
      alertType: 'FORECAST_OFF_TRACK',
      severity: 'medium',
      status: 'open',
      firstSeenAt: new Date(),
      lastEvaluatedAt: new Date(),
      assigneeId,
    });
    created.push(doc);
  }
  return created;
}

// ════════════════════════════════════════════════════════════════════
// suggestRebalanceMoves
// ════════════════════════════════════════════════════════════════════

describe('W510 — suggestRebalanceMoves', () => {
  test('throws on missing branchId', async () => {
    await expect(rebalance.suggestRebalanceMoves({})).rejects.toThrow(/branchId/);
  });

  test('returns empty when no therapists in branch', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const r = await rebalance.suggestRebalanceMoves({ branchId });
    expect(r.suggestions).toEqual([]);
    expect(r.reason).toBe('insufficient_therapists');
  });

  test('returns no_overloaded when all therapists are below threshold', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const tA = await makeTherapist({ branchId });
    const tB = await makeTherapist({ branchId });
    // Each gets 2 alerts — well below default threshold (12).
    await seedOpenAlerts({ branchId, assigneeId: tA._id, count: 2 });
    await seedOpenAlerts({ branchId, assigneeId: tB._id, count: 2 });

    const r = await rebalance.suggestRebalanceMoves({ branchId });
    expect(r.suggestions).toEqual([]);
    expect(r.reason).toBe('no_overloaded');
    expect(r.overloaded).toHaveLength(0);
    expect(r.underloaded).toHaveLength(2);
  });

  test('suggests moves when one therapist is overloaded + another underloaded', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const tOver = await makeTherapist({ branchId, experienceYears: 5 });
    const tFree = await makeTherapist({ branchId, experienceYears: 5 });
    // 15 alerts on tOver — over threshold (default 12).
    await seedOpenAlerts({ branchId, assigneeId: tOver._id, count: 15 });
    // tFree gets nothing → currentLoad=0 → big load factor gap.

    const r = await rebalance.suggestRebalanceMoves({ branchId });
    expect(r.overloaded).toHaveLength(1);
    expect(r.underloaded).toHaveLength(1);
    expect(r.suggestions.length).toBeGreaterThan(0);
    expect(r.suggestions.length).toBeLessThanOrEqual(50);
    // Every suggestion targets tFree
    for (const s of r.suggestions) {
      expect(s.suggestedTherapistId).toBe(String(tFree._id));
      expect(s.currentTherapistId).toBe(String(tOver._id));
      expect(s.scoreImprovement).toBeGreaterThanOrEqual(0.1);
    }
  });

  test('sorts suggestions DESC by scoreImprovement', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const tOver = await makeTherapist({ branchId });
    await makeTherapist({ branchId });
    await seedOpenAlerts({ branchId, assigneeId: tOver._id, count: 15 });

    const r = await rebalance.suggestRebalanceMoves({ branchId });
    expect(r.suggestions.length).toBeGreaterThan(1);
    for (let i = 1; i < r.suggestions.length; i++) {
      expect(r.suggestions[i - 1].scoreImprovement).toBeGreaterThanOrEqual(
        r.suggestions[i].scoreImprovement
      );
    }
  });

  test('NEVER writes — assigneeId unchanged after analysis', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const tOver = await makeTherapist({ branchId });
    await makeTherapist({ branchId });
    const alerts = await seedOpenAlerts({
      branchId,
      assigneeId: tOver._id,
      count: 15,
    });

    await rebalance.suggestRebalanceMoves({ branchId });

    // Re-fetch all alerts: every one should STILL be assigned to tOver.
    for (const alert of alerts) {
      const after = await MeasureAlert.findById(alert._id).lean();
      expect(String(after.assigneeId)).toBe(String(tOver._id));
    }
  });

  test('scoreImprovementThreshold filters out marginal moves', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const tOver = await makeTherapist({ branchId, experienceYears: 5 });
    await makeTherapist({ branchId, experienceYears: 5 });
    await seedOpenAlerts({ branchId, assigneeId: tOver._id, count: 15 });

    // Very high improvement threshold → no suggestions.
    const r = await rebalance.suggestRebalanceMoves({
      branchId,
      scoreImprovementThreshold: 0.99,
    });
    expect(r.suggestions).toEqual([]);
    // overloaded/underloaded still computed
    expect(r.overloaded).toHaveLength(1);
    expect(r.underloaded).toHaveLength(1);
  });

  test('maxSuggestions caps the output', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const tOver = await makeTherapist({ branchId });
    await makeTherapist({ branchId });
    await seedOpenAlerts({ branchId, assigneeId: tOver._id, count: 20 });

    const r = await rebalance.suggestRebalanceMoves({
      branchId,
      maxSuggestions: 3,
    });
    expect(r.suggestions.length).toBeLessThanOrEqual(3);
  });
});

// ════════════════════════════════════════════════════════════════════
// HTTP route
// ════════════════════════════════════════════════════════════════════

describe('W510 — HTTP /branch/:branchId/suggestions', () => {
  test('200 returns analysis envelope under success+data', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const tOver = await makeTherapist({ branchId });
    await makeTherapist({ branchId });
    await seedOpenAlerts({ branchId, assigneeId: tOver._id, count: 15 });

    testCtx.user = { _id: new mongoose.Types.ObjectId(), role: 'supervisor' };

    const r = await request(app).get(`/api/v1/caseload-rebalance/branch/${branchId}/suggestions`);
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    expect(r.body.data.branchId).toBe(String(branchId));
    expect(Array.isArray(r.body.data.suggestions)).toBe(true);
    expect(Array.isArray(r.body.data.overloaded)).toBe(true);
    expect(Array.isArray(r.body.data.underloaded)).toBe(true);
  });

  test('403 when restricted caller queries a foreign branch', async () => {
    const branchA = new mongoose.Types.ObjectId();
    const branchB = new mongoose.Types.ObjectId();
    testCtx.user = { _id: new mongoose.Types.ObjectId(), role: 'supervisor' };
    testCtx.branchScope = { allowedBranchIds: [branchA] };

    const r = await request(app).get(`/api/v1/caseload-rebalance/branch/${branchB}/suggestions`);
    expect(r.status).toBe(403);
    expect(r.body.success).toBe(false);
  });

  test('honours query params (threshold/improvement/limit)', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const tOver = await makeTherapist({ branchId });
    await makeTherapist({ branchId });
    await seedOpenAlerts({ branchId, assigneeId: tOver._id, count: 15 });

    testCtx.user = { _id: new mongoose.Types.ObjectId(), role: 'supervisor' };

    // Very high threshold (20) → tOver not overloaded → no suggestions.
    const r = await request(app).get(
      `/api/v1/caseload-rebalance/branch/${branchId}/suggestions?threshold=20`
    );
    expect(r.status).toBe(200);
    expect(r.body.data.suggestions).toEqual([]);
    expect(r.body.data.overloaded).toHaveLength(0);
  });
});

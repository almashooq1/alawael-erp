'use strict';

/**
 * smart-inbox-route-wave507.test.js — Wave 507 (Phase E2).
 *
 * Behavioural drift guard for routes/smart-inbox.routes.js. Tests against
 * real Mongoose (MongoMemoryServer + supertest) to catch:
 *   - assignee-first scope selection
 *   - branch-scope fallback when no assigned alerts exist
 *   - branchFilter applied — restricted callers never see foreign branches
 *   - ranking applied — items returned DESC by score, signals attached
 *   - limit honoured (default 20, max 100)
 *   - rich raw payload passed through for the UI
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

// Stub middleware BEFORE the route module is required (Jest hoists
// jest.mock() calls to the top of the file). The stubs read state out
// of a shared `testCtx` object that each test mutates before calling
// supertest — keeps the require chain pure.
const testCtx = {
  user: null,
  branchScope: null,
};

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

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let MeasureAlert;
let app;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w507-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ MeasureAlert } = require('../domains/goals/models/MeasureAlert'));
  await MeasureAlert.init();

  const router = require('../routes/smart-inbox.routes');
  app = express();
  app.use(express.json());
  app.use('/api/v1/smart-inbox', router);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await MeasureAlert.deleteMany({});
  testCtx.user = null;
  testCtx.branchScope = null;
});

async function seedAlert({
  beneficiaryId,
  measureId,
  branchId,
  assigneeId = null,
  severity = 'medium',
  alertType = 'FORECAST_OFF_TRACK',
  firstSeenAt = new Date(),
  status = 'open',
  evidence = {},
}) {
  return MeasureAlert.create({
    beneficiaryId: beneficiaryId || new mongoose.Types.ObjectId(),
    measureId: measureId || new mongoose.Types.ObjectId(),
    measureCode: 'BERG',
    branchId,
    alertType,
    severity,
    status,
    firstSeenAt,
    lastEvaluatedAt: new Date(),
    assigneeId,
    evidence,
  });
}

// ════════════════════════════════════════════════════════════════════
// Smart inbox /me — scope selection
// ════════════════════════════════════════════════════════════════════

describe('W507 — GET /api/v1/smart-inbox/me scope selection', () => {
  test("returns scope='assigned' when caller has any assigned open alert", async () => {
    const userId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    testCtx.user = { _id: userId, role: 'therapist' };

    await seedAlert({ assigneeId: userId, branchId, severity: 'high' });
    await seedAlert({ branchId, severity: 'critical' }); // unassigned — ignored

    const r = await request(app).get('/api/v1/smart-inbox/me');
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    expect(r.body.data.scope).toBe('assigned');
    expect(r.body.data.items).toHaveLength(1);
  });

  test("falls back to scope='branch' when caller has no assigned alerts", async () => {
    const userId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    testCtx.user = { _id: userId, role: 'supervisor' };

    await seedAlert({ branchId, severity: 'high' });
    await seedAlert({ branchId, severity: 'medium' });

    const r = await request(app).get('/api/v1/smart-inbox/me');
    expect(r.status).toBe(200);
    expect(r.body.data.scope).toBe('branch');
    expect(r.body.data.items).toHaveLength(2);
  });

  test('returns empty list when no open alerts exist anywhere', async () => {
    testCtx.user = { _id: new mongoose.Types.ObjectId(), role: 'supervisor' };
    const r = await request(app).get('/api/v1/smart-inbox/me');
    expect(r.status).toBe(200);
    expect(r.body.data.items).toEqual([]);
    expect(r.body.data.total).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════
// Branch isolation via branchFilter
// ════════════════════════════════════════════════════════════════════

describe('W507 — branch isolation', () => {
  test('restricted caller in branch A never sees branch B alerts', async () => {
    const branchA = new mongoose.Types.ObjectId();
    const branchB = new mongoose.Types.ObjectId();
    testCtx.user = { _id: new mongoose.Types.ObjectId(), role: 'supervisor' };
    testCtx.branchScope = { allowedBranchIds: [branchA] };

    await seedAlert({ branchId: branchA, severity: 'high' });
    await seedAlert({ branchId: branchB, severity: 'critical' });

    const r = await request(app).get('/api/v1/smart-inbox/me');
    expect(r.status).toBe(200);
    expect(r.body.data.items).toHaveLength(1);
    expect(r.body.data.items[0].item.raw.branchId).toBe(String(branchA));
  });
});

// ════════════════════════════════════════════════════════════════════
// Ranking + role bias + limit
// ════════════════════════════════════════════════════════════════════

describe('W507 — ranking and limits', () => {
  test('items sorted DESC by score with signals attached', async () => {
    const branchId = new mongoose.Types.ObjectId();
    testCtx.user = { _id: new mongoose.Types.ObjectId(), role: 'supervisor' };

    await seedAlert({ branchId, severity: 'low', alertType: 'MCID_NOT_MET' });
    await seedAlert({
      branchId,
      severity: 'critical',
      alertType: 'FORECAST_OFF_TRACK',
    });
    await seedAlert({ branchId, severity: 'medium', alertType: 'PLATEAU_DETECTED' });

    const r = await request(app).get('/api/v1/smart-inbox/me');
    expect(r.status).toBe(200);
    const items = r.body.data.items;
    expect(items).toHaveLength(3);
    for (let i = 1; i < items.length; i++) {
      expect(items[i - 1].score).toBeGreaterThanOrEqual(items[i].score);
    }
    expect(items[0].item.severity).toBe('critical');
    for (const it of items) {
      expect(Array.isArray(it.signals)).toBe(true);
    }
  });

  test('limit clamps to [1, 100] (default 20)', async () => {
    const branchId = new mongoose.Types.ObjectId();
    testCtx.user = { _id: new mongoose.Types.ObjectId(), role: 'supervisor' };
    for (let i = 0; i < 25; i++) {
      await seedAlert({ branchId });
    }
    const r1 = await request(app).get('/api/v1/smart-inbox/me?limit=5');
    expect(r1.body.data.items).toHaveLength(5);
    expect(r1.body.data.total).toBe(25);

    const r2 = await request(app).get('/api/v1/smart-inbox/me');
    expect(r2.body.data.items).toHaveLength(20);

    const r3 = await request(app).get('/api/v1/smart-inbox/me?limit=10000');
    expect(r3.body.data.items.length).toBeLessThanOrEqual(100);
  });

  test('returns full raw payload for the UI on each item', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const beneficiaryId = new mongoose.Types.ObjectId();
    const measureId = new mongoose.Types.ObjectId();
    testCtx.user = { _id: new mongoose.Types.ObjectId(), role: 'supervisor' };

    await seedAlert({
      beneficiaryId,
      measureId,
      branchId,
      severity: 'high',
      alertType: 'FORECAST_OFF_TRACK',
      evidence: {
        goalTitle: 'تحسين توازن الجلوس',
        message_ar: 'الإسقاط دون الهدف.',
      },
    });
    const r = await request(app).get('/api/v1/smart-inbox/me');
    const raw = r.body.data.items[0].item.raw;
    expect(raw.beneficiaryId).toBe(String(beneficiaryId));
    expect(raw.measureId).toBe(String(measureId));
    expect(raw.measureCode).toBe('BERG');
    expect(raw.alertType).toBe('FORECAST_OFF_TRACK');
    expect(raw.severity).toBe('high');
    expect(raw.goalTitle).toBe('تحسين توازن الجلوس');
    expect(raw.messageAr).toBe('الإسقاط دون الهدف.');
  });
});

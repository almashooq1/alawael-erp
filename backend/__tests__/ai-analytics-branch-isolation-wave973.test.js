'use strict';

/**
 * ai-analytics-branch-isolation-wave973.test.js — W973.
 *
 * Pre-W973 ai-analytics.routes.js scoped its list endpoints with
 *   `if (branch_id) filter.branch_id = branch_id;`            // honoured a SPOOFED ?branch_id
 *   `else if (req.user?.branch_id) filter.branch_id = ...`    // never-populated → no scope
 * — so a restricted user with no query LEAKED every branch's AI alerts, and one
 * who passed `?branch_id=<other>` could SPOOF into any branch. W973 routes the 7
 * sites through a local `aiBranchFilter(req)` (the telehealth template over the
 * snake `branch_id` field), which drives off req.branchScope (ignores the query
 * for restricted users). Real Express + real branchScope + MongoMemoryServer.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockAuthState = { user: null };
jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

let mongod;
let AiAlert;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

// branchId-only — replicates production (the snake `branch_id` is never on req.user).
const doctorA = {
  _id: new mongoose.Types.ObjectId(),
  id: String(new mongoose.Types.ObjectId()),
  role: 'therapist',
  branchId: String(BRANCH_A),
};
const superAdmin = {
  _id: new mongoose.Types.ObjectId(),
  id: String(new mongoose.Types.ObjectId()),
  role: 'super_admin',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/ai-analytics', require('../routes/ai-analytics.routes'));
  return app;
}

let app;
let n = 0;
async function seedAlert(branch_id) {
  n += 1;
  return AiAlert.collection.insertOne({
    alert_type: 'risk',
    severity: 'info',
    target_type: 'beneficiary',
    target_id: new mongoose.Types.ObjectId(),
    message_ar: `تنبيه ${n}`,
    message_en: `alert ${n}`,
    branch_id,
    is_read: false,
    is_dismissed: false,
    deleted_at: null,
    created_at: new Date(),
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w973-ai-analytics' } });
  await mongoose.connect(mongod.getUri());
  AiAlert = require('../models/AiAlert');
  await AiAlert.init();
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = doctorA;
});

afterEach(async () => {
  await AiAlert.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

const branchesOf = res => (res.body.data || []).map(a => String(a.branch_id));

describe('W973 — ai-analytics alert list is branch-scoped (was leaking + spoofable)', () => {
  it('a restricted user sees ONLY their branch alerts', async () => {
    mockAuthState.user = doctorA;
    await seedAlert(BRANCH_A);
    await seedAlert(BRANCH_B);
    const res = await request(app).get('/api/ai-analytics/alerts');
    expect(res.status).toBe(200);
    expect(branchesOf(res)).toContain(String(BRANCH_A));
    expect(branchesOf(res)).not.toContain(String(BRANCH_B)); // pre-W973: leaked both
  });

  it('a restricted user CANNOT spoof another branch via ?branch_id', async () => {
    mockAuthState.user = doctorA;
    await seedAlert(BRANCH_A);
    await seedAlert(BRANCH_B);
    const res = await request(app).get(`/api/ai-analytics/alerts?branch_id=${BRANCH_B}`);
    expect(res.status).toBe(200);
    expect(branchesOf(res)).not.toContain(String(BRANCH_B)); // pre-W973: ?branch_id let them in
    expect(branchesOf(res)).toContain(String(BRANCH_A));
  });

  it('a cross-branch super_admin sees ALL alerts', async () => {
    mockAuthState.user = superAdmin;
    await seedAlert(BRANCH_A);
    await seedAlert(BRANCH_B);
    const res = await request(app).get('/api/ai-analytics/alerts');
    expect(res.status).toBe(200);
    expect(branchesOf(res)).toEqual(expect.arrayContaining([String(BRANCH_A), String(BRANCH_B)]));
  });
});

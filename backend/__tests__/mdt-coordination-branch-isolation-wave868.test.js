'use strict';

/**
 * mdt-coordination-branch-isolation-wave868.test.js — W868.
 *
 * Completes the W867 cross-branch IDOR closure on mdt-coordination.routes.js.
 * W867 fixed the 3 primary MDTMeeting CRUD endpoints; W868 converts every
 * remaining bare instance lookup in the file to a branch-scoped findOne/
 * findOneAndDelete: the MDTMeeting sub-resource endpoints + ALL UnifiedRehabPlan
 * and ReferralTicket instance endpoints (GET/:id with NO authorize gate were the
 * worst — any restricted user could read another branch's rehab plan or referral
 * ticket: beneficiary names, MRNs, clinical reasons, specialist correspondence).
 * These tests prove the plan + ticket instance reads are now branch-scoped.
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
  authorize:
    (...args) =>
    (req, res, next) => {
      const roles = args.flat();
      const role = req.user && req.user.role;
      if (roles.includes(role)) return next();
      return res.status(403).json({ success: false, message: 'forbidden' });
    },
}));

let mongod;
let UnifiedRehabPlan;
let ReferralTicket;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const MANAGER_A = new mongoose.Types.ObjectId();
const ADMIN_A = new mongoose.Types.ObjectId();

const managerA = {
  _id: MANAGER_A,
  id: String(MANAGER_A),
  role: 'manager',
  name: 'مدير الفرع',
  branchId: String(BRANCH_A),
};
const adminA = { _id: ADMIN_A, id: String(ADMIN_A), role: 'admin', branchId: String(BRANCH_A) };

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/mdt', require('../routes/mdt-coordination.routes'));
  return app;
}

let app;
let seq = 0;

async function seedPlan(branchId) {
  seq += 1;
  return UnifiedRehabPlan.create({
    planNumber: `PLAN-TEST-${seq}`,
    beneficiary: new mongoose.Types.ObjectId(),
    title: 'خطة تأهيل',
    startDate: new Date(),
    branchId,
    createdBy: MANAGER_A,
    status: 'ACTIVE',
  });
}

async function seedTicket(branchId) {
  seq += 1;
  return ReferralTicket.create({
    ticketNumber: `REF-TEST-${seq}`,
    beneficiary: new mongoose.Types.ObjectId(),
    referredBy: MANAGER_A,
    fromDepartment: 'PT',
    toDepartment: 'OT',
    reason: 'تقييم وظيفي',
    branchId,
    status: 'PENDING',
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w868-mdt' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  require('../models/User');
  require('../models/Beneficiary');
  ({ UnifiedRehabPlan, ReferralTicket } = require('../models/MDTCoordination'));
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = managerA;
});

afterEach(async () => {
  await Promise.all([UnifiedRehabPlan.deleteMany({}), ReferralTicket.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W868 — UnifiedRehabPlan GET /:id branch isolation', () => {
  it('reads an own-branch plan (200)', async () => {
    const p = await seedPlan(BRANCH_A);
    const res = await request(app).get(`/api/v1/mdt/plans/${p._id}`);
    expect(res.status).toBe(200);
    expect(String(res.body.data._id)).toBe(String(p._id));
  });

  it('404s a foreign-branch plan (was an IDOR read of clinical plan + MRN)', async () => {
    const foreign = await seedPlan(BRANCH_B);
    const res = await request(app).get(`/api/v1/mdt/plans/${foreign._id}`);
    expect(res.status).toBe(404);
  });

  it('an admin (cross-branch) deletes an own-branch plan; a manager is forbidden (admin-only)', async () => {
    const p = await seedPlan(BRANCH_A);
    expect((await request(app).delete(`/api/v1/mdt/plans/${p._id}`)).status).toBe(403);
    mockAuthState.user = adminA;
    expect((await request(app).delete(`/api/v1/mdt/plans/${p._id}`)).status).toBe(200);
    expect(await UnifiedRehabPlan.countDocuments({})).toBe(0);
  });
});

describe('W868 — ReferralTicket GET /:id branch isolation', () => {
  it('reads an own-branch referral (200)', async () => {
    const t = await seedTicket(BRANCH_A);
    const res = await request(app).get(`/api/v1/mdt/referrals/${t._id}`);
    expect(res.status).toBe(200);
    expect(String(res.body.data._id)).toBe(String(t._id));
  });

  it('404s a foreign-branch referral (was an IDOR read of referral reason + correspondence)', async () => {
    const foreign = await seedTicket(BRANCH_B);
    const res = await request(app).get(`/api/v1/mdt/referrals/${foreign._id}`);
    expect(res.status).toBe(404);
  });
});

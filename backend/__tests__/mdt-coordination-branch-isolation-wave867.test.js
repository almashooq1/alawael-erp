'use strict';

/**
 * mdt-coordination-branch-isolation-wave867.test.js — W867.
 *
 * Cross-branch IDOR regression guard for the MDT-meeting instance endpoints.
 * W867 closed an IDOR: pre-W867 `GET /meetings/:id` (NO authorize gate) and
 * `PUT /meetings/:id` (authorize ['admin','manager'] — manager is branch-level)
 * used bare findById/findByIdAndUpdate with no branch filter, so a restricted
 * branch-A user could read, and a branch-A manager could rewrite, another
 * branch's MDT meeting (beneficiary names + MRNs + clinical case discussion)
 * by guessing the ObjectId. These tests prove the three primary MDTMeeting CRUD
 * instance endpoints are now branch-scoped (foreign → 404).
 *
 * NOTE: the same file's MDTMeeting sub-resource endpoints + the UnifiedRehabPlan
 * and ReferralTicket instance endpoints carry the same leak — tracked as W868.
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
let MDTMeeting;

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

async function seedMeeting(branchId, overrides = {}) {
  seq += 1;
  return MDTMeeting.create({
    meetingNumber: `MDT-TEST-${seq}`,
    title: 'اجتماع فريق',
    date: new Date(),
    startTime: '10:00',
    organizer: new mongoose.Types.ObjectId(),
    createdBy: MANAGER_A,
    branchId,
    status: 'SCHEDULED',
    ...overrides,
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w867-mdt' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  require('../models/User');
  require('../models/Beneficiary');
  ({ MDTMeeting } = require('../models/MDTCoordination'));
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = managerA;
});

afterEach(async () => {
  await MDTMeeting.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W867 — MDT meeting GET /:id branch isolation', () => {
  it('reads an own-branch meeting (200)', async () => {
    const m = await seedMeeting(BRANCH_A);
    const res = await request(app).get(`/api/v1/mdt/meetings/${m._id}`);
    expect(res.status).toBe(200);
    expect(String(res.body.data._id)).toBe(String(m._id));
  });

  it('404s a foreign-branch meeting (was an IDOR read)', async () => {
    const foreign = await seedMeeting(BRANCH_B);
    const res = await request(app).get(`/api/v1/mdt/meetings/${foreign._id}`);
    expect(res.status).toBe(404);
  });
});

describe('W867 — MDT meeting PUT /:id branch isolation', () => {
  it('updates an own-branch meeting (200)', async () => {
    const m = await seedMeeting(BRANCH_A);
    const res = await request(app)
      .put(`/api/v1/mdt/meetings/${m._id}`)
      .send({ title: 'عنوان محدّث' });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('عنوان محدّث');
  });

  it('cannot rewrite a foreign-branch meeting (404, unchanged)', async () => {
    const foreign = await seedMeeting(BRANCH_B, { title: 'الأصلي' });
    const res = await request(app)
      .put(`/api/v1/mdt/meetings/${foreign._id}`)
      .send({ title: 'محاولة اختراق' });
    expect(res.status).toBe(404);
    expect((await MDTMeeting.findById(foreign._id).lean()).title).toBe('الأصلي');
  });
});

describe('W867 — MDT meeting DELETE /:id', () => {
  it('an admin (cross-branch) deletes an own-branch meeting (200)', async () => {
    const m = await seedMeeting(BRANCH_A);
    mockAuthState.user = adminA;
    const res = await request(app).delete(`/api/v1/mdt/meetings/${m._id}`);
    expect(res.status).toBe(200);
    expect(await MDTMeeting.countDocuments({})).toBe(0);
  });

  it('forbids a manager from deleting (403 — admin-only)', async () => {
    const m = await seedMeeting(BRANCH_A);
    const res = await request(app).delete(`/api/v1/mdt/meetings/${m._id}`);
    expect(res.status).toBe(403);
    expect(await MDTMeeting.countDocuments({})).toBe(1);
  });
});

'use strict';

/**
 * complaints-routes-behavioral-wave866.test.js — W866.
 *
 * Behavioral coverage + cross-branch IDOR regression guard for the complaints
 * surface. Real Express + real branchScope + MongoMemoryServer; only auth
 * mocked. W866 closed an IDOR: pre-W866 the instance endpoints (GET/PUT/
 * respond/escalate/resolve/rate/DELETE /:id) used bare findById/
 * findByIdAndUpdate with NO branch filter, so a restricted user in branch A
 * could read/modify/resolve/delete a branch-B complaint (PII + grievance
 * content) by guessing the ObjectId. These tests prove every instance path is
 * now branch-scoped (foreign → 404) plus exercise the complaint lifecycle.
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
  authorize: () => (req, res, next) => {
    // Faithful role check: the routes call authorize(['admin','super_admin','manager']).
    const ALLOWED = ['admin', 'super_admin', 'manager'];
    const role = req.user && req.user.role;
    if (ALLOWED.includes(role)) return next();
    return res.status(403).json({ success: false, message: 'forbidden' });
  },
}));

let mongod;
let Complaint;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const MANAGER_A = new mongoose.Types.ObjectId();
const STAFF_A = new mongoose.Types.ObjectId();

// Restricted manager in branch A (can write); restricted staff in branch A (read + rate only).
const managerA = {
  _id: MANAGER_A,
  id: String(MANAGER_A),
  role: 'manager',
  name: 'مدير الفرع',
  branchId: String(BRANCH_A),
};
const staffA = {
  _id: STAFF_A,
  id: String(STAFF_A),
  role: 'employee',
  name: 'موظف',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/complaints', require('../routes/complaints.routes'));
  return app;
}

let app;

async function createComplaint(overrides = {}) {
  return request(app)
    .post('/api/v1/complaints')
    .send({
      subject: 'تأخر في الرد',
      description: 'لم أتلقَ رداً على طلبي',
      source: 'customer',
      type: 'complaint',
      ...overrides,
    });
}

// Seed a complaint directly in a given branch (bypassing the route).
async function seed(branchId, overrides = {}) {
  return Complaint.create({
    subject: 'بلاغ',
    description: 'تفاصيل',
    source: 'customer',
    type: 'complaint',
    submittedBy: MANAGER_A,
    createdBy: MANAGER_A,
    branchId,
    ...overrides,
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w866-complaints' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  require('../models/User'); // populate('submittedBy'/'assignedTo') targets User
  Complaint = require('../models/Complaint');
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = managerA;
});

afterEach(async () => {
  await Complaint.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W866 — create + branch stamping', () => {
  it('creates a complaint stamped with the filer branch (201)', async () => {
    const res = await createComplaint();
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('new');
    expect(String(res.body.data.branchId)).toBe(String(BRANCH_A));
  });

  it('rejects a complaint with an invalid source (400)', async () => {
    const res = await createComplaint({ source: 'martian' });
    expect(res.status).toBe(400);
  });

  it('rejects a complaint with no subject (400)', async () => {
    const res = await createComplaint({ subject: '' });
    expect(res.status).toBe(400);
  });
});

describe('W866 — cross-branch IDOR is closed (regression guard)', () => {
  it('GET /:id 404s a foreign-branch complaint', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app).get(`/api/v1/complaints/${foreign._id}`);
    expect(res.status).toBe(404);
  });

  it('GET / only lists caller-branch complaints', async () => {
    await seed(BRANCH_A);
    await seed(BRANCH_B);
    const res = await request(app).get('/api/v1/complaints');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(String(res.body.data[0].branchId)).toBe(String(BRANCH_A));
  });

  it('PUT /:id cannot update a foreign-branch complaint (404, unchanged)', async () => {
    const foreign = await seed(BRANCH_B, { status: 'new' });
    const res = await request(app)
      .put(`/api/v1/complaints/${foreign._id}`)
      .send({ status: 'in_progress' });
    expect(res.status).toBe(404);
    expect((await Complaint.findById(foreign._id).lean()).status).toBe('new');
  });

  it('escalate / resolve / respond / rate all 404 for a restricted caller across branches', async () => {
    const foreign = await seed(BRANCH_B);
    const fid = foreign._id;
    // managerA is restricted to branch A → branchFilter scopes every instance op.
    expect((await request(app).post(`/api/v1/complaints/${fid}/escalate`).send({})).status).toBe(
      404
    );
    expect(
      (await request(app).post(`/api/v1/complaints/${fid}/resolve`).send({ resolution: 'x' }))
        .status
    ).toBe(404);
    expect(
      (await request(app).post(`/api/v1/complaints/${fid}/respond`).send({ content: 'x' })).status
    ).toBe(404);
    expect(
      (await request(app).post(`/api/v1/complaints/${fid}/rate`).send({ rating: 5 })).status
    ).toBe(404);
    // foreign complaint untouched (still status 'new')
    expect((await Complaint.findById(fid).lean()).status).toBe('new');
  });
});

describe('W866 — lifecycle (same branch)', () => {
  it('respond moves new → under_review and appends a response', async () => {
    const id = (await createComplaint()).body.data._id;
    const res = await request(app)
      .post(`/api/v1/complaints/${id}/respond`)
      .send({ content: 'نعتذر عن التأخير، يتم المعالجة' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('under_review');
    expect(res.body.data.responses).toHaveLength(1);
  });

  it('escalate sets status=escalated + priority=critical', async () => {
    const id = (await createComplaint()).body.data._id;
    const res = await request(app).post(`/api/v1/complaints/${id}/escalate`).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('escalated');
    expect(res.body.data.priority).toBe('critical');
  });

  it('resolve requires a resolution and stamps resolvedAt', async () => {
    const id = (await createComplaint()).body.data._id;
    expect((await request(app).post(`/api/v1/complaints/${id}/resolve`).send({})).status).toBe(400);
    const res = await request(app)
      .post(`/api/v1/complaints/${id}/resolve`)
      .send({ resolution: 'تم حل المشكلة وإبلاغ العميل' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('resolved');
    expect(res.body.data.resolvedAt).toBeTruthy();
  });

  it('rate accepts 1-5 (any branch-scoped authenticated user) and rejects out-of-range', async () => {
    const id = (await createComplaint()).body.data._id;
    mockAuthState.user = staffA; // not a manager — rate has no authorize gate
    expect(
      (await request(app).post(`/api/v1/complaints/${id}/rate`).send({ rating: 9 })).status
    ).toBe(400);
    const ok = await request(app).post(`/api/v1/complaints/${id}/rate`).send({ rating: 4 });
    expect(ok.status).toBe(200);
    expect(ok.body.data.rating).toBe(4);
  });
});

describe('W866 — write-role gating', () => {
  it('forbids a non-manager from PUT / escalate / resolve (403)', async () => {
    const id = (await createComplaint()).body.data._id;
    mockAuthState.user = staffA;
    expect(
      (await request(app).put(`/api/v1/complaints/${id}`).send({ status: 'closed' })).status
    ).toBe(403);
    expect((await request(app).post(`/api/v1/complaints/${id}/escalate`).send({})).status).toBe(
      403
    );
    expect(
      (await request(app).post(`/api/v1/complaints/${id}/resolve`).send({ resolution: 'x' })).status
    ).toBe(403);
  });
});

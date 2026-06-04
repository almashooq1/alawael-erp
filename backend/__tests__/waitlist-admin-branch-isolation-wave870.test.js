'use strict';

/**
 * waitlist-admin-branch-isolation-wave870.test.js — W870.
 *
 * W451 closed PATCH /:id mass-assignment + branch filter, but offer/enroll/
 * withdraw/DELETE still used bare findByIdAndUpdate/Delete and list endpoints
 * ignored branchFilter — a receptionist in branch A could transition or delete
 * branch-B waitlist rows (prospect PII + service-line priority). W870 completes
 * branch isolation across every instance + list path. Real Express + real
 * branchScope + MongoMemoryServer; only auth mocked.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockAuthState = { user: null };
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
  requireRole: roles => (req, res, next) => {
    const role = req.user && req.user.role;
    if (!Array.isArray(roles) || roles.includes(role)) return next();
    return res.status(403).json({ success: false, message: 'forbidden' });
  },
}));

let mongod;
let WaitingListEntry;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

const receptionistA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'receptionist',
  name: 'الاستقبال',
  branchId: String(BRANCH_A),
};
const managerA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'manager',
  name: 'المدير',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/waitlist', require('../routes/waitlist-admin.routes'));
  return app;
}

let app;

async function seed(branchId, overrides = {}) {
  return WaitingListEntry.create({
    serviceType: 'علاج طبيعي',
    prospectName: 'عائلة',
    prospectPhone: '0500000000',
    branchId,
    status: 'waiting',
    priority: 2,
    ...overrides,
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w870-waitlist' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  WaitingListEntry = require('../models/WaitingListEntry');
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = receptionistA;
});

afterEach(async () => {
  await WaitingListEntry.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W870 — waitlist create stamps caller branch', () => {
  it('POST / stamps branchId from caller scope (201)', async () => {
    const res = await request(app)
      .post('/api/admin/waitlist')
      .send({ serviceType: 'علاج طبيعي', prospectName: 'جديد' });
    expect(res.status).toBe(201);
    expect(String(res.body.data.branchId)).toBe(String(BRANCH_A));
  });
});

describe('W870 — list endpoints are branch-scoped', () => {
  it('GET / only returns caller-branch rows', async () => {
    await seed(BRANCH_A, { prospectName: 'A' });
    await seed(BRANCH_B, { prospectName: 'B' });
    const res = await request(app).get('/api/admin/waitlist');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].prospectName).toBe('A');
  });

  it('GET /prioritized ignores foreign-branch waiters', async () => {
    await seed(BRANCH_A);
    await seed(BRANCH_B);
    const res = await request(app).get('/api/admin/waitlist/prioritized');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });
});

describe('W870 — instance transitions 404 across branches', () => {
  let foreignId;

  beforeEach(async () => {
    const row = await seed(BRANCH_B);
    foreignId = String(row._id);
  });

  it('PATCH /:id → 404', async () => {
    const res = await request(app).patch(`/api/admin/waitlist/${foreignId}`).send({ notes: 'x' });
    expect(res.status).toBe(404);
  });

  it('POST /:id/offer → 404', async () => {
    const res = await request(app).post(`/api/admin/waitlist/${foreignId}/offer`);
    expect(res.status).toBe(404);
  });

  it('POST /:id/enroll → 404', async () => {
    const res = await request(app).post(`/api/admin/waitlist/${foreignId}/enroll`);
    expect(res.status).toBe(404);
  });

  it('POST /:id/withdraw → 404', async () => {
    const res = await request(app).post(`/api/admin/waitlist/${foreignId}/withdraw`);
    expect(res.status).toBe(404);
  });

  it('DELETE /:id → 404', async () => {
    mockAuthState.user = managerA;
    const res = await request(app).delete(`/api/admin/waitlist/${foreignId}`);
    expect(res.status).toBe(404);
    expect(await WaitingListEntry.countDocuments({ _id: foreignId })).toBe(1);
  });
});

describe('W870 — same-branch lifecycle succeeds', () => {
  it('offer → enroll on caller-branch row', async () => {
    const row = await seed(BRANCH_A);
    const id = String(row._id);
    const offer = await request(app).post(`/api/admin/waitlist/${id}/offer`);
    expect(offer.status).toBe(200);
    expect(offer.body.data.status).toBe('offered');
    const enroll = await request(app).post(`/api/admin/waitlist/${id}/enroll`);
    expect(enroll.status).toBe(200);
    expect(enroll.body.data.status).toBe('enrolled');
  });
});

'use strict';

/**
 * laundry-routes-branch-isolation-wave875.test.js — W875.
 *
 * Laundry models use legacy `center` (ref Branch). Pre-W875 instance endpoints
 * used bare findById despite requireBranchAccess — any restricted user could
 * read/update foreign-branch laundry orders (beneficiary-linked linen tracking)
 * by ObjectId guess. W875 maps branchFilter → { center } on every instance
 * lookup and list/dashboard aggregation. Real Express + real branchScope +
 * MongoMemoryServer; only auth mocked.
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
}));

let mongod;
let LaundryOrder;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const USER_A = new mongoose.Types.ObjectId();

const managerA = {
  _id: USER_A,
  id: String(USER_A),
  role: 'manager',
  name: 'مدير الفرع',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/laundry', require('../routes/laundry.routes'));
  return app;
}

let app;

async function seedOrder(center, overrides = {}) {
  return LaundryOrder.create({
    center,
    type: 'personal',
    items: [{ name: 'قميص', quantity: 1, category: 'clothing' }],
    ...overrides,
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w875-laundry' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  ({ LaundryOrder } = require('../models/laundry.model'));
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = managerA;
});

afterEach(async () => {
  await LaundryOrder.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W875 — create stamps caller center', () => {
  it('POST /orders stamps center from caller scope (201)', async () => {
    const res = await request(app)
      .post('/api/v1/laundry/orders')
      .send({
        type: 'personal',
        items: [{ name: 'منشفة', quantity: 2, category: 'towels' }],
      });
    expect(res.status).toBe(201);
    expect(String(res.body.data.center)).toBe(String(BRANCH_A));
  });
});

describe('W875 — list is center-scoped', () => {
  it('GET /orders only returns caller-center rows', async () => {
    await seedOrder(BRANCH_A);
    await seedOrder(BRANCH_B);
    const res = await request(app).get('/api/v1/laundry/orders');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('W875 — GET /orders/:id branch isolation', () => {
  it('returns 404 for foreign-center order (IDOR regression)', async () => {
    const row = await seedOrder(BRANCH_B);
    const res = await request(app).get(`/api/v1/laundry/orders/${row._id}`);
    expect(res.status).toBe(404);
  });
});

describe('W875 — status transition 404 across centers', () => {
  it('PATCH /orders/:id/status → 404 on foreign center', async () => {
    const row = await seedOrder(BRANCH_B);
    const res = await request(app)
      .patch(`/api/v1/laundry/orders/${row._id}/status`)
      .send({ status: 'collected' });
    expect(res.status).toBe(404);
  });
});

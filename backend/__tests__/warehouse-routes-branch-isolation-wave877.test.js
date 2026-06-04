'use strict';

/**
 * warehouse-routes-branch-isolation-wave877.test.js — W877.
 * Warehouse model carries branchId; pre-W877 instance CRUD ignored branchFilter.
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
let Warehouse;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

const inventoryManagerA = {
  _id: new mongoose.Types.ObjectId(),
  id: String(new mongoose.Types.ObjectId()),
  role: 'inventory',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/warehouse', require('../routes/warehouse.routes'));
  return app;
}

async function seedWarehouse(branchId, code) {
  return Warehouse.create({
    branchId,
    code,
    nameAr: 'مستودع',
    type: 'main',
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w877-wh' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  Warehouse = require('../models/Warehouse');
});

beforeEach(() => {
  mockAuthState.user = inventoryManagerA;
});

afterEach(async () => {
  await Warehouse.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W877 — warehouse branch isolation', () => {
  it('POST / stamps branchId from caller scope (201)', async () => {
    const res = await request(buildApp())
      .post('/api/v1/warehouse')
      .send({ code: 'WH-A1', nameAr: 'مستودع أ' });
    expect(res.status).toBe(201);
    expect(String(res.body.data.branchId)).toBe(String(BRANCH_A));
  });

  it('GET /:id → 404 on foreign branch', async () => {
    const row = await seedWarehouse(BRANCH_B, 'WH-B1');
    const res = await request(buildApp()).get(`/api/v1/warehouse/${row._id}`);
    expect(res.status).toBe(404);
  });

  it('GET / list is branch-scoped', async () => {
    await seedWarehouse(BRANCH_A, 'WH-A2');
    await seedWarehouse(BRANCH_B, 'WH-B2');
    const res = await request(buildApp()).get('/api/v1/warehouse');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

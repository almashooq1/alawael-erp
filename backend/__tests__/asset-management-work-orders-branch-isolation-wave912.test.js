'use strict';

/**
 * asset-management-work-orders-branch-isolation-wave912.test.js — W912.
 *
 * MaintenanceWorkOrder carries branchId. Pre-W912 instance routes used
 * bare findById — IDOR across branches.
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

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const USER_A = new mongoose.Types.ObjectId();
const ASSET_A = new mongoose.Types.ObjectId();

const managerA = {
  _id: USER_A,
  id: String(USER_A),
  role: 'manager',
  branchId: String(BRANCH_A),
};

let mongod;
let MaintenanceWorkOrder;
let woB;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w912-asset-wo' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  MaintenanceWorkOrder = require('../models/MaintenanceWorkOrder');
  const appExpress = express();
  appExpress.use(express.json());
  appExpress.use('/api/v1/asset-management', require('../routes/asset-management.routes'));
  app = appExpress;

  await MaintenanceWorkOrder.collection.insertOne({
    workOrderNumber: 'WO-A-912',
    branchId: BRANCH_A,
    assetId: ASSET_A,
    type: 'preventive',
    title: 'صيانة أ',
    description: 'وصف',
    scheduledDate: new Date(),
    status: 'pending',
    createdBy: USER_A,
  });
  const ins = await MaintenanceWorkOrder.collection.insertOne({
    workOrderNumber: 'WO-B-912',
    branchId: BRANCH_B,
    assetId: ASSET_A,
    type: 'preventive',
    title: 'صيانة ب',
    description: 'وصف',
    scheduledDate: new Date(),
    status: 'pending',
    createdBy: USER_A,
  });
  woB = ins.insertedId;
});

beforeEach(() => {
  mockAuthState.user = managerA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W912 — work orders isolation', () => {
  it('lists only in-scope work orders', async () => {
    const res = await request(app).get('/api/v1/asset-management/work-orders');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(String(res.body.data[0].branchId)).toBe(String(BRANCH_A));
  });

  it('returns 404 for foreign-branch work order GET /:id', async () => {
    const res = await request(app).get(`/api/v1/asset-management/work-orders/${woB}`);
    expect(res.status).toBe(404);
  });
});

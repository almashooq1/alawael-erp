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
let AssetInventory;
let AssetTransfer;
let ResourceBooking;
let woB;
let inventoryA;
let inventoryB;
let transferB;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w912-asset-wo' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  MaintenanceWorkOrder = require('../models/MaintenanceWorkOrder');
  AssetInventory = require('../models/AssetInventory');
  AssetTransfer = require('../models/AssetTransfer');
  ResourceBooking = require('../models/ResourceBooking');
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

  const inv = await AssetInventory.collection.insertOne({
    inventoryNumber: 'INV-A-912',
    branchId: BRANCH_A,
    title: 'جرد فرع أ',
    inventoryDate: new Date(),
    status: 'draft',
    conductedBy: USER_A,
    createdBy: USER_A,
  });
  inventoryA = inv.insertedId;

  const invB = await AssetInventory.collection.insertOne({
    inventoryNumber: 'INV-B-912',
    branchId: BRANCH_B,
    title: 'جرد فرع ب',
    inventoryDate: new Date(),
    status: 'draft',
    conductedBy: USER_A,
    createdBy: USER_A,
  });
  inventoryB = invB.insertedId;

  await AssetTransfer.collection.insertOne({
    transferNumber: 'TR-A-912',
    branchId: BRANCH_A,
    assetId: ASSET_A,
    fromBranchId: BRANCH_A,
    toBranchId: BRANCH_B,
    transferDate: new Date(),
    reason: 'تشغيل',
    status: 'pending',
    createdBy: USER_A,
  });
  const trB = await AssetTransfer.collection.insertOne({
    transferNumber: 'TR-B-912',
    branchId: BRANCH_B,
    assetId: ASSET_A,
    fromBranchId: BRANCH_B,
    toBranchId: BRANCH_A,
    transferDate: new Date(),
    reason: 'صيانة',
    status: 'pending',
    createdBy: USER_A,
  });
  transferB = trB.insertedId;

  const today = new Date();
  await ResourceBooking.collection.insertOne({
    bookingNumber: 'BK-A-912',
    branchId: BRANCH_A,
    assetId: ASSET_A,
    bookedBy: USER_A,
    bookingDate: today,
    startTime: '10:00',
    endTime: '11:00',
    purpose: 'جلسة',
    status: 'confirmed',
    createdBy: USER_A,
  });
  await ResourceBooking.collection.insertOne({
    bookingNumber: 'BK-B-912',
    branchId: BRANCH_B,
    assetId: ASSET_A,
    bookedBy: USER_A,
    bookingDate: today,
    startTime: '12:00',
    endTime: '13:00',
    purpose: 'جلسة',
    status: 'confirmed',
    createdBy: USER_A,
  });
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

  it('lists only in-scope transfers', async () => {
    const res = await request(app).get('/api/v1/asset-management/transfers');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(String(res.body.data[0].branchId)).toBe(String(BRANCH_A));
  });

  it('returns 404 for foreign-branch transfer action', async () => {
    const res = await request(app).patch(`/api/v1/asset-management/transfers/${transferB}/receive`);
    expect(res.status).toBe(404);
  });

  it('returns 404 for foreign-branch inventory GET /inventories/:id', async () => {
    const res = await request(app).get(`/api/v1/asset-management/inventories/${inventoryB}`);
    expect(res.status).toBe(404);
  });

  it('scopes dashboard branch-aware counters to caller branch', async () => {
    const res = await request(app).get('/api/v1/asset-management/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.data.pendingWorkOrders).toBe(1);
    expect(res.body.data.pendingTransfers).toBe(1);
    expect(res.body.data.activeBookingsToday).toBe(1);
  });

  it('inherits branchId from parent inventory on item create', async () => {
    const res = await request(app)
      .post(`/api/v1/asset-management/inventories/${inventoryA}/items`)
      .send({
        assetId: ASSET_A,
        status: 'found',
      });
    expect(res.status).toBe(201);
    expect(String(res.body.data.branchId)).toBe(String(BRANCH_A));
  });

  it('rejects foreign branchId spoof in body before handler logic', async () => {
    const res = await request(app)
      .post(`/api/v1/asset-management/inventories/${inventoryA}/items`)
      .send({
        assetId: ASSET_A,
        status: 'found',
        branchId: BRANCH_B,
      });
    expect(res.status).toBe(403);
  });
});

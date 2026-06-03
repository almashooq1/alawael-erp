'use strict';

/**
 * W805 — behavioral: GET /ops/work-orders?facilityAssetId list filter.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (_req, _res, next) => next(),
  branchFilter: () => ({}),
}));

jest.mock('../middleware/auth', () => ({
  authenticateToken: (_req, _res, next) => next(),
  authenticate: (_req, _res, next) => next(),
  authorize: () => (_req, _res, next) => next(),
  requireRole: () => (_req, _res, next) => next(),
}));

let mongod;
let app;
let branchId;
let userId;

function woPayload(overrides = {}) {
  return {
    workOrderNumber: `WO-W805-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    branchId,
    type: 'corrective',
    priority: 'normal',
    status: 'submitted',
    title: 'Filter test WO',
    description: 'W805 list filter',
    scheduledDate: new Date(),
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w805-wo-list-filter' } });
  await mongoose.connect(mongod.getUri());
  branchId = new mongoose.Types.ObjectId();
  userId = new mongoose.Types.ObjectId();

  require('../models/FacilityAsset');
  require('../models/operations/Facility.model');
  require('../models/MaintenanceWorkOrder');

  app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id: userId, _id: userId, role: 'facility_manager', branchId };
    next();
  });
  app.use('/api/v1/ops/work-orders', require('../routes/operations/workOrder.routes'));
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  const FacilityAsset = require('../models/FacilityAsset');
  const MaintenanceWorkOrder = require('../models/MaintenanceWorkOrder');
  await FacilityAsset.deleteMany({});
  await MaintenanceWorkOrder.deleteMany({});
});

describe('W805 ops work-order list facilityAssetId filter', () => {
  it('returns only work orders linked to the requested facility asset', async () => {
    const FacilityAsset = require('../models/FacilityAsset');
    const MaintenanceWorkOrder = require('../models/MaintenanceWorkOrder');
    const assetA = await FacilityAsset.create({
      assetTag: 'ELV-W805-A',
      name: 'Elevator A',
      nameAr: 'مصعد أ',
      category: 'elevator',
      branchId,
      criticality: 'medium',
    });
    const assetB = new mongoose.Types.ObjectId();

    await MaintenanceWorkOrder.create([
      woPayload({ facilityAssetId: assetA._id, title: 'WO for asset A' }),
      woPayload({ facilityAssetId: assetB, title: 'WO for asset B' }),
      woPayload({ facilityId: new mongoose.Types.ObjectId(), title: 'WO facility only' }),
    ]);

    const res = await request(app)
      .get('/api/v1/ops/work-orders')
      .query({ facilityAssetId: assetA._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].facilityAssetId._id.toString()).toBe(assetA._id.toString());
    expect(res.body.data[0].facilityAssetId.assetTag).toBe('ELV-W805-A');
    expect(res.body.data[0].facilityAssetId.nameAr).toBe('مصعد أ');
    expect(res.body.data[0].title).toBe('WO for asset A');
  });

  it('rejects invalid facilityAssetId query with 400', async () => {
    const res = await request(app)
      .get('/api/v1/ops/work-orders')
      .query({ facilityAssetId: 'not-a-mongo-id' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

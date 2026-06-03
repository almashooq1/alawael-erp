'use strict';

/**
 * W802 — behavioral: FacilityAsset spawn-work-order → MaintenanceWorkOrder.
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

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w802-spawn-wo' } });
  await mongoose.connect(mongod.getUri());
  branchId = new mongoose.Types.ObjectId();
  userId = new mongoose.Types.ObjectId();

  require('../models/FacilityAsset');
  const MaintenanceWorkOrder = require('../models/MaintenanceWorkOrder');

  app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id: userId, _id: userId, role: 'facility_manager', branchId };
    next();
  });
  app.use('/api/v1/facility-asset', require('../routes/facility-asset.routes'));
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

describe('W802 spawn-work-order integration', () => {
  it('state machine creates WO with facilityAssetId only (no assetId)', async () => {
    const MaintenanceWorkOrder = require('../models/MaintenanceWorkOrder');
    const {
      createWorkOrderStateMachine,
    } = require('../services/operations/workOrderStateMachine.service');
    const sm = createWorkOrderStateMachine({ workOrderModel: MaintenanceWorkOrder });
    const branchId = new mongoose.Types.ObjectId();

    const wo = await sm.createWorkOrder(
      {
        workOrderNumber: `WO-UNIT-${Date.now()}`,
        branchId,
        facilityAssetId: new mongoose.Types.ObjectId(),
        type: 'corrective',
        priority: 'high',
        title: 'Test WO',
        description: 'facility asset only',
        scheduledDate: new Date(),
      },
      { autoSubmit: true }
    );

    expect(wo.status).toBe('submitted');
    expect(wo.facilityAssetId).toBeTruthy();
    expect(wo.assetId).toBeFalsy();
  });
});

describe('W802 POST /facility-asset/:id/spawn-work-order', () => {
  it('creates a submitted WO linked by facilityAssetId and marks asset maintenance', async () => {
    const FacilityAsset = require('../models/FacilityAsset');
    const MaintenanceWorkOrder = require('../models/MaintenanceWorkOrder');

    const asset = await FacilityAsset.create({
      assetTag: `W802-${Date.now()}`,
      name: 'Passenger elevator B',
      category: 'elevator',
      branchId,
      criticality: 'high',
      nextMaintenanceDue: new Date(Date.now() - 86400000),
    });

    const res = await request(app)
      .post(`/api/v1/facility-asset/${asset._id}/spawn-work-order`)
      .send({ type: 'corrective', markInMaintenance: true });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.workOrder.facilityAssetId.toString()).toBe(asset._id.toString());
    expect(res.body.data.workOrder.status).toBe('submitted');
    expect(res.body.data.asset.status).toBe('maintenance');

    const persisted = await MaintenanceWorkOrder.findById(res.body.data.workOrder._id);
    expect(persisted.facilityAssetId.toString()).toBe(asset._id.toString());
    expect(persisted.assetId).toBeFalsy();
  });
});

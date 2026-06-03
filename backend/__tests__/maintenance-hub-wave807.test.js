'use strict';

/**
 * W807 — maintenance hub: snapshot + bulk spawn + facility-asset work-orders list.
 */

const fs = require('fs');
const path = require('path');

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const {
  createMaintenanceHubService,
  OPEN_WO_STATUSES,
} = require('../services/operations/maintenanceHub.service');

const ROOT = path.join(__dirname, '..');
const OPS_REG = fs.readFileSync(path.join(ROOT, 'routes', 'registries', 'ops.registry.js'), 'utf8');
const FA_ROUTES = fs.readFileSync(path.join(ROOT, 'routes', 'facility-asset.routes.js'), 'utf8');
const HUB_ROUTES = fs.readFileSync(
  path.join(ROOT, 'routes', 'operations', 'maintenanceHub.routes.js'),
  'utf8'
);
const HUB_BOOT = fs.readFileSync(path.join(ROOT, 'startup', 'maintenanceHubBootstrap.js'), 'utf8');
const APP_JS = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

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
let hubApp;
let faApp;
let branchId;
let userId;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w807-hub' } });
  await mongoose.connect(mongod.getUri());
  branchId = new mongoose.Types.ObjectId();
  userId = new mongoose.Types.ObjectId();

  require('../models/FacilityAsset');
  require('../models/MaintenanceWorkOrder');
  require('../models/operations/Facility.model');

  hubApp = express();
  hubApp.use(express.json());
  hubApp.use((req, _res, next) => {
    req.user = { id: userId, _id: userId, role: 'facility_manager', branchId };
    next();
  });
  hubApp.use('/api/v1/ops/maintenance-hub', require('../routes/operations/maintenanceHub.routes'));

  faApp = express();
  faApp.use(express.json());
  faApp.use((req, _res, next) => {
    req.user = { id: userId, _id: userId, role: 'facility_manager', branchId };
    next();
  });
  faApp.use('/api/v1/facility-asset', require('../routes/facility-asset.routes'));
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

describe('W807 maintenance hub static', () => {
  it('ops.registry mounts maintenance-hub paths', () => {
    expect(OPS_REG).toMatch(/\/api\/v1\/ops\/maintenance-hub/);
    expect(OPS_REG).toMatch(/maintenanceHub\.routes/);
  });

  it('hub routes expose snapshot and spawn-due-maintenance', () => {
    expect(HUB_ROUTES).toMatch(/\/snapshot/);
    expect(HUB_ROUTES).toMatch(/\/spawn-due-maintenance/);
  });

  it('facility-asset exposes GET /:id/work-orders', () => {
    expect(FA_ROUTES).toMatch(/\/:id\/work-orders/);
    expect(FA_ROUTES).toMatch(/populate\('facilityAssetId'/);
  });

  it('W808 PPM WO sweeper bootstrap is wired in app.js', () => {
    expect(HUB_BOOT).toMatch(/ENABLE_PPM_WO_SWEEPER/);
    expect(HUB_BOOT).toMatch(/spawnDueMaintenanceWorkOrders/);
    expect(APP_JS).toMatch(/maintenanceHubBootstrap/);
    expect(APP_JS).toMatch(/wireMaintenanceHubSweepers/);
  });
});

describe('W807 maintenanceHub.service', () => {
  it('getSnapshot aggregates WO and PPM counts', async () => {
    const FacilityAsset = require('../models/FacilityAsset');
    const MaintenanceWorkOrder = require('../models/MaintenanceWorkOrder');
    const {
      createWorkOrderStateMachine,
    } = require('../services/operations/workOrderStateMachine.service');
    const sm = createWorkOrderStateMachine({ workOrderModel: MaintenanceWorkOrder });

    const overdue = new Date(Date.now() - 86400000);
    const asset = await FacilityAsset.create({
      assetTag: 'HUB-1',
      name: 'Elevator hub test',
      category: 'elevator',
      branchId,
      criticality: 'high',
      nextMaintenanceDue: overdue,
    });

    await sm.createWorkOrder(
      {
        workOrderNumber: 'WO-HUB-OPEN',
        branchId,
        facilityAssetId: asset._id,
        type: 'corrective',
        priority: 'critical',
        title: 'Open WO',
        description: 'test',
        scheduledDate: overdue,
      },
      { autoSubmit: true }
    );

    const svc = createMaintenanceHubService({
      workOrderModel: MaintenanceWorkOrder,
      facilityAssetModel: FacilityAsset,
    });
    const snap = await svc.getSnapshot({});

    expect(snap.workOrders.open).toBeGreaterThanOrEqual(1);
    expect(snap.workOrders.overdue).toBeGreaterThanOrEqual(1);
    expect(snap.workOrders.criticalOpen).toBeGreaterThanOrEqual(1);
    expect(snap.facilityAssets.dueMaintenance).toBeGreaterThanOrEqual(1);
    expect(snap.previews.openWorkOrders.length).toBeGreaterThanOrEqual(1);
    expect(snap.previews.dueMaintenanceAssets.length).toBeGreaterThanOrEqual(1);
  });

  it('spawnDueMaintenanceWorkOrders skips assets with existing open WO', async () => {
    const FacilityAsset = require('../models/FacilityAsset');
    const MaintenanceWorkOrder = require('../models/MaintenanceWorkOrder');
    const {
      createWorkOrderStateMachine,
    } = require('../services/operations/workOrderStateMachine.service');
    const sm = createWorkOrderStateMachine({ workOrderModel: MaintenanceWorkOrder });

    const asset = await FacilityAsset.create({
      assetTag: 'HUB-2',
      name: 'Pump',
      category: 'other',
      branchId,
      criticality: 'medium',
      nextMaintenanceDue: new Date(Date.now() - 3600000),
    });

    await sm.createWorkOrder(
      {
        workOrderNumber: 'WO-HUB-EXISTING',
        branchId,
        facilityAssetId: asset._id,
        type: 'preventive',
        priority: 'normal',
        title: 'Already open',
        description: 'test',
        scheduledDate: new Date(),
      },
      { autoSubmit: true }
    );

    const svc = createMaintenanceHubService({
      workOrderModel: MaintenanceWorkOrder,
      facilityAssetModel: FacilityAsset,
      workOrderStateMachine: sm,
    });

    const result = await svc.spawnDueMaintenanceWorkOrders({ limit: 10 });
    expect(result.created).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toBe('open_wo_exists');
    expect(OPEN_WO_STATUSES).toContain('submitted');
  });
});

describe('W807 maintenance hub HTTP', () => {
  it('GET /snapshot returns success payload', async () => {
    const res = await request(hubApp).get('/api/v1/ops/maintenance-hub/snapshot');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.workOrders).toBeDefined();
    expect(res.body.data.facilityAssets).toBeDefined();
  });

  it('POST /spawn-due-maintenance creates WOs for due assets', async () => {
    const FacilityAsset = require('../models/FacilityAsset');
    await FacilityAsset.create({
      assetTag: 'HUB-3',
      name: 'Generator',
      category: 'generator',
      branchId,
      criticality: 'life_safety',
      status: 'in_service',
      nextMaintenanceDue: new Date(Date.now() - 7200000),
    });

    const res = await request(hubApp)
      .post('/api/v1/ops/maintenance-hub/spawn-due-maintenance')
      .send({ limit: 5 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.created.length).toBe(1);
    expect(res.body.data.created[0].workOrderNumber).toMatch(/^WO-PPM-/);
  });

  it('GET /facility-asset/:id/work-orders lists linked orders', async () => {
    const FacilityAsset = require('../models/FacilityAsset');
    const MaintenanceWorkOrder = require('../models/MaintenanceWorkOrder');
    const {
      createWorkOrderStateMachine,
    } = require('../services/operations/workOrderStateMachine.service');
    const sm = createWorkOrderStateMachine({ workOrderModel: MaintenanceWorkOrder });

    const asset = await FacilityAsset.create({
      assetTag: 'HUB-4',
      name: 'Ramp',
      category: 'ramp',
      branchId,
      criticality: 'low',
    });

    await sm.createWorkOrder(
      {
        workOrderNumber: 'WO-HUB-LIST',
        branchId,
        facilityAssetId: asset._id,
        type: 'inspection',
        priority: 'low',
        title: 'Inspect ramp',
        description: 'test',
        scheduledDate: new Date(),
      },
      { autoSubmit: true }
    );

    const res = await request(faApp).get(`/api/v1/facility-asset/${asset._id}/work-orders`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].workOrderNumber).toBe('WO-HUB-LIST');
  });
});

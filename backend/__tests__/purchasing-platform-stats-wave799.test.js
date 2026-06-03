'use strict';

/**
 * purchasing-platform-stats-wave799.test.js — W799 cross-tier read-only PO stats.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

const adapter = require('../services/purchasingAdapter.service');

jest.mock('../middleware/auth', () => ({
  authorize: () => (_req, _res, next) => next(),
}));
jest.mock('../middleware/branchScope.middleware', () => ({
  branchFilter: () => ({}),
}));

let mongod;
let app;
let actorId;
let branchId;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w799-platform-stats' } });
  await mongoose.connect(mongod.getUri());
  require('../models/inventory/PurchaseOrder');
  require('../models/InventoryStock');
  require('../models/Warehouse');
  require('../models/inventory/PurchaseReceipt');

  actorId = new mongoose.Types.ObjectId();
  branchId = new mongoose.Types.ObjectId();
  app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id: actorId, _id: actorId, role: 'procurement_manager' };
    next();
  });
  app.use('/api/v1/purchasing', require('../routes/purchasing.routes'));
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  const ModulePo = require('../models/inventory/PurchaseOrder');
  const { PurchaseOrder: StockPo } = require('../models/InventoryStock');
  const Receipt = require('../models/inventory/PurchaseReceipt');
  await ModulePo.deleteMany({});
  await StockPo.deleteMany({});
  await Receipt.deleteMany({});
});

describe('W799 behavioral — getPlatformStats', () => {
  it('returns separate counts per ADR-039 tier', async () => {
    const ModulePo = require('../models/inventory/PurchaseOrder');
    const { PurchaseOrder: StockPo, Supplier } = require('../models/InventoryStock');
    const Warehouse = require('../models/Warehouse');

    await ModulePo.create({
      supplier_name: 'Legacy Vendor',
      status: 'partial',
      branch_id: branchId,
      items: [{ item_name_ar: 'A', quantity_ordered: 10, quantity_received: 3, unit_cost: 1 }],
      created_by: actorId,
    });
    await ModulePo.create({
      supplier_name: 'Legacy Vendor',
      status: 'received',
      branch_id: branchId,
      items: [{ item_name_ar: 'B', quantity_ordered: 5, quantity_received: 5, unit_cost: 2 }],
      created_by: actorId,
    });

    const supplier = await Supplier.create({
      nameAr: 'مورد',
      code: 'SUP-1',
      contactPerson: 'أحمد',
      phone: '0500000000',
      email: 'supplier@example.com',
    });
    const warehouse = await Warehouse.create({
      nameAr: 'مستودع',
      code: 'WH-1',
      branchId,
    });
    await StockPo.create({
      poNumber: 'PO-STOCK-1',
      supplierId: supplier._id,
      branchId,
      warehouseId: warehouse._id,
      requestedBy: actorId,
      orderDate: new Date(),
      status: 'partially_received',
      items: [],
    });

    const stats = await adapter.getPlatformStats({ branchId: String(branchId) });

    expect(stats.adr).toBe('039');
    expect(stats.tiers.legacyPurchasing.totalOrders).toBe(2);
    expect(stats.tiers.legacyPurchasing.partialOrders).toBe(1);
    expect(stats.tiers.legacyPurchasing.receivedOrders).toBe(1);
    expect(stats.tiers.inventoryStock.modelAvailable).toBe(true);
    expect(stats.tiers.inventoryStock.totalOrders).toBe(1);
    expect(stats.tiers.inventoryStock.partiallyReceivedOrders).toBe(1);
  });
});

describe('W799 HTTP — GET /platform-stats', () => {
  it('exposes federation payload', async () => {
    const ModulePo = require('../models/inventory/PurchaseOrder');
    await ModulePo.create({
      supplier_name: 'X',
      status: 'approved',
      created_by: actorId,
    });

    const res = await request(app).get('/api/v1/purchasing/platform-stats');
    expect(res.status).toBe(200);
    expect(res.body.data.tiers.legacyPurchasing.totalOrders).toBe(1);
    expect(res.body.data.tiers.inventoryStock).toBeDefined();
  });
});

describe('W799 drift — platform-stats wiring', () => {
  it('adapter and routes export getPlatformStats', () => {
    const routes = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'purchasing.routes.js'),
      'utf8'
    );
    const svc = fs.readFileSync(
      path.join(__dirname, '..', 'services', 'purchasingAdapter.service.js'),
      'utf8'
    );
    expect(svc).toMatch(/W799/);
    expect(svc).toMatch(/getPlatformStats/);
    expect(routes).toMatch(/\/platform-stats/);
    expect(routes).toMatch(/getPlatformStats/);
  });
});

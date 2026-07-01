'use strict';

/**
 * inventory-branch-isolation-wave1570.test.js — W1570
 *
 * Closes cross-branch IDOR + asset mass-assignment in the inventory module.
 * `requireBranchAccess` does NOT auto-filter queries or `:id` lookups, so each
 * handler must self-scope. Pre-W1570 these leaked across branches:
 *   inventory-module:   GET /transactions, GET /stats  (snake-case branch_id)
 *   inventory-enhanced: GET /warehouses(+/:id), /purchase-orders(+/:poId),
 *                       /assets(+/:assetId, depreciation, maintenance),
 *                       /stock-counts ; POST/PUT /assets mass-assignment.
 *
 * Static (source) guards + behavioral (MongoMemoryServer) cross-branch denial.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

// ─────────────────────────── STATIC SOURCE GUARDS ───────────────────────────
describe('W1570 inventory branch-isolation — static source guards', () => {
  const read = f => fs.readFileSync(path.join(__dirname, '..', 'routes', f), 'utf8');
  const mod = read('inventory-module.routes.js');
  const enh = read('inventory-enhanced.routes.js');

  test('inventory-module /transactions + /stats apply branchScope and gate query branch_id', () => {
    expect(mod).toMatch(/const filter = \{ deleted_at: null, \.\.\.scope \}/);
    expect(mod).toMatch(/const baseFilter = \{ deleted_at: null, \.\.\.scope \}/);
    expect(mod).toMatch(/if \(branch_id && !scope\.branch_id\)/);
    // no raw unscoped query branch_id passthrough remains
    expect(mod).not.toMatch(/\.\.\.\(branch_id \? \{ branch_id \} : \{\}\)/);
  });

  test('inventory-enhanced imports branchFilter and scopes leak-prone reads', () => {
    expect(enh).toMatch(/requireBranchAccess, branchFilter/);
    expect(enh).toMatch(/Warehouse\.find\(\{ isActive: true, \.\.\.branchFilter\(req\) \}\)/);
    expect(enh).toMatch(/Warehouse\.findOne\(\{[\s\S]*?\.\.\.branchFilter\(req\)/);
    expect(enh).toMatch(/PurchaseOrder\.findOne\(\{ _id: req\.params\.poId, \.\.\.branchFilter\(req\) \}\)/);
    expect(enh).toMatch(/Asset\.findOne\(\{[\s\S]*?\.\.\.branchFilter\(req\)/);
    // bare findById on branch-scoped resources is gone
    expect(enh).not.toMatch(/Warehouse\.findById\(/);
    expect(enh).not.toMatch(/PurchaseOrder\.findById\(/);
    expect(enh).not.toMatch(/Asset\.findById\(/);
  });

  test('inventory-enhanced asset create/update strip privileged + lifecycle fields', () => {
    expect(enh).not.toMatch(/Asset\.create\(stripUpdateMeta\(req\.body\)\)/);
    expect(enh).not.toMatch(/Asset\.findByIdAndUpdate\(req\.params\.assetId, stripUpdateMeta/);
    expect(enh).toMatch(/Asset\.findOneAndUpdate\(\s*\{ _id: req\.params\.assetId, \.\.\.branchFilter\(req\) \}/);
    expect(enh).toMatch(/disposalValue/); // lifecycle field stripped
    expect(enh).toMatch(/runValidators: true/);
  });

  test('inventory-enhanced stock-counts scoped through owning warehouse', () => {
    expect(enh).not.toMatch(/StockCount\.find\(\)\s*\n/);
    expect(enh).toMatch(/warehouseId: \{ \$in: whIds \}/);
  });
});

// ─────────────────────────── BEHAVIORAL (MMS) ───────────────────────────────
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
const WH_A = new mongoose.Types.ObjectId();
const WH_B = new mongoose.Types.ObjectId();
const PO_B = new mongoose.Types.ObjectId();
const ASSET_B = new mongoose.Types.ObjectId();

const managerA = {
  _id: USER_A,
  id: String(USER_A),
  role: 'inventory_manager', // NOT in CROSS_BRANCH_ROLES → restricted to BRANCH_A
  branchId: String(BRANCH_A),
};
const adminAll = {
  _id: new mongoose.Types.ObjectId(),
  id: String(new mongoose.Types.ObjectId()),
  role: 'super_admin', // CROSS_BRANCH_ROLES → allBranches
};

let mongod;
let app;
let InvTxn;
let PO;
let Asset;
let Warehouse;
let StockCount;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1570-inv' } });
  await mongoose.connect(mongod.getUri());
  try {
    require('../config/mongoose.plugins');
  } catch (_e) {
    /* optional */
  }

  // Register populate-target stubs (avoid MissingSchema on populate()).
  if (!mongoose.models.Branch) mongoose.model('Branch', new mongoose.Schema({ name: String }));
  if (!mongoose.models.User) mongoose.model('User', new mongoose.Schema({ name: String }));
  if (!mongoose.models.Employee) mongoose.model('Employee', new mongoose.Schema({ name: String }));

  InvTxn = require('../models/inventory/InventoryTransaction');
  require('../models/inventory/InventoryItem'); // item_id populate target
  const stock = require('../models/InventoryStock');
  PO = stock.PurchaseOrder;
  Asset = stock.Asset;
  StockCount = stock.StockCount;
  Warehouse = require('../models/Warehouse');

  const a = express();
  a.use(express.json());
  a.use('/api/v1/inventory-module', require('../routes/inventory-module.routes'));
  a.use('/api/v1/inventory-enhanced', require('../routes/inventory-enhanced.routes'));
  app = a;

  // Seed cross-branch data via raw inserts (bypass model validation).
  await InvTxn.collection.insertMany([
    { transaction_number: 'TXN-A', branch_id: BRANCH_A, transaction_type: 'in', deleted_at: null, transaction_date: new Date() },
    { transaction_number: 'TXN-B', branch_id: BRANCH_B, transaction_type: 'in', deleted_at: null, transaction_date: new Date() },
  ]);
  await PO.collection.insertMany([
    { poNumber: 'PO-A', branchId: BRANCH_A, status: 'pending_approval' },
    { _id: PO_B, poNumber: 'PO-B', branchId: BRANCH_B, status: 'pending_approval' },
  ]);
  await Asset.collection.insertMany([
    { assetNumber: 'AST-A', branchId: BRANCH_A, name: 'asset-A' },
    { _id: ASSET_B, assetNumber: 'AST-B', branchId: BRANCH_B, name: 'asset-B' },
  ]);
  await Warehouse.collection.insertMany([
    { _id: WH_A, code: 'WH-A', branchId: BRANCH_A, isActive: true, name: 'WA' },
    { _id: WH_B, code: 'WH-B', branchId: BRANCH_B, isActive: true, name: 'WB' },
  ]);
  await StockCount.collection.insertMany([
    { countNumber: 'SC-A', warehouseId: WH_A },
    { countNumber: 'SC-B', warehouseId: WH_B },
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

beforeEach(() => {
  mockAuthState.user = managerA;
});

const listOf = body => body.data || body.transactions || body.items || body;

describe('W1570 inventory branch-isolation — behavioral cross-branch denial', () => {
  test('GET /inventory-module/transactions → only own branch', async () => {
    const r = await request(app).get('/api/v1/inventory-module/transactions');
    expect(r.status).toBe(200);
    const list = listOf(r.body);
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(1);
    expect(String(list[0].branch_id)).toBe(String(BRANCH_A));
  });

  test('GET /inventory-module/transactions?branch_id=<foreign> → foreign ignored', async () => {
    const r = await request(app)
      .get('/api/v1/inventory-module/transactions')
      .query({ branch_id: String(BRANCH_B) });
    expect(r.status).toBe(200);
    const list = listOf(r.body);
    expect(list.every(t => String(t.branch_id) === String(BRANCH_A))).toBe(true);
  });

  test('GET /inventory-enhanced/purchase-orders → only own branch; foreign :poId → 404', async () => {
    const list = await request(app).get('/api/v1/inventory-enhanced/purchase-orders');
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBe(1);
    expect(list.body.data[0].poNumber).toBe('PO-A');
    const one = await request(app).get(`/api/v1/inventory-enhanced/purchase-orders/${PO_B}`);
    expect(one.status).toBe(404);
  });

  test('GET /inventory-enhanced/assets → only own branch; foreign :assetId → 404', async () => {
    const list = await request(app).get('/api/v1/inventory-enhanced/assets');
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBe(1);
    expect(list.body.data[0].assetNumber).toBe('AST-A');
    const one = await request(app).get(`/api/v1/inventory-enhanced/assets/${ASSET_B}`);
    expect(one.status).toBe(404);
  });

  test('GET /inventory-enhanced/warehouses → only own branch; foreign :id → 404', async () => {
    const list = await request(app).get('/api/v1/inventory-enhanced/warehouses');
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBe(1);
    const one = await request(app).get(`/api/v1/inventory-enhanced/warehouses/${WH_B}`);
    expect(one.status).toBe(404);
  });

  test('GET /inventory-enhanced/stock-counts → only own-branch warehouses', async () => {
    const r = await request(app).get('/api/v1/inventory-enhanced/stock-counts');
    expect(r.status).toBe(200);
    expect(r.body.data.length).toBe(1);
    const whId = r.body.data[0].warehouseId?._id || r.body.data[0].warehouseId;
    expect(String(whId)).toBe(String(WH_A));
  });

  test('cross-branch role (super_admin) sees all branches', async () => {
    mockAuthState.user = adminAll;
    const r = await request(app).get('/api/v1/inventory-enhanced/assets');
    expect(r.status).toBe(200);
    expect(r.body.data.length).toBe(2);
  });
});

'use strict';

/**
 * purchasing-routes-stock-wave792.test.js — W792 HTTP receive bumps InventoryModuleItem stock.
 * Extends W786 (adapter) + W791 (routes flow) through PATCH /orders/:id/receive.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../middleware/auth', () => ({
  authorize: () => (_req, _res, next) => next(),
}));

jest.mock('../middleware/branchScope.middleware', () => ({
  branchFilter: () => ({}),
}));

let mongod;
let app;
let actorId;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w792-purchasing-stock-routes' } });
  await mongoose.connect(mongod.getUri());
  require('../models/inventory/PurchaseOrder');
  require('../models/inventory/PurchaseReceipt');
  require('../models/inventory/InventoryItem');
  require('../models/inventory/InventoryTransaction');
  require('../models/operations/PurchaseRequest.model');

  actorId = new mongoose.Types.ObjectId();
  app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = {
      id: actorId,
      _id: actorId,
      roles: ['admin', 'department_head', 'procurement_manager'],
    };
    next();
  });
  app.use('/api/v1/purchasing', require('../routes/purchasing.routes'));
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ success: false, message: err.message, code: err.code });
  });
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  const Po = require('../models/inventory/PurchaseOrder');
  const Receipt = require('../models/inventory/PurchaseReceipt');
  const PR = require('../models/operations/PurchaseRequest.model');
  const Item = require('../models/inventory/InventoryItem');
  const Txn = require('../models/inventory/InventoryTransaction');
  await Po.deleteMany({});
  await Receipt.deleteMany({});
  await PR.deleteMany({});
  await Item.deleteMany({});
  await Txn.deleteMany({});
});

describe('W792 behavioral — HTTP receive updates inventory stock', () => {
  it('POST order → approve → PATCH receive increments quantity_on_hand + receipt txn', async () => {
    const Item = require('../models/inventory/InventoryItem');
    const inv = await Item.create({
      name_ar: 'معقم',
      category: 'medical_supplies',
      quantity_on_hand: 10,
      quantity_available: 10,
      created_by: actorId,
    });

    const createRes = await request(app)
      .post('/api/v1/purchasing/orders')
      .send({
        vendor: 'مورد',
        items: [{ itemId: inv._id, itemName: 'معقم', quantity: 5, unitCost: 3 }],
      })
      .expect(201);
    const orderId = createRes.body.data._id;

    await request(app).patch(`/api/v1/purchasing/orders/${orderId}/approve`).expect(200);
    await request(app).patch(`/api/v1/purchasing/orders/${orderId}/receive`).expect(200);

    const updated = await Item.findById(inv._id);
    expect(updated.quantity_on_hand).toBe(15);
    expect(updated.quantity_available).toBe(15);

    const Txn = require('../models/inventory/InventoryTransaction');
    const txns = await Txn.find({ item_id: inv._id, transaction_type: 'receipt' });
    expect(txns).toHaveLength(1);
    expect(txns[0].quantity).toBe(5);
    expect(String(txns[0].reference_id)).toBe(String(orderId));
  });

  it('PR convert-to-po → receive path also bumps stock when item_id present', async () => {
    const Item = require('../models/inventory/InventoryItem');
    const inv = await Item.create({
      name_ar: 'قفازات',
      category: 'medical_supplies',
      quantity_on_hand: 8,
      quantity_available: 8,
      created_by: actorId,
    });

    const prRes = await request(app)
      .post('/api/v1/purchasing/requests')
      .send({
        requiredDate: new Date(Date.now() + 86400000).toISOString(),
        items: [{ itemId: inv._id, product: 'قفازات', quantity: 4, estimatedPrice: 2 }],
      })
      .expect(201);
    const prId = prRes.body.data._id;

    await request(app).post(`/api/v1/purchasing/requests/${prId}/submit`).expect(200);
    await request(app)
      .post(`/api/v1/purchasing/requests/${prId}/approve`)
      .send({ role: 'department_head' })
      .expect(200);

    const convertRes = await request(app)
      .post(`/api/v1/purchasing/requests/${prId}/convert-to-po`)
      .expect(201);
    const orderId = convertRes.body.data.order._id;

    await request(app).patch(`/api/v1/purchasing/orders/${orderId}/approve`).expect(200);
    await request(app).patch(`/api/v1/purchasing/orders/${orderId}/receive`).expect(200);

    const updated = await Item.findById(inv._id);
    expect(updated.quantity_on_hand).toBe(12);

    const Txn = require('../models/inventory/InventoryTransaction');
    const txns = await Txn.find({ item_id: inv._id, transaction_type: 'receipt' });
    expect(txns).toHaveLength(1);
    expect(txns[0].quantity).toBe(4);
  });
});

describe('W792 drift — route receive delegates to W786 stock lib', () => {
  it('purchasing routes PATCH /orders/:id/receive uses adapter.receiveOrder', () => {
    const routes = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'purchasing.routes.js'),
      'utf8'
    );
    expect(routes).toMatch(/adapter\.receiveOrder/);
    expect(routes).toMatch(/\/orders\/:id\/receive/);
  });
});

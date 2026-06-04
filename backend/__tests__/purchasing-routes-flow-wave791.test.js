'use strict';

/**
 * purchasing-routes-flow-wave791.test.js — W791 HTTP flow PR→PO→receive with lineItems.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../middleware/auth', () => ({
  authorize: () => (_req, _res, next) => next(),
}));

jest.mock('../middleware/branchScope.middleware', () => ({
  branchFilter: () => ({}),
  requireBranchAccess: (req, _res, next) => {
    req.branchScope = { restricted: false, branchId: null, allBranches: true };
    next();
  },
}));

let mongod;
let app;
let actorId;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w791-purchasing-routes' } });
  await mongoose.connect(mongod.getUri());
  require('../models/inventory/PurchaseOrder');
  require('../models/inventory/PurchaseReceipt');
  require('../models/inventory/InventoryItem');
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
  await Po.deleteMany({});
  await Receipt.deleteMany({});
  await PR.deleteMany({});
  await Item.deleteMany({});
});

describe('W791 behavioral — purchasing routes PR→PO→receive', () => {
  it('convert-to-po then approve/receive returns lineItems on order and GRN', async () => {
    const Item = require('../models/inventory/InventoryItem');
    const inv = await Item.create({
      name_ar: 'قفازات',
      category: 'medical_supplies',
      quantity_on_hand: 2,
      created_by: actorId,
    });

    const prRes = await request(app)
      .post('/api/v1/purchasing/requests')
      .send({
        requiredDate: new Date(Date.now() + 86400000).toISOString(),
        items: [{ itemId: inv._id, product: 'قفازات', quantity: 3, estimatedPrice: 5 }],
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
    expect(convertRes.body.data.order.lineItems).toHaveLength(1);
    expect(String(convertRes.body.data.order.lineItems[0].itemId)).toBe(String(inv._id));

    await request(app).patch(`/api/v1/purchasing/orders/${orderId}/approve`).expect(200);
    const receiveRes = await request(app)
      .patch(`/api/v1/purchasing/orders/${orderId}/receive`)
      .expect(200);
    expect(receiveRes.body.data.lineItems).toHaveLength(1);
    expect(receiveRes.body.data.itemsSummary).toMatch(/قفازات/);

    const grnRes = await request(app)
      .get(`/api/v1/purchasing/orders/${orderId}/receipts`)
      .expect(200);
    expect(grnRes.body.data).toHaveLength(1);
    expect(grnRes.body.data[0].lineItems).toHaveLength(1);
    expect(grnRes.body.data[0].itemsSummary).toMatch(/قفازات/);

    const orderRes = await request(app).get(`/api/v1/purchasing/orders/${orderId}`).expect(200);
    expect(orderRes.body.data.linkedItemCount).toBe(1);
  });
});

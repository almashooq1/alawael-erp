'use strict';

/**
 * purchasing-partial-receive-wave795.test.js — W795 partial PO receive via body.items.
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

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w795-partial-receive' } });
  await mongoose.connect(mongod.getUri());
  require('../models/inventory/PurchaseReceipt');
  require('../models/inventory/PurchaseOrder');
  require('../models/inventory/InventoryItem');

  actorId = new mongoose.Types.ObjectId();
  app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id: actorId, _id: actorId, role: 'procurement_manager' };
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
  const Receipt = require('../models/inventory/PurchaseReceipt');
  const Po = require('../models/inventory/PurchaseOrder');
  const Item = require('../models/inventory/InventoryItem');
  await Receipt.deleteMany({});
  await Po.deleteMany({});
  await Item.deleteMany({});
});

describe('W795 behavioral — partial receiveOrder', () => {
  it('partial body.items sets PO partial and creates GRN', async () => {
    const order = await adapter.createOrder(
      {
        vendor: 'مورد جزئي',
        items: [
          { itemName: 'قلم', quantity: 10, unitCost: 2 },
          { itemName: 'دفتر', quantity: 4, unitCost: 5 },
        ],
      },
      actorId
    );
    await adapter.approveOrder(order._id, actorId);

    const result = await adapter.receiveOrder(order._id, actorId, {
      items: [
        { itemName: 'قلم', quantityReceived: 10 },
        { itemName: 'دفتر', quantityReceived: 2 },
      ],
    });
    expect(result.status).toBe('partial');
    expect(result.lineItems[0].quantityReceived).toBe(10);
    expect(result.lineItems[1].quantityReceived).toBe(2);

    const Receipt = require('../models/inventory/PurchaseReceipt');
    const grns = await Receipt.find({ purchase_order_id: order._id, deleted_at: null });
    expect(grns).toHaveLength(1);

    const completed = await adapter.receiveOrder(order._id, actorId, {
      items: [{ itemName: 'دفتر', quantityReceived: 2 }],
    });
    expect(completed.status).toBe('received');
    const grnsAfter = await Receipt.find({ purchase_order_id: order._id, deleted_at: null });
    expect(grnsAfter).toHaveLength(2);
  });

  it('partial receive bumps stock only for received delta', async () => {
    const Item = require('../models/inventory/InventoryItem');
    const inv = await Item.create({
      name_ar: 'قفازات',
      category: 'medical_supplies',
      quantity_on_hand: 1,
      created_by: actorId,
    });

    const order = await adapter.createOrder(
      {
        vendor: 'مخزون',
        items: [{ itemId: inv._id, itemName: 'قفازات', quantity: 10, unitCost: 3 }],
      },
      actorId
    );
    await adapter.approveOrder(order._id, actorId);

    await adapter.receiveOrder(order._id, actorId, {
      items: [{ itemId: inv._id, quantityReceived: 4 }],
    });

    const after = await Item.findById(inv._id);
    expect(after.quantity_on_hand).toBe(5);

    await adapter.receiveOrder(order._id, actorId, {
      items: [{ itemId: inv._id, quantityReceived: 6 }],
    });
    const final = await Item.findById(inv._id);
    expect(final.quantity_on_hand).toBe(11);
  });

  it('rejects over_receive with 400', async () => {
    const order = await adapter.createOrder(
      { vendor: 'X', items: [{ itemName: 'حبر', quantity: 5 }] },
      actorId
    );
    await adapter.approveOrder(order._id, actorId);

    await expect(
      adapter.receiveOrder(order._id, actorId, {
        items: [{ itemName: 'حبر', quantityReceived: 99 }],
      })
    ).rejects.toMatchObject({ status: 400, message: 'over_receive' });
  });
});

describe('W795 HTTP — PATCH /orders/:id/receive partial body', () => {
  it('accepts items array and returns partial status', async () => {
    const order = await adapter.createOrder(
      {
        vendor: 'HTTP',
        items: [
          { itemName: 'A', quantity: 8 },
          { itemName: 'B', quantity: 2 },
        ],
      },
      actorId
    );
    await adapter.approveOrder(order._id, actorId);

    const res = await request(app)
      .patch(`/api/v1/purchasing/orders/${order._id}/receive`)
      .send({ items: [{ itemName: 'A', quantityReceived: 3 }] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('partial');
    expect(res.body.data.lineItems[0].quantityReceived).toBe(3);
  });
});

describe('W795 drift — adapter partial receive helpers', () => {
  it('documents buildPartialReceiptLines in adapter source', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'services', 'purchasingAdapter.service.js'),
      'utf8'
    );
    expect(src).toMatch(/W795/);
    expect(src).toMatch(/buildPartialReceiptLines/);
    expect(src).toMatch(/over_receive/);
  });
});

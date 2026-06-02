'use strict';

/**
 * purchasing-po-receipt-bridge-wave784.test.js — W784 PO receive ↔ GRN sync.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

const adapter = require('../services/purchasingAdapter.service');

let mongod;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w784-purchasing' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../models/inventory/PurchaseReceipt');
  require('../models/inventory/PurchaseOrder');
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  const Receipt = require('../models/inventory/PurchaseReceipt');
  const Po = require('../models/inventory/PurchaseOrder');
  await Receipt.deleteMany({});
  await Po.deleteMany({});
});

describe('W784 behavioral — PO receive creates linked GRN', () => {
  it('receiveOrder auto-creates one PurchaseReceipt and is idempotent', async () => {
    const actorId = new mongoose.Types.ObjectId();
    const order = await adapter.createOrder(
      {
        vendor: 'مورد الربط',
        items: [{ itemName: 'حبر', quantity: 5, unitCost: 10 }],
      },
      actorId
    );
    await adapter.approveOrder(order._id, actorId);

    const received = await adapter.receiveOrder(order._id, actorId);
    expect(received.status).toBe('received');

    const Receipt = require('../models/inventory/PurchaseReceipt');
    const grns = await Receipt.find({ purchase_order_id: order._id, deleted_at: null });
    expect(grns).toHaveLength(1);
    expect(grns[0].items[0].quantity_received).toBe(5);

    const Po = require('../models/inventory/PurchaseOrder');
    const poDoc = await Po.findById(order._id);
    expect(poDoc.status).toBe('received');
    expect(poDoc.items[0].quantity_received).toBe(5);

    const again = await adapter.receiveOrder(order._id, actorId);
    expect(again.status).toBe('received');
    const grnsAfter = await Receipt.find({ purchase_order_id: order._id, deleted_at: null });
    expect(grnsAfter).toHaveLength(1);
  });
});

describe('W784 behavioral — manual GRN updates PO lines', () => {
  it('createReceipt with purchaseOrderId sets partial then received', async () => {
    const actorId = new mongoose.Types.ObjectId();
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

    await adapter.createReceipt(
      {
        purchaseOrderId: order._id,
        vendor: 'مورد جزئي',
        items: [
          { itemName: 'قلم', quantity_ordered: 10, quantity_received: 10, unitCost: 2 },
          { itemName: 'دفتر', quantity_ordered: 4, quantity_received: 2, unitCost: 5 },
        ],
      },
      actorId
    );

    const Po = require('../models/inventory/PurchaseOrder');
    const partial = await Po.findById(order._id);
    expect(partial.status).toBe('partial');
    expect(partial.items[0].quantity_received).toBe(10);
    expect(partial.items[1].quantity_received).toBe(2);

    await adapter.createReceipt(
      {
        purchaseOrderId: order._id,
        vendor: 'مورد جزئي',
        items: [{ itemName: 'دفتر', quantity_ordered: 4, quantity_received: 2, unitCost: 5 }],
      },
      actorId
    );

    const full = await Po.findById(order._id);
    expect(full.status).toBe('received');
    expect(full.items[1].quantity_received).toBe(4);
  });
});

describe('W784 drift — adapter documents PO↔GRN bridge', () => {
  it('receiveOrder creates PurchaseReceipt when none exists', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'services', 'purchasingAdapter.service.js'),
      'utf8'
    );
    expect(src).toMatch(/W784/);
    expect(src).toMatch(/applyReceiptLinesToPo/);
    expect(src).toMatch(/existingGrn/);
    expect(src).toMatch(/Receipt\.create\(/);
  });
});

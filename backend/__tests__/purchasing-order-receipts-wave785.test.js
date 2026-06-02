'use strict';

/**
 * purchasing-order-receipts-wave785.test.js — W785 PO-linked GRN listing + stats.
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
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w785-purchasing' } });
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

describe('W785 behavioral — receipts by purchase order', () => {
  it('listReceiptsForOrder returns GRNs after receiveOrder', async () => {
    const actorId = new mongoose.Types.ObjectId();
    const order = await adapter.createOrder(
      { vendor: 'مورد', items: [{ itemName: 'صنف', quantity: 3, unitCost: 1 }] },
      actorId
    );
    await adapter.approveOrder(order._id, actorId);
    await adapter.receiveOrder(order._id, actorId);

    const linked = await adapter.listReceiptsForOrder(order._id);
    expect(linked).toHaveLength(1);
    expect(String(linked[0].purchaseOrderId)).toBe(String(order._id));

    const stats = await adapter.getStats();
    expect(stats.totalReceipts).toBe(1);
  });
});

describe('W785 drift — route and adapter surface', () => {
  it('registers GET /orders/:id/receipts before /orders/:id', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'purchasing.routes.js'),
      'utf8'
    );
    const receiptsIdx = src.indexOf("'/orders/:id/receipts'");
    const orderIdx = src.indexOf("'/orders/:id',");
    expect(receiptsIdx).toBeGreaterThan(-1);
    expect(orderIdx).toBeGreaterThan(receiptsIdx);
    expect(src).toMatch(/listReceiptsForOrder/);
  });
});

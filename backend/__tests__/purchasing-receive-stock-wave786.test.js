'use strict';

/**
 * purchasing-receive-stock-wave786.test.js — W786 PO receive bumps InventoryModuleItem stock.
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
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w786-purchasing-stock' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../models/inventory/InventoryItem');
  require('../models/inventory/InventoryTransaction');
  require('../models/inventory/PurchaseReceipt');
  require('../models/inventory/PurchaseOrder');
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  const Item = require('../models/inventory/InventoryItem');
  const Txn = require('../models/inventory/InventoryTransaction');
  const Receipt = require('../models/inventory/PurchaseReceipt');
  const Po = require('../models/inventory/PurchaseOrder');
  await Item.deleteMany({});
  await Txn.deleteMany({});
  await Receipt.deleteMany({});
  await Po.deleteMany({});
});

describe('W786 behavioral — receiveOrder updates stock', () => {
  it('increments quantity_on_hand and writes receipt transaction', async () => {
    const actorId = new mongoose.Types.ObjectId();
    const Item = require('../models/inventory/InventoryItem');
    const inv = await Item.create({
      name_ar: 'قفازات',
      category: 'medical_supplies',
      quantity_on_hand: 10,
      quantity_available: 10,
      created_by: actorId,
    });

    const order = await adapter.createOrder(
      {
        vendor: 'مورد طبي',
        items: [{ itemId: inv._id, itemName: 'قفازات', quantity: 5, unitCost: 2 }],
      },
      actorId
    );
    await adapter.approveOrder(order._id, actorId);
    await adapter.receiveOrder(order._id, actorId);

    const updated = await Item.findById(inv._id);
    expect(updated.quantity_on_hand).toBe(15);
    expect(updated.quantity_available).toBe(15);

    const Txn = require('../models/inventory/InventoryTransaction');
    const txns = await Txn.find({ item_id: inv._id, transaction_type: 'receipt' });
    expect(txns).toHaveLength(1);
    expect(txns[0].quantity).toBe(5);
    expect(String(txns[0].reference_id)).toBe(String(order._id));
  });
});

describe('W786 drift — stock lib wired in adapter', () => {
  it('receiveOrder imports purchasingStockReceive.lib', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'services', 'purchasingAdapter.service.js'),
      'utf8'
    );
    expect(src).toMatch(/W786/);
    expect(src).toMatch(/purchasingStockReceive\.lib/);
    expect(src).toMatch(/applyStockReceiptForPoLines/);
  });
});

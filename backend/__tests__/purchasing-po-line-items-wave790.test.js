'use strict';

/**
 * purchasing-po-line-items-wave790.test.js — W790 lineItems + itemsSummary on PO/GRN/PR payloads.
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
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w790-purchasing-lines' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../models/inventory/PurchaseOrder');
  require('../models/inventory/PurchaseReceipt');
  require('../models/inventory/InventoryItem');
  require('../models/operations/PurchaseRequest.model');
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  const Po = require('../models/inventory/PurchaseOrder');
  const Receipt = require('../models/inventory/PurchaseReceipt');
  const PR = require('../models/operations/PurchaseRequest.model');
  await Po.deleteMany({});
  await Receipt.deleteMany({});
  await PR.deleteMany({});
});

describe('W790 behavioral — PO lineItems + itemsSummary', () => {
  it('createOrder exposes lineItems, itemsSummary, linkedItemCount', async () => {
    const Item = require('../models/inventory/InventoryItem');
    const actorId = new mongoose.Types.ObjectId();
    const inv = await Item.create({
      name_ar: 'قفازات طبية',
      category: 'medical_supplies',
      quantity_on_hand: 5,
      created_by: actorId,
    });

    const order = await adapter.createOrder(
      {
        vendor: 'مورد',
        items: [{ itemId: inv._id, itemName: 'قفازات طبية', quantity: 4, unitCost: 12 }],
      },
      actorId
    );

    expect(order.items).toBe(1);
    expect(order.itemsCount).toBe(1);
    expect(order.lineItems).toHaveLength(1);
    expect(String(order.lineItems[0].itemId)).toBe(String(inv._id));
    expect(order.itemsSummary).toMatch(/قفازات طبية/);
    expect(order.linkedItemCount).toBe(1);
  });

  it('receiveOrder GRN includes lineItems + itemsSummary', async () => {
    const actorId = new mongoose.Types.ObjectId();
    const order = await adapter.createOrder(
      {
        vendor: 'مورد',
        items: [{ itemName: 'معقم', quantity: 2, unitCost: 8 }],
      },
      actorId
    );
    await adapter.approveOrder(order._id, actorId);
    await adapter.receiveOrder(order._id, actorId);

    const grns = await adapter.listReceiptsForOrder(order._id);
    expect(grns).toHaveLength(1);
    expect(grns[0].lineItems).toHaveLength(1);
    expect(grns[0].lineItems[0].itemName).toMatch(/معقم/);
    expect(grns[0].itemsSummary).toMatch(/معقم/);
    expect(grns[0].itemsCount).toBe(1);
  });
});

describe('W790 behavioral — PR lineItems', () => {
  it('createRequest maps lineItems and itemsSummary', async () => {
    const itemId = new mongoose.Types.ObjectId();
    const actorId = new mongoose.Types.ObjectId();
    const pr = await adapter.createRequest(
      {
        requiredDate: new Date(Date.now() + 86400000).toISOString(),
        items: [{ itemId, product: 'شريط لاصق', quantity: 10, estimatedPrice: 3 }],
      },
      actorId
    );
    expect(pr.itemsCount).toBe(1);
    expect(pr.lineItems[0].itemName).toBe('شريط لاصق');
    expect(String(pr.lineItems[0].itemId)).toBe(String(itemId));
    expect(pr.itemsSummary).toMatch(/شريط لاصق/);
  });
});

describe('W790 drift — adapter documents W790 fields', () => {
  it('mapPoToLegacy adds lineItems and itemsSummary', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'services', 'purchasingAdapter.service.js'),
      'utf8'
    );
    expect(src).toMatch(/W790/);
    expect(src).toMatch(/lineItems/);
    expect(src).toMatch(/itemsSummary/);
    expect(src).toMatch(/linkedItemCount/);
  });
});

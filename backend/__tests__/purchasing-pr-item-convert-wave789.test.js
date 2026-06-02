'use strict';

/**
 * purchasing-pr-item-convert-wave789.test.js — W789 PR itemId + convert-to-PO stock path.
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
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w789-purchasing' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../models/inventory/PurchaseOrder');
  require('../models/inventory/InventoryItem');
  require('../models/operations/PurchaseRequest.model');
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  const Po = require('../models/inventory/PurchaseOrder');
  const PR = require('../models/operations/PurchaseRequest.model');
  const Item = require('../models/inventory/InventoryItem');
  await Po.deleteMany({});
  await PR.deleteMany({});
  await Item.deleteMany({});
});

describe('W789 behavioral — PR itemId normalization', () => {
  it('maps legacy product/estimatedPrice and preserves itemId on create', async () => {
    const itemId = new mongoose.Types.ObjectId();
    const actorId = new mongoose.Types.ObjectId();
    const created = await adapter.createRequest(
      {
        requiredDate: new Date(Date.now() + 86400000).toISOString(),
        department: 'مستودع',
        items: [
          {
            itemId,
            product: 'قفازات طبية',
            quantity: 5,
            unit: 'علبة',
            estimatedPrice: 25,
          },
        ],
      },
      actorId
    );
    expect(created._id).toBeTruthy();

    const PR = require('../models/operations/PurchaseRequest.model');
    const doc = await PR.findById(created._id).lean();
    expect(doc.items[0].itemName).toBe('قفازات طبية');
    expect(doc.items[0].estimatedUnitPrice).toBe(25);
    expect(String(doc.items[0].itemId)).toBe(String(itemId));
  });
});

describe('W789 behavioral — PR convert-to-PO carries item_id', () => {
  it('submit → approve → convert preserves item_id on PO lines', async () => {
    const Item = require('../models/inventory/InventoryItem');
    const actorId = new mongoose.Types.ObjectId();
    const inv = await Item.create({
      name_ar: 'معقم يد',
      item_code: 'INV-W789',
      category: 'medical_supplies',
      quantity_on_hand: 10,
      minimum_stock: 2,
      unit_of_measure: 'زجاجة',
      unit_cost: 12,
      created_by: actorId,
    });

    const pr = await adapter.createRequest(
      {
        requiredDate: new Date(Date.now() + 86400000).toISOString(),
        items: [{ itemId: inv._id, product: 'معقم يد', quantity: 3, estimatedPrice: 12 }],
      },
      actorId
    );
    await adapter.submitRequest(pr._id, { actorId });
    await adapter.approveRequest(pr._id, {
      approverId: actorId,
      approverName: 'Test Approver',
      role: 'department_head',
    });

    const { order, request } = await adapter.convertRequestToPo(pr._id, { actorId });
    expect(request.status).toBe('converted_to_po');
    expect(order._id).toBeTruthy();

    const Po = require('../models/inventory/PurchaseOrder');
    const poDoc = await Po.findById(order._id).lean();
    expect(poDoc.items).toHaveLength(1);
    expect(String(poDoc.items[0].item_id)).toBe(String(inv._id));
    expect(poDoc.items[0].item_name_ar).toBe('معقم يد');
    expect(poDoc.items[0].quantity_ordered).toBe(3);
  });
});

describe('W789 static — adapter normalizePrItem', () => {
  it('exports normalizePrItem via createRequest legacy mapping (source guard)', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'services', 'purchasingAdapter.service.js'),
      'utf8'
    );
    expect(src).toMatch(/function normalizePrItem/);
    expect(src).toMatch(/it\.product/);
    expect(src).toMatch(/it\.estimatedPrice/);
    expect(src).toMatch(/W789/);
  });
});

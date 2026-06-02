'use strict';

/**
 * purchasing-stats-legacy-wave787.test.js — W787 stats aliases for legacy UI.
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
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w787-purchasing-stats' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../models/Vendor');
  require('../models/inventory/PurchaseOrder');
  require('../models/inventory/PurchaseReceipt');
  require('../models/operations/PurchaseRequest.model');
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  const Vendor = require('../models/Vendor');
  const Po = require('../models/inventory/PurchaseOrder');
  const Receipt = require('../models/inventory/PurchaseReceipt');
  const PR = require('../models/operations/PurchaseRequest.model');
  await Vendor.deleteMany({});
  await Po.deleteMany({});
  await Receipt.deleteMany({});
  await PR.deleteMany({});
});

describe('W787 behavioral — getStats legacy UI fields', () => {
  it('returns tiles used by PurchasingManagement.js', async () => {
    const actorId = new mongoose.Types.ObjectId();
    await adapter.createVendor({ name: 'مورد', email: 'a@b.c', phone: '05', city: 'الرياض' });
    const order = await adapter.createOrder(
      { vendor: 'مورد', items: [{ itemName: 'بند', quantity: 2, unitCost: 50 }] },
      actorId
    );
    await adapter.approveOrder(order._id, actorId);
    await adapter.receiveOrder(order._id, actorId);

    const stats = await adapter.getStats();
    expect(stats.totalOrders).toBeGreaterThanOrEqual(1);
    expect(stats.totalAmount).toBe(stats.totalSpend);
    expect(stats.vendors).toBe(stats.totalVendors);
    expect(stats.delivered).toBeGreaterThanOrEqual(1);
    expect(stats.totalReceipts).toBeGreaterThanOrEqual(1);
    expect(typeof stats.avgDeliveryDays).toBe('number');
  });
});

describe('W787 drift — legacy stats documented in adapter', () => {
  it('getStats maps totalAmount and vendors aliases', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'services', 'purchasingAdapter.service.js'),
      'utf8'
    );
    expect(src).toMatch(/W787/);
    expect(src).toMatch(/totalAmount: totalSpend/);
    expect(src).toMatch(/vendors: totalVendors/);
  });
});

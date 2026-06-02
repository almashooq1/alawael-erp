'use strict';

/**
 * purchasing-vendor-order-wave780.test.js — W780 Vendor + PO adapter behavioral.
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
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w780-purchasing' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../models/Vendor');
  require('../models/inventory/PurchaseOrder');
  require('../models/operations/PurchaseRequest.model');
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  const Vendor = require('../models/Vendor');
  const Po = require('../models/inventory/PurchaseOrder');
  const PR = require('../models/operations/PurchaseRequest.model');
  const Receipt = require('../models/inventory/PurchaseReceipt');
  await Vendor.deleteMany({});
  await Po.deleteMany({});
  await PR.deleteMany({});
  await Receipt.deleteMany({});
});

describe('W780 behavioral — vendors', () => {
  it('creates, lists, updates, and soft-deletes vendors', async () => {
    const created = await adapter.createVendor({
      name: 'مورد تجريبي',
      email: 'v@test.local',
      phone: '0500000000',
      city: 'الرياض',
      type: 'company',
      paymentTerms: 'net30',
    });
    expect(created._id).toBeTruthy();
    expect(created.name).toBe('مورد تجريبي');
    expect(created.isActive).toBe(true);
    expect(created.vendorNumber).toMatch(/^VND-/);

    const list = await adapter.listVendors();
    expect(list).toHaveLength(1);

    const updated = await adapter.updateVendor(created._id, { isActive: false });
    expect(updated.isActive).toBe(false);

    await adapter.deleteVendor(created._id);
    const after = await adapter.listVendors();
    expect(after).toHaveLength(0);
  });
});

describe('W780 behavioral — purchase orders', () => {
  it('creates, approves, receives, and lists orders with legacy shape', async () => {
    const actorId = new mongoose.Types.ObjectId();
    const created = await adapter.createOrder(
      {
        vendor: 'مورد الأثاث',
        items: [{ itemName: 'كرسي', quantity: 2, unitCost: 100 }],
      },
      actorId
    );
    expect(created.orderNumber).toMatch(/^PO-/);
    expect(created.vendor).toBe('مورد الأثاث');
    expect(created.status).toBe('draft');
    expect(created.items).toBe(1);

    const approved = await adapter.approveOrder(created._id, actorId);
    expect(approved.status).toBe('approved');

    const received = await adapter.receiveOrder(created._id, actorId);
    expect(received.status).toBe('received');

    const rows = await adapter.listOrders();
    expect(rows).toHaveLength(1);
    expect(rows[0].totalAmount).toBeGreaterThan(0);
  });
});

describe('W780 behavioral — PR draft update', () => {
  it('updateRequest patches draft only', async () => {
    const actorId = new mongoose.Types.ObjectId();
    const created = await adapter.createRequest(
      {
        items: [{ itemName: 'قديم', quantity: 1, estimatedUnitPrice: 10 }],
        requiredDate: new Date(Date.now() + 86400000).toISOString(),
      },
      actorId
    );
    const updated = await adapter.updateRequest(
      created._id,
      { items: [{ itemName: 'جديد', quantity: 2, estimatedUnitPrice: 15 }] },
      actorId
    );
    expect(updated.title).toMatch(/جديد/);

    await adapter.submitRequest(created._id, { actorId });
    await expect(
      adapter.updateRequest(created._id, { items: [{ itemName: 'x', quantity: 1 }] }, actorId)
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});

describe('W780 behavioral — PR submit + convert-to-po', () => {
  it('approved PR converts to inventory PO via ops service', async () => {
    const actorId = new mongoose.Types.ObjectId();
    const created = await adapter.createRequest(
      {
        items: [{ itemName: 'حبر', quantity: 5, estimatedUnitPrice: 20 }],
        requiredDate: new Date(Date.now() + 86400000).toISOString(),
      },
      actorId
    );
    await adapter.submitRequest(created._id, { actorId });
    await adapter.approveRequest(created._id, {
      approverId: actorId,
      approverName: 'Test',
      role: 'department_head',
    });
    const { request, order } = await adapter.convertRequestToPo(created._id, {
      actorId,
      supplierName: 'مورد الحبر',
    });
    expect(request.status).toBe('converted_to_po');
    expect(order.orderNumber).toMatch(/^PO-/);
    expect(order.vendor).toBe('مورد الحبر');

    const orders = await adapter.listOrders();
    expect(orders.some(o => String(o._id) === String(order._id))).toBe(true);
  });
});

describe('W780 behavioral — stats', () => {
  it('getStats counts vendors and spend from real collections', async () => {
    const actorId = new mongoose.Types.ObjectId();
    await adapter.createVendor({ name: 'A', email: 'a@t.com' });
    const po = await adapter.createOrder(
      { vendor: 'X', items: [{ itemName: 'pen', quantity: 1, unitCost: 50 }] },
      actorId
    );
    await adapter.approveOrder(po._id, actorId);
    const stats = await adapter.getStats();
    expect(stats.totalVendors).toBeGreaterThanOrEqual(1);
    expect(stats.activeOrders).toBeGreaterThanOrEqual(1);
  });
});

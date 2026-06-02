'use strict';

/**
 * purchasing-receipts-contracts-wave781.test.js — W781 GRN + vendor contracts.
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
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w781-purchasing' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../models/inventory/PurchaseReceipt');
  require('../models/VendorSupplyContract');
  require('../models/inventory/PurchaseOrder');
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  const Receipt = require('../models/inventory/PurchaseReceipt');
  const Contract = require('../models/VendorSupplyContract');
  const Po = require('../models/inventory/PurchaseOrder');
  await Receipt.deleteMany({});
  await Contract.deleteMany({});
  await Po.deleteMany({});
});

describe('W781 behavioral — purchase receipts', () => {
  it('creates and lists receipts with legacy GRN shape', async () => {
    const actorId = new mongoose.Types.ObjectId();
    const created = await adapter.createReceipt(
      {
        vendor: 'مورد تجريبي',
        warehouse: 'المستودع الرئيسي',
        items: [{ itemName: 'ورق', quantity_ordered: 10, quantity_received: 10, unitCost: 5 }],
        qualityCheck: 'passed',
        receivedBy: 'فهد',
      },
      actorId
    );
    expect(created.receiptNumber).toMatch(/^GRN-/);
    expect(created.vendor).toBe('مورد تجريبي');
    expect(created.status).toBe('complete');
    expect(created.items).toBe(1);

    const rows = await adapter.listReceipts();
    expect(rows).toHaveLength(1);
  });
});

describe('W781 behavioral — vendor contracts', () => {
  it('creates contract and lists expiring within horizon', async () => {
    const soon = new Date(Date.now() + 20 * 86400000);
    const created = await adapter.createContract({
      vendor: 'شركة التوريد',
      type: 'annual',
      startDate: new Date(Date.now() - 86400000),
      endDate: soon,
      value: 250000,
      category: 'مستلزمات',
      autoRenew: true,
    });
    expect(created.contractNumber).toMatch(/^CNT-/);
    expect(created.status).toBe('expiring_soon');

    const expiring = await adapter.listExpiringContracts(60);
    expect(expiring.some(c => String(c._id) === String(created._id))).toBe(true);

    const all = await adapter.listContracts();
    expect(all).toHaveLength(1);
  });
});

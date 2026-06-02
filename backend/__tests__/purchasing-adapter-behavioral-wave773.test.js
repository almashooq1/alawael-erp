'use strict';

/**
 * purchasing-adapter-behavioral-wave773.test.js — W773 PR adapter smoke.
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
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w773-purchasing' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../models/operations/PurchaseRequest.model');
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  const PR = require('../models/operations/PurchaseRequest.model');
  await PR.deleteMany({});
});

describe('W773 behavioral — purchasing adapter', () => {
  it('creates and lists purchase requests via ops service', async () => {
    const actorId = new mongoose.Types.ObjectId();
    const created = await adapter.createRequest(
      {
        title: 'مستلزمات مكتبية',
        items: [{ itemName: 'ورق A4', quantity: 10 }],
        requiredDate: new Date(Date.now() + 86400000).toISOString(),
      },
      actorId
    );
    expect(created._id).toBeTruthy();
    expect(created.status).toBe('draft');
    expect(created.title).toMatch(/ورق A4|مستلزمات/);

    const rows = await adapter.listRequests();
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toMatch(/ورق A4|مستلزمات/);
  });

  it('getStats reflects pending draft count', async () => {
    await adapter.createRequest(
      {
        items: [{ itemName: 'قلم', quantity: 5 }],
        requiredDate: new Date(Date.now() + 86400000).toISOString(),
      },
      new mongoose.Types.ObjectId()
    );
    const stats = await adapter.getStats();
    expect(stats.pendingRequests).toBeGreaterThanOrEqual(1);
  });
});

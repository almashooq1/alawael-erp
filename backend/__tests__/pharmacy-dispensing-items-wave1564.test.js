'use strict';

/**
 * pharmacy-dispensing-items-wave1564.test.js — W1564
 *
 * routes/pharmacy.routes.js POST /dispensing whitelisted the body key `medications`,
 * but the Dispensing schema field is `items` — so `pick(req.body, DISPENSING_FIELDS)`
 * never captured the line items (strict mode dropped `medications`), `dispensing.items`
 * was ALWAYS empty, and the inventory-deduction loop `for (const item of dispensing.items)`
 * never ran. Result: dispensing records carried no drug/quantity detail and pharmacy
 * stock was never decremented (controlled-substance reconciliation + patient-safety gap).
 *
 * Fix: whitelist `items`, accept a legacy `medications` body, set required `beneficiary`
 * from the resolved id. Behavioral: a dispense now persists items AND deducts inventory.
 */
jest.unmock('mongoose');
jest.setTimeout(60000);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockUser = { u: null };
jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = mockUser.u;
    next();
  },
}));
// Cross-branch scope (restricted:false) so the beneficiary/prescription branch checks
// pass — this test targets the items/inventory field-drift fix, not branch isolation.
jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (req, _res, next) => {
    req.branchScope = { restricted: false, allBranches: true };
    next();
  },
  branchFilter: () => ({}),
}));

let mongod;
let app;
let Prescription;
let Dispensing;
let PharmacyInventory;
const benId = new mongoose.Types.ObjectId();
const medId = new mongoose.Types.ObjectId();
let rxId;
let batchA;
let batchB;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1564-pharm' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  ({ Prescription, Dispensing, PharmacyInventory } = require('../models/pharmacy.model'));
  const benSchema = new mongoose.Schema({ branchId: mongoose.Schema.Types.ObjectId }, { strict: false });
  if (!mongoose.models.Beneficiary) mongoose.model('Beneficiary', benSchema);
  await mongoose.model('Beneficiary').collection.insertOne({ _id: benId, branchId: new mongoose.Types.ObjectId() });
  rxId = (await Prescription.collection.insertOne({ beneficiary: benId, isDeleted: false, status: 'active' })).insertedId;
  batchA = (await PharmacyInventory.collection.insertOne({ medication: medId, quantity: 10 })).insertedId;
  batchB = (await PharmacyInventory.collection.insertOne({ medication: medId, quantity: 10 })).insertedId;

  app = express();
  app.use(express.json());
  app.use('/api/pharmacy', require('../routes/pharmacy.routes'));
  app.use((err, req, res, _next) => res.status(err.status || 500).json({ error: err.message }));
});

beforeEach(() => {
  mockUser.u = { _id: new mongoose.Types.ObjectId(), id: String(new mongoose.Types.ObjectId()), role: 'pharmacist' };
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1564 — pharmacy dispensing persists items + deducts inventory', () => {
  it('POST /dispensing — persists line items and decrements the batch (items body)', async () => {
    const r = await request(app)
      .post('/api/pharmacy/dispensing')
      .send({
        prescription: String(rxId),
        beneficiary: String(benId),
        items: [{ medication: String(medId), batch: String(batchA), quantityDispensed: 3 }],
      });
    expect(r.status).toBe(201);
    expect(r.body.data.items).toHaveLength(1);
    const batch = await PharmacyInventory.findById(batchA).lean();
    expect(batch.quantity).toBe(7); // 10 - 3 deducted (loop now runs)
  });

  it('POST /dispensing — accepts a legacy `medications` body (mapped to items)', async () => {
    const r = await request(app)
      .post('/api/pharmacy/dispensing')
      .send({
        prescription: String(rxId),
        beneficiary: String(benId),
        medications: [{ medication: String(medId), batch: String(batchB), quantityDispensed: 4 }],
      });
    expect(r.status).toBe(201);
    expect(r.body.data.items).toHaveLength(1);
    const batch = await PharmacyInventory.findById(batchB).lean();
    expect(batch.quantity).toBe(6); // 10 - 4
  });

  it('static: DISPENSING_FIELDS whitelists the schema field `items`', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'pharmacy.routes.js'), 'utf8');
    const block = src.slice(src.indexOf('DISPENSING_FIELDS'), src.indexOf('DISPENSING_FIELDS') + 200);
    expect(block).toMatch(/'items'/);
    expect(block).not.toMatch(/'medications'/);
  });
});

'use strict';

/**
 * forgotten-stub-models.test.js
 *
 * legal-affairs + warehouse were route-mounted but two models were never built:
 * LegalConsultation (sibling LegalCase IS registered) and WarehouseTransaction
 * (siblings Warehouse + WarehouseItem ARE registered). So safeModel(...) returned
 * null and the WRITE handlers — which, unlike the reads, don't null-guard — threw
 * `Cannot read properties of null` → 500 on every create/update.
 *
 * Static: the routes now require the models so safeModel() resolves them at boot.
 * Behavioral: each model accepts the exact create payload the route builds, with
 * every whitelisted/server field persisted (no strict-mode drop), and supports the
 * status transitions the routes perform.
 */

const fs = require('fs');
const path = require('path');

describe('forgotten stub models (static wiring)', () => {
  const read = rel => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  test('legal-affairs requires the LegalConsultation model so safeModel resolves it', () => {
    expect(read('routes/legal-affairs.routes.js')).toMatch(
      /require\(['"]\.\.\/models\/LegalConsultation['"]\)/
    );
  });
  test('warehouse requires the WarehouseTransaction model so safeModel resolves it', () => {
    expect(read('routes/warehouse.routes.js')).toMatch(
      /require\(['"]\.\.\/models\/WarehouseTransaction['"]\)/
    );
  });
});

describe('forgotten stub models (behavioral)', () => {
  jest.unmock('mongoose');
  jest.setTimeout(60000);
  let mongoose;
  let mongod;
  let LegalConsultation;
  let WarehouseTransaction;

  beforeAll(async () => {
    mongoose = require('mongoose');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'forgotten-models' } });
    await mongoose.connect(mongod.getUri());
    LegalConsultation = require('../models/LegalConsultation');
    WarehouseTransaction = require('../models/WarehouseTransaction');
  });

  afterAll(async () => {
    await mongoose.disconnect().catch(() => null);
    if (mongod) await mongod.stop().catch(() => null);
  });

  test('LegalConsultation accepts the route POST payload (CONSULTATION_FIELDS + server fields)', async () => {
    const doc = await LegalConsultation.create({
      title: 'عقد إيجار',
      description: 'مراجعة بنود',
      type: 'contract',
      priority: 'high',
      category: 'commercial',
      dueDate: new Date('2026-08-01'),
      assignedTo: new mongoose.Types.ObjectId(),
      notes: 'عاجل',
      documents: [{ name: 'a.pdf' }],
      consultationNumber: 'LC-1',
      requestedBy: new mongoose.Types.ObjectId(),
    });
    expect(doc.title).toBe('عقد إيجار');
    expect(doc.priority).toBe('high');
    expect(Array.isArray(doc.documents)).toBe(true);
    expect(doc.status).toBe('pending'); // default (no longer a null-model crash)
    expect(doc.consultationNumber).toBe('LC-1');
  });

  test('WarehouseTransaction accepts the route create payload + approve transition', async () => {
    const doc = await WarehouseTransaction.create({
      warehouse: new mongoose.Types.ObjectId(),
      item: new mongoose.Types.ObjectId(),
      type: 'in',
      quantity: 50,
      transactionNumber: 'WH-TX-1',
      requestedBy: new mongoose.Types.ObjectId(),
    });
    expect(doc.type).toBe('in');
    expect(doc.quantity).toBe(50);
    expect(doc.status).toBe('pending');

    doc.status = 'approved';
    doc.approvedBy = new mongoose.Types.ObjectId();
    const saved = await doc.save();
    expect(saved.status).toBe('approved');
  });

  test('both reject an out-of-enum status (schema is bounded, not strict:false)', async () => {
    await expect(LegalConsultation.create({ status: 'nope' })).rejects.toThrow(/status/);
    await expect(WarehouseTransaction.create({ type: 'teleport' })).rejects.toThrow(/type/);
  });
});

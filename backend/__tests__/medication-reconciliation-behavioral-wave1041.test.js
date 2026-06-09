'use strict';

/**
 * medication-reconciliation-behavioral-wave1041.test.js — behavioral
 * counterpart to the W1041 static drift guard. MongoMemoryServer-based:
 * real docs, real .create()/.save(), asserts Wave-18 invariants fire +
 * computeReconciliationStats + virtuals + round-trip of the medications[].
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let MedRec;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1041-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  MedRec = require('../models/MedicationReconciliation');
  await MedRec.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await MedRec.deleteMany({});
});

function baseDoc(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    date: new Date('2026-06-01T08:00:00Z'),
    reconciliationType: 'admission',
    ...overrides,
  };
}

describe('W1041 behavioral — base save + enum gating', () => {
  it('SAVES a minimal admission reconciliation with no meds', async () => {
    const doc = await MedRec.create(baseDoc());
    expect(doc.status).toBe('draft');
    expect(doc.medicationCount).toBe(0);
  });

  it('REJECTS an invalid reconciliationType', async () => {
    await expect(MedRec.create(baseDoc({ reconciliationType: 'teleport' }))).rejects.toThrow(
      /reconciliationType/
    );
  });

  it('REJECTS an invalid medication decision (sub-schema enum)', async () => {
    await expect(
      MedRec.create(baseDoc({ medications: [{ name: 'Valproate', decision: 'teleport' }] }))
    ).rejects.toThrow(/decision/);
  });

  it('REJECTS an invalid discrepancyType (sub-schema enum)', async () => {
    await expect(
      MedRec.create(baseDoc({ medications: [{ name: 'Valproate', discrepancyType: 'cosmic' }] }))
    ).rejects.toThrow(/discrepancyType/);
  });
});

describe('W1041 behavioral — modify requires notes', () => {
  it('REJECTS a modify decision with no notes', async () => {
    await expect(
      MedRec.create(baseDoc({ medications: [{ name: 'Levetiracetam', decision: 'modify' }] }))
    ).rejects.toThrow(/medications/);
  });

  it('SAVES a modify decision with notes', async () => {
    const doc = await MedRec.create(
      baseDoc({ medications: [{ name: 'Levetiracetam', decision: 'modify', notes: 'dose reduced to 250mg BID' }] })
    );
    expect(doc.medications[0].decision).toBe('modify');
  });
});

describe('W1041 behavioral — reconcile gating', () => {
  it('REJECTS reconciled with no reconciler', async () => {
    await expect(
      MedRec.create(baseDoc({ status: 'reconciled', reconciledAt: new Date() }))
    ).rejects.toThrow(/reconciledBy/);
  });

  it('REJECTS reconciled with no reconciledAt', async () => {
    await expect(
      MedRec.create(baseDoc({ status: 'reconciled', reconciledByName: 'صيدلي' }))
    ).rejects.toThrow(/reconciledAt/);
  });

  it('SAVES a reconciled record with reconciler + time', async () => {
    const doc = await MedRec.create(
      baseDoc({ status: 'reconciled', reconciledByName: 'صيدلي', reconciledAt: new Date() })
    );
    expect(doc.status).toBe('reconciled');
  });
});

describe('W1041 behavioral — computeReconciliationStats', () => {
  it('counts discrepancies + unresolved', () => {
    const meds = [
      { name: 'A', discrepancyType: 'none', discrepancyResolved: false },
      { name: 'B', discrepancyType: 'omission', discrepancyResolved: false },
      { name: 'C', discrepancyType: 'dose_change', discrepancyResolved: true },
      { name: 'D', discrepancyType: 'duplication', discrepancyResolved: false },
    ];
    expect(MedRec.computeReconciliationStats(meds)).toEqual({
      medicationCount: 4,
      discrepancyCount: 3,
      unresolvedDiscrepancyCount: 2,
    });
  });

  it('empty list → all zeros', () => {
    expect(MedRec.computeReconciliationStats([])).toEqual({
      medicationCount: 0,
      discrepancyCount: 0,
      unresolvedDiscrepancyCount: 0,
    });
  });
});

describe('W1041 behavioral — virtuals + round-trip persistence', () => {
  it('virtuals reflect the medications discrepancy state', async () => {
    const doc = await MedRec.create(
      baseDoc({
        medications: [
          { name: 'Carbamazepine', dose: '200mg', route: 'oral', frequency: 'BID', source: 'home', decision: 'continue' },
          { name: 'Risperidone', decision: 'discontinue', discrepancyType: 'therapeutic_duplication', discrepancyResolved: false },
        ],
      })
    );
    expect(doc.medicationCount).toBe(2);
    expect(doc.discrepancyCount).toBe(1);
    expect(doc.unresolvedDiscrepancyCount).toBe(1);
    expect(doc.hasUnresolvedDiscrepancies).toBe(true);
  });

  it('round-trips the medications array', async () => {
    const doc = await MedRec.create(
      baseDoc({
        reconciliationType: 'discharge',
        medications: [{ name: 'Baclofen', dose: '10mg', route: 'oral', frequency: 'TID', source: 'prescribed', decision: 'new' }],
      })
    );
    const reloaded = await MedRec.findById(doc._id).lean();
    expect(reloaded.reconciliationType).toBe('discharge');
    expect(reloaded.medications).toHaveLength(1);
    expect(reloaded.medications[0].name).toBe('Baclofen');
    expect(reloaded.medications[0].decision).toBe('new');
  });

  it('resolving a discrepancy clears the unresolved count', async () => {
    const doc = await MedRec.create(
      baseDoc({ medications: [{ name: 'Phenytoin', discrepancyType: 'omission', discrepancyResolved: false }] })
    );
    expect(doc.unresolvedDiscrepancyCount).toBe(1);
    doc.medications[0].discrepancyResolved = true;
    await doc.save();
    const reloaded = await MedRec.findById(doc._id);
    expect(reloaded.unresolvedDiscrepancyCount).toBe(0);
    expect(reloaded.discrepancyCount).toBe(1);
  });
});

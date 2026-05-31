'use strict';

/**
 * instrumental-swallow-behavioral-wave683.test.js — behavioral counterpart
 * to the W683 static drift guard. MongoMemoryServer-based.
 *
 * Asserts runtime behavior: Wave-18 invariants fire, virtuals compute,
 * defaults apply, indexes exist.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Study;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w683-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  Study = require('../models/InstrumentalSwallowStudy');
  await Study.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Study.deleteMany({});
});

function baseDoc(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    studyType: 'vfss',
    ...overrides,
  };
}

describe('W683 behavioral — defaults + type', () => {
  it('SAVES ordered study with defaults', async () => {
    const doc = await Study.create(baseDoc());
    expect(doc.studyType).toBe('vfss');
    expect(doc.status).toBe('ordered');
    expect(doc.aspirationDetected).toBe(false);
    expect(doc.isComplete).toBe(false);
  });

  it('REJECTS unknown studyType', async () => {
    const p = new Study(baseDoc({ studyType: 'xray' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W683 behavioral — PAS + aspiration invariants', () => {
  it('REJECTS PAS out of range (9)', async () => {
    const p = new Study(baseDoc({ penetrationAspirationScale: 9 }));
    await expect(p.save()).rejects.toThrow(/penetrationAspirationScale|PAS/);
  });

  it('REJECTS aspirationDetected with PAS 4 (< 6)', async () => {
    const p = new Study(baseDoc({ aspirationDetected: true, penetrationAspirationScale: 4 }));
    await expect(p.save()).rejects.toThrow(/penetrationAspirationScale|PAS/);
  });

  it('SAVES aspirationDetected with PAS 7', async () => {
    const doc = await Study.create(
      baseDoc({
        status: 'completed',
        performedDate: new Date(),
        performedByName: 'أخصائية النطق',
        overallFinding: 'aspiration on thin liquids',
        aspirationDetected: true,
        penetrationAspirationScale: 7,
      })
    );
    expect(doc.indicatesAspiration).toBe(true);
  });

  it('REJECTS silentAspiration without aspirationDetected', async () => {
    const p = new Study(baseDoc({ silentAspiration: true }));
    await expect(p.save()).rejects.toThrow(/aspirationDetected/);
  });
});

describe('W683 behavioral — completed/cancelled invariants', () => {
  it('REJECTS completed without performedDate', async () => {
    const p = new Study(
      baseDoc({ status: 'completed', performedByName: 'X', overallFinding: 'ok' })
    );
    await expect(p.save()).rejects.toThrow(/performedDate/);
  });

  it('REJECTS completed without performedByName', async () => {
    const p = new Study(
      baseDoc({ status: 'completed', performedDate: new Date(), overallFinding: 'ok' })
    );
    await expect(p.save()).rejects.toThrow(/performedByName/);
  });

  it('REJECTS completed without any result/finding', async () => {
    const p = new Study(
      baseDoc({ status: 'completed', performedDate: new Date(), performedByName: 'X' })
    );
    await expect(p.save()).rejects.toThrow(/overallFinding/);
  });

  it('SAVES completed with consistencyResults (no overallFinding)', async () => {
    const doc = await Study.create(
      baseDoc({
        status: 'completed',
        performedDate: new Date(),
        performedByName: 'أخصائية النطق',
        consistencyResults: [{ iddsiLevel: '4', safe: true }],
      })
    );
    expect(doc.status).toBe('completed');
    expect(doc.consistencyResults[0].iddsiLevel).toBe('4');
  });

  it('REJECTS cancelled without cancelReason', async () => {
    const p = new Study(baseDoc({ status: 'cancelled' }));
    await expect(p.save()).rejects.toThrow(/cancelReason/);
  });
});

describe('W683 behavioral — indicatesAspiration virtual', () => {
  it('true when PAS >= 6 even without aspirationDetected flag', async () => {
    const doc = await Study.create(
      baseDoc({
        status: 'completed',
        performedDate: new Date(),
        performedByName: 'X',
        overallFinding: 'penetration to level of vocal folds',
        aspirationDetected: true,
        penetrationAspirationScale: 6,
      })
    );
    expect(doc.indicatesAspiration).toBe(true);
  });

  it('false for a clean study (PAS 1)', async () => {
    const doc = await Study.create(
      baseDoc({
        status: 'completed',
        performedDate: new Date(),
        performedByName: 'X',
        overallFinding: 'no penetration or aspiration',
        penetrationAspirationScale: 1,
      })
    );
    expect(doc.indicatesAspiration).toBe(false);
  });
});

describe('W683 behavioral — indexes', () => {
  it('compound indexes exist for query patterns', async () => {
    const indexes = await Study.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('beneficiaryId+performedDate');
    expect(keys).toContain('branchId+status');
    expect(keys).toContain('status+scheduledDate');
  });
});

'use strict';

/**
 * spasticity-injection-behavioral-wave715.test.js — behavioral counterpart
 * to the W715 static drift guard. MongoMemoryServer-based.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let SI;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w715-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  SI = require('../models/SpasticityInjection');
  await SI.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await SI.deleteMany({});
});

function baseDoc(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    agent: 'botulinum_toxin_a',
    procedureDate: new Date(),
    ...overrides,
  };
}
const muscle = (o = {}) => ({
  muscle: 'gastrocnemius',
  side: 'left',
  doseUnits: 100,
  ashworthBefore: '3',
  ...o,
});

describe('W715 behavioral — defaults + agent', () => {
  it('SAVES a planned procedure with defaults', async () => {
    const doc = await SI.create(baseDoc());
    expect(doc.agent).toBe('botulinum_toxin_a');
    expect(doc.status).toBe('planned');
    expect(doc.consentObtained).toBe(false);
    expect(doc.muscleCount).toBe(0);
  });
  it('REJECTS an unknown agent', async () => {
    const p = new SI(baseDoc({ agent: 'magic' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W715 behavioral — consent gate + completion', () => {
  it('REJECTS completed without consent', async () => {
    const p = new SI(baseDoc({ status: 'completed', targetedMuscles: [muscle()] }));
    await expect(p.save()).rejects.toThrow(/consentObtained/);
  });
  it('REJECTS completed (consented) but with no muscles', async () => {
    const p = new SI(baseDoc({ status: 'completed', consentObtained: true }));
    await expect(p.save()).rejects.toThrow(/targetedMuscles/);
  });
  it('SAVES completed with consent + a muscle', async () => {
    const doc = await SI.create(
      baseDoc({ status: 'completed', consentObtained: true, targetedMuscles: [muscle()] })
    );
    expect(doc.status).toBe('completed');
    expect(doc.muscleCount).toBe(1);
  });
  it('REJECTS cancelled without reason', async () => {
    const p = new SI(baseDoc({ status: 'cancelled' }));
    await expect(p.save()).rejects.toThrow(/cancelReason/);
  });
});

describe('W715 behavioral — muscle sub-schema enums', () => {
  it('REJECTS an invalid side', async () => {
    const p = new SI(baseDoc({ targetedMuscles: [muscle({ side: 'diagonal' })] }));
    await expect(p.save()).rejects.toThrow();
  });
  it('REJECTS an invalid Ashworth grade', async () => {
    const p = new SI(baseDoc({ targetedMuscles: [muscle({ ashworthBefore: '7' })] }));
    await expect(p.save()).rejects.toThrow();
  });
  it('ACCEPTS the 1+ Ashworth grade', async () => {
    const doc = await SI.create(baseDoc({ targetedMuscles: [muscle({ ashworthBefore: '1+' })] }));
    expect(doc.targetedMuscles[0].ashworthBefore).toBe('1+');
  });
});

describe('W715 behavioral — isFollowUpDue virtual', () => {
  it('true when completed + followUpDueDate past', async () => {
    const past = new Date(Date.now() - 86400000);
    const doc = await SI.create(
      baseDoc({
        status: 'completed',
        consentObtained: true,
        targetedMuscles: [muscle()],
        followUpDueDate: past,
      })
    );
    expect(doc.isFollowUpDue).toBe(true);
  });
  it('false when planned even if date past', async () => {
    const past = new Date(Date.now() - 86400000);
    const doc = await SI.create(baseDoc({ followUpDueDate: past }));
    expect(doc.isFollowUpDue).toBe(false);
  });
});

describe('W715 behavioral — indexes', () => {
  it('compound indexes exist', async () => {
    const indexes = await SI.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('beneficiaryId+procedureDate');
    expect(keys).toContain('branchId+status');
    expect(keys).toContain('status+followUpDueDate');
  });
});

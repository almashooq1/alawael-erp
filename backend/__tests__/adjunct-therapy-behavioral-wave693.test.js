'use strict';

/**
 * adjunct-therapy-behavioral-wave693.test.js — behavioral counterpart to
 * the W693 static drift guard. MongoMemoryServer-based.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Session;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w693-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  Session = require('../models/AdjunctTherapySession');
  await Session.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Session.deleteMany({});
});

function baseDoc(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    modality: 'hydrotherapy',
    sessionDate: new Date(),
    ...overrides,
  };
}

describe('W693 behavioral — defaults + modality', () => {
  it('SAVES scheduled session with defaults', async () => {
    const doc = await Session.create(baseDoc());
    expect(doc.modality).toBe('hydrotherapy');
    expect(doc.status).toBe('scheduled');
    expect(doc.medicalCleared).toBe(false);
    expect(doc.isCleared).toBe(false);
  });

  it('REJECTS unknown modality', async () => {
    const p = new Session(baseDoc({ modality: 'skydiving' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W693 behavioral — safety gate (completed ⇒ medicalCleared)', () => {
  it('REJECTS completed without medical clearance', async () => {
    const p = new Session(baseDoc({ status: 'completed', activities: ['floating'] }));
    await expect(p.save()).rejects.toThrow(/medicalCleared/);
  });

  it('REJECTS completed (cleared) but without content', async () => {
    const p = new Session(baseDoc({ status: 'completed', medicalCleared: true }));
    await expect(p.save()).rejects.toThrow(/outcomeNotes|activities/);
  });

  it('SAVES completed when cleared + content (hydrotherapy)', async () => {
    const doc = await Session.create(
      baseDoc({ status: 'completed', medicalCleared: true, activities: ['floating', 'walking'] })
    );
    expect(doc.status).toBe('completed');
    expect(doc.isCleared).toBe(true);
  });
});

describe('W693 behavioral — animal-modality completion', () => {
  it('REJECTS completed hippotherapy without animalType', async () => {
    const p = new Session(
      baseDoc({
        modality: 'hippotherapy',
        status: 'completed',
        medicalCleared: true,
        outcomeNotes: 'good seat balance',
      })
    );
    await expect(p.save()).rejects.toThrow(/animalType/);
  });

  it('SAVES completed hippotherapy with animalType=horse', async () => {
    const doc = await Session.create(
      baseDoc({
        modality: 'hippotherapy',
        status: 'completed',
        medicalCleared: true,
        outcomeNotes: 'good seat balance',
        animalType: 'horse',
        animalName: 'Barq',
      })
    );
    expect(doc.animalType).toBe('horse');
  });
});

describe('W693 behavioral — cancel + incident invariants', () => {
  it('REJECTS cancelled without cancelReason', async () => {
    const p = new Session(baseDoc({ status: 'cancelled' }));
    await expect(p.save()).rejects.toThrow(/cancelReason/);
  });

  it('REJECTS incidentDuringSession without incidentNotes', async () => {
    const p = new Session(baseDoc({ incidentDuringSession: true }));
    await expect(p.save()).rejects.toThrow(/incidentNotes/);
  });

  it('SAVES incident with notes (hadIncident virtual true)', async () => {
    const doc = await Session.create(
      baseDoc({ incidentDuringSession: true, incidentNotes: 'slipped at poolside, no injury' })
    );
    expect(doc.hadIncident).toBe(true);
  });
});

describe('W693 behavioral — indexes', () => {
  it('compound indexes exist for query patterns', async () => {
    const indexes = await Session.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('beneficiaryId+sessionDate');
    expect(keys).toContain('branchId+status');
    expect(keys).toContain('modality+sessionDate');
  });
});

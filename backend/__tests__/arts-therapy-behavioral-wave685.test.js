'use strict';

/**
 * arts-therapy-behavioral-wave685.test.js — behavioral counterpart to the
 * W685 static drift guard. MongoMemoryServer-based.
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
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w685-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  Session = require('../models/CreativeArtsTherapySession');
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
    modality: 'music',
    sessionDate: new Date(),
    ...overrides,
  };
}

describe('W685 behavioral — defaults + modality', () => {
  it('SAVES scheduled session with defaults', async () => {
    const doc = await Session.create(baseDoc());
    expect(doc.modality).toBe('music');
    expect(doc.status).toBe('scheduled');
    expect(doc.format).toBe('individual');
  });

  it('REJECTS unknown modality', async () => {
    const p = new Session(baseDoc({ modality: 'pottery' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W685 behavioral — group + completion invariants', () => {
  it('REJECTS group format with groupSize 1', async () => {
    const p = new Session(baseDoc({ format: 'group', groupSize: 1 }));
    await expect(p.save()).rejects.toThrow(/groupSize/);
  });

  it('SAVES group format with groupSize 4', async () => {
    const doc = await Session.create(baseDoc({ format: 'group', groupSize: 4 }));
    expect(doc.groupSize).toBe(4);
  });

  it('REJECTS completed without engagementLevel', async () => {
    const p = new Session(baseDoc({ status: 'completed', responseNotes: 'engaged well' }));
    await expect(p.save()).rejects.toThrow(/engagementLevel/);
  });

  it('REJECTS completed without any notes', async () => {
    const p = new Session(baseDoc({ status: 'completed', engagementLevel: 'high' }));
    await expect(p.save()).rejects.toThrow(/progressNotes|responseNotes/);
  });

  it('SAVES completed with engagement + notes', async () => {
    const doc = await Session.create(
      baseDoc({
        status: 'completed',
        engagementLevel: 'high',
        responseNotes: 'تفاعل ممتاز مع الإيقاع',
      })
    );
    expect(doc.status).toBe('completed');
  });

  it('REJECTS cancelled without cancelReason', async () => {
    const p = new Session(baseDoc({ status: 'cancelled' }));
    await expect(p.save()).rejects.toThrow(/cancelReason/);
  });
});

describe('W685 behavioral — moodShift + moodImproved virtuals', () => {
  it('moodShift null when a mood is unset', async () => {
    const doc = await Session.create(baseDoc({ moodBefore: 'sad' }));
    expect(doc.moodShift).toBeNull();
    expect(doc.moodImproved).toBe(false);
  });

  it('moodImproved true when mood goes sad → happy', async () => {
    const doc = await Session.create(baseDoc({ moodBefore: 'sad', moodAfter: 'happy' }));
    expect(doc.moodShift).toBe(3); // happy(5) - sad(2)
    expect(doc.moodImproved).toBe(true);
  });

  it('moodImproved false when mood unchanged', async () => {
    const doc = await Session.create(baseDoc({ moodBefore: 'neutral', moodAfter: 'neutral' }));
    expect(doc.moodShift).toBe(0);
    expect(doc.moodImproved).toBe(false);
  });

  it('moodImproved false when mood declines', async () => {
    const doc = await Session.create(baseDoc({ moodBefore: 'content', moodAfter: 'anxious' }));
    expect(doc.moodShift).toBeLessThan(0);
    expect(doc.moodImproved).toBe(false);
  });
});

describe('W685 behavioral — indexes', () => {
  it('compound indexes exist for query patterns', async () => {
    const indexes = await Session.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('beneficiaryId+sessionDate');
    expect(keys).toContain('branchId+status');
    expect(keys).toContain('modality+sessionDate');
  });
});

'use strict';

/**
 * sensory-diet-behavioral-wave691.test.js — behavioral counterpart to the
 * W691 static drift guard. MongoMemoryServer-based.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Program;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w691-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  Program = require('../models/SensoryDietProgram');
  await Program.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Program.deleteMany({});
});

const activity = (o = {}) => ({
  name: 'Wall push-ups',
  sensorySystem: 'proprioceptive',
  purpose: 'calming',
  frequency: 'every 2h',
  ...o,
});

function baseDoc(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    activities: [activity()],
    ...overrides,
  };
}

describe('W691 behavioral — defaults + active invariant', () => {
  it('SAVES active program with an activity', async () => {
    const doc = await Program.create(baseDoc());
    expect(doc.status).toBe('active');
    expect(doc.isActive).toBe(true);
  });

  it('REJECTS active program with no activities', async () => {
    const p = new Program(baseDoc({ activities: [] }));
    await expect(p.save()).rejects.toThrow(/activities/);
  });

  it('REJECTS an activity with an invalid sensorySystem', async () => {
    const p = new Program(baseDoc({ activities: [activity({ sensorySystem: 'telepathic' })] }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS an activity with an invalid purpose', async () => {
    const p = new Program(baseDoc({ activities: [activity({ purpose: 'levitation' })] }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W691 behavioral — discontinue invariant', () => {
  it('REJECTS discontinued without reason', async () => {
    const p = new Program(baseDoc({ status: 'discontinued' }));
    await expect(p.save()).rejects.toThrow(/discontinueReason/);
  });

  it('SAVES discontinued with reason (activities not required when not active)', async () => {
    const doc = await Program.create(
      baseDoc({ status: 'discontinued', activities: [], discontinueReason: 'تغيّر الاحتياج' })
    );
    expect(doc.status).toBe('discontinued');
  });
});

describe('W691 behavioral — snoezelen session enum + regulatedSessionCount', () => {
  it('REJECTS a session with an invalid regulationOutcome', async () => {
    const p = new Program(
      baseDoc({ snoezelenSessions: [{ date: new Date(), regulationOutcome: 'transcended' }] })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('counts regulated + partially_regulated sessions', async () => {
    const doc = await Program.create(
      baseDoc({
        snoezelenSessions: [
          { date: new Date(), regulationOutcome: 'regulated' },
          { date: new Date(), regulationOutcome: 'partially_regulated' },
          { date: new Date(), regulationOutcome: 'escalated' },
        ],
      })
    );
    expect(doc.regulatedSessionCount).toBe(2);
  });
});

describe('W691 behavioral — isReviewOverdue virtual', () => {
  it('true when active + reviewDate in the past', async () => {
    const past = new Date(Date.now() - 86400000);
    const doc = await Program.create(baseDoc({ reviewDate: past }));
    expect(doc.isReviewOverdue).toBe(true);
  });

  it('false when reviewDate in the future', async () => {
    const future = new Date(Date.now() + 86400000);
    const doc = await Program.create(baseDoc({ reviewDate: future }));
    expect(doc.isReviewOverdue).toBe(false);
  });
});

describe('W691 behavioral — indexes', () => {
  it('compound indexes exist for query patterns', async () => {
    const indexes = await Program.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('beneficiaryId+status');
    expect(keys).toContain('branchId+status');
    expect(keys).toContain('status+reviewDate');
  });
});

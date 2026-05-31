'use strict';

/**
 * dtt-session-behavioral-wave689.test.js — behavioral counterpart to the
 * W689 static drift guard. MongoMemoryServer-based.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let DttSession;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w689-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  DttSession = require('../models/DttSession');
  await DttSession.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await DttSession.deleteMany({});
});

function baseDoc(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    programArea: 'communication',
    sessionDate: new Date(),
    ...overrides,
  };
}

const target = (overrides = {}) => ({
  targetName: 'Mand for "more"',
  curriculumRef: 'VB-MAPP Mand-5',
  trials: [
    { promptLevel: 'independent', response: 'correct' },
    { promptLevel: 'independent', response: 'correct' },
    { promptLevel: 'gestural', response: 'correct' },
    { promptLevel: 'full_physical', response: 'incorrect' },
  ],
  ...overrides,
});

describe('W689 behavioral — defaults + programArea', () => {
  it('SAVES scheduled session with defaults', async () => {
    const doc = await DttSession.create(baseDoc());
    expect(doc.programArea).toBe('communication');
    expect(doc.status).toBe('scheduled');
    expect(doc.totalTrials).toBe(0);
  });

  it('REJECTS unknown programArea', async () => {
    const p = new DttSession(baseDoc({ programArea: 'telepathy' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W689 behavioral — completion invariant', () => {
  it('REJECTS completed with no targets/trials', async () => {
    const p = new DttSession(baseDoc({ status: 'completed' }));
    await expect(p.save()).rejects.toThrow(/targets/);
  });

  it('SAVES completed with a target holding trials', async () => {
    const doc = await DttSession.create(baseDoc({ status: 'completed', targets: [target()] }));
    expect(doc.status).toBe('completed');
    expect(doc.totalTrials).toBe(4);
  });

  it('REJECTS cancelled without cancelReason', async () => {
    const p = new DttSession(baseDoc({ status: 'cancelled' }));
    await expect(p.save()).rejects.toThrow(/cancelReason/);
  });

  it('REJECTS a mastered target with no trials', async () => {
    const p = new DttSession(
      baseDoc({ targets: [{ targetName: 'X', masteryAchieved: true, trials: [] }] })
    );
    await expect(p.save()).rejects.toThrow(/target/);
  });
});

describe('W689 behavioral — trial enum enforcement', () => {
  it('REJECTS an invalid promptLevel in a trial', async () => {
    const p = new DttSession(
      baseDoc({
        targets: [
          { targetName: 'X', trials: [{ promptLevel: 'telekinesis', response: 'correct' }] },
        ],
      })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS an invalid response in a trial', async () => {
    const p = new DttSession(
      baseDoc({
        targets: [{ targetName: 'X', trials: [{ promptLevel: 'independent', response: 'maybe' }] }],
      })
    );
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W689 behavioral — independentCorrectRate virtual', () => {
  it('computes independent-correct / total across targets', async () => {
    // 2 independent-correct out of 4 trials = 50%
    const doc = await DttSession.create(baseDoc({ status: 'completed', targets: [target()] }));
    expect(doc.totalTrials).toBe(4);
    expect(doc.independentCorrectRate).toBe(50);
  });

  it('is null when there are no trials', async () => {
    const doc = await DttSession.create(baseDoc());
    expect(doc.independentCorrectRate).toBeNull();
  });

  it('counts only independent prompt level as the headline metric', async () => {
    const doc = await DttSession.create(
      baseDoc({
        status: 'completed',
        targets: [
          {
            targetName: 'all-prompted-correct',
            trials: [
              { promptLevel: 'gestural', response: 'correct' },
              { promptLevel: 'verbal', response: 'correct' },
            ],
          },
        ],
      })
    );
    // correct but never independent → 0%
    expect(doc.independentCorrectRate).toBe(0);
  });
});

describe('W689 behavioral — indexes', () => {
  it('compound indexes exist for query patterns', async () => {
    const indexes = await DttSession.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('beneficiaryId+sessionDate');
    expect(keys).toContain('branchId+status');
    expect(keys).toContain('programArea+sessionDate');
  });
});

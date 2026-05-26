'use strict';

/**
 * seizure-log-behavioral-wave356.test.js — behavioral counterpart to
 * `seizure-log-wave356.test.js` (static drift guard). MongoMemoryServer-based.
 *
 * Static guards check source-text shape; this asserts runtime behavior:
 *   1. Wave-18 invariants actually fire (type enum / endTime≥startTime /
 *      consciousness=lost⇒witness / injury⇒notes+parentNotified /
 *      ambulance⇒parentNotified / rescueMedName⇒rescueMedAt /
 *      status=reviewed⇒reviewer+reviewedAt)
 *   2. `isStatusEpilepticusCandidate` virtual fires correctly at ≥300s
 *      (ILAE 2015 status-epilepticus threshold)
 *   3. Defaults (status=recorded, severity=mild, consciousness=aware)
 *   4. Indexes (5 compound + per-field)
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let SeizureEvent;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w356-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  SeizureEvent = require('../models/SeizureEvent');
  await SeizureEvent.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await SeizureEvent.deleteMany({});
});

function baseDoc(overrides = {}) {
  const now = new Date();
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    date: now,
    startTime: now,
    type: 'tonic_clonic',
    ...overrides,
  };
}

describe('W356 behavioral — type enum + time invariants', () => {
  it('SAVES with valid type from TYPES enum', async () => {
    const doc = await SeizureEvent.create(baseDoc());
    expect(doc.type).toBe('tonic_clonic');
    expect(doc.status).toBe('recorded');
  });

  it('REJECTS unknown seizure type', async () => {
    const p = new SeizureEvent(baseDoc({ type: 'not_a_real_type' }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS endTime < startTime', async () => {
    const start = new Date();
    const end = new Date(start.getTime() - 1000);
    const p = new SeizureEvent(baseDoc({ startTime: start, endTime: end }));
    await expect(p.save()).rejects.toThrow(/endTime/);
  });

  it('SAVES with endTime >= startTime', async () => {
    const start = new Date();
    const end = new Date(start.getTime() + 60_000);
    const doc = await SeizureEvent.create(baseDoc({ startTime: start, endTime: end }));
    expect(doc.endTime.getTime()).toBeGreaterThanOrEqual(doc.startTime.getTime());
  });
});

describe('W356 behavioral — consciousness=lost requires witness', () => {
  it('REJECTS consciousness=lost without witness', async () => {
    const p = new SeizureEvent(baseDoc({ consciousness: 'lost' }));
    await expect(p.save()).rejects.toThrow(/witnessedBy/);
  });

  it('SAVES with witnessedByName free-text', async () => {
    const doc = await SeizureEvent.create(
      baseDoc({ consciousness: 'lost', witnessedByName: 'الممرضة سارة' })
    );
    expect(doc.consciousness).toBe('lost');
  });

  it('SAVES with witnessedBy ObjectId ref', async () => {
    const doc = await SeizureEvent.create(
      baseDoc({ consciousness: 'lost', witnessedBy: new mongoose.Types.ObjectId() })
    );
    expect(doc.witnessedBy).toBeDefined();
  });
});

describe('W356 behavioral — injury cascade', () => {
  it('REJECTS injury=true without notes', async () => {
    const p = new SeizureEvent(baseDoc({ injury: true, parentNotifiedAt: new Date() }));
    await expect(p.save()).rejects.toThrow(/injuryNotes/);
  });

  it('REJECTS injury=true without parentNotifiedAt', async () => {
    const p = new SeizureEvent(baseDoc({ injury: true, injuryNotes: 'minor bruise' }));
    await expect(p.save()).rejects.toThrow(/parentNotifiedAt/);
  });

  it('SAVES with injury=true + notes + parentNotifiedAt', async () => {
    const doc = await SeizureEvent.create(
      baseDoc({
        injury: true,
        injuryNotes: 'minor bruise on left arm',
        parentNotifiedAt: new Date(),
      })
    );
    expect(doc.injury).toBe(true);
  });
});

describe('W356 behavioral — ambulance + rescue medication cascade', () => {
  it('REJECTS ambulanceCalled=true without parentNotifiedAt', async () => {
    const p = new SeizureEvent(baseDoc({ ambulanceCalled: true }));
    await expect(p.save()).rejects.toThrow(/parentNotifiedAt/);
  });

  it('REJECTS rescueMedicationGivenName without rescueMedicationAt', async () => {
    const p = new SeizureEvent(baseDoc({ rescueMedicationGivenName: 'diazepam 10mg' }));
    await expect(p.save()).rejects.toThrow(/rescueMedicationAt/);
  });

  it('SAVES with full rescue-medication chain', async () => {
    const doc = await SeizureEvent.create(
      baseDoc({
        rescueMedicationGivenName: 'midazolam',
        rescueMedicationDose: '5mg buccal',
        rescueMedicationAt: new Date(),
      })
    );
    expect(doc.rescueMedicationGivenName).toBe('midazolam');
  });
});

describe('W356 behavioral — status=reviewed terminal', () => {
  it('REJECTS status=reviewed without reviewer', async () => {
    const p = new SeizureEvent(baseDoc({ status: 'reviewed', reviewedAt: new Date() }));
    await expect(p.save()).rejects.toThrow(/reviewedBy/);
  });

  it('REJECTS status=reviewed without reviewedAt', async () => {
    const p = new SeizureEvent(baseDoc({ status: 'reviewed', reviewedByName: 'د. خالد' }));
    await expect(p.save()).rejects.toThrow(/reviewedAt/);
  });

  it('SAVES with full reviewer chain', async () => {
    const doc = await SeizureEvent.create(
      baseDoc({
        status: 'reviewed',
        reviewedByName: 'د. خالد',
        reviewedAt: new Date(),
      })
    );
    expect(doc.status).toBe('reviewed');
  });
});

describe('W356 behavioral — isStatusEpilepticusCandidate virtual (ILAE 2015 ≥300s)', () => {
  it('returns false when durationSeconds null', async () => {
    const doc = await SeizureEvent.create(baseDoc());
    expect(doc.isStatusEpilepticusCandidate).toBe(false);
  });

  it('returns false at exactly 299 seconds', async () => {
    const doc = await SeizureEvent.create(baseDoc({ durationSeconds: 299 }));
    expect(doc.isStatusEpilepticusCandidate).toBe(false);
  });

  it('returns true at exactly 300 seconds (5-min threshold)', async () => {
    const doc = await SeizureEvent.create(baseDoc({ durationSeconds: 300 }));
    expect(doc.isStatusEpilepticusCandidate).toBe(true);
  });

  it('returns true at 600 seconds (clear status epilepticus)', async () => {
    const doc = await SeizureEvent.create(baseDoc({ durationSeconds: 600 }));
    expect(doc.isStatusEpilepticusCandidate).toBe(true);
  });
});

describe('W356 behavioral — defaults', () => {
  it('defaults status=recorded, severity=mild, consciousness=aware', async () => {
    const doc = await SeizureEvent.create(baseDoc());
    expect(doc.status).toBe('recorded');
    expect(doc.severity).toBe('mild');
    expect(doc.consciousness).toBe('aware');
    expect(doc.injury).toBe(false);
    expect(doc.ambulanceCalled).toBe(false);
  });
});

describe('W356 behavioral — indexes', () => {
  it('compound indexes exist for query patterns', async () => {
    const indexes = await SeizureEvent.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('beneficiaryId+startTime');
    expect(keys).toContain('branchId+date');
    expect(keys).toContain('status+date');
    expect(keys).toContain('injury+date');
    expect(keys).toContain('ambulanceCalled+date');
  });
});

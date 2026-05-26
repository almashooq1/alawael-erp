'use strict';

/**
 * adaptive-sports-behavioral-wave362.test.js — behavioral counterpart to
 * `adaptive-sports-wave362.test.js` (static drift guard). MongoMemoryServer-based.
 *
 * Validates Wave-18 invariants:
 *   - sport enum (19 sports), physicalDemand enum
 *   - status=active ⇒ startDate
 *   - status=completed ⇒ endDate
 *   - status=discontinued ⇒ discontinuationReason
 *   - endDate >= startDate
 *   - physicalDemand=high + status!=draft ⇒ medicalClearance=true
 *   - sessions[] ⇒ date + durationMinutes
 *   - achievements[] ⇒ title + earnedAt
 *
 * Plus `sessionCount` virtual (if present).
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let AdaptiveSportsProgram;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w362-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  AdaptiveSportsProgram = require('../models/AdaptiveSportsProgram');
  await AdaptiveSportsProgram.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await AdaptiveSportsProgram.deleteMany({});
});

function baseDoc(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    sport: 'wheelchair_basketball',
    category: 'team',
    ...overrides,
  };
}

describe('W362 behavioral — sport + physicalDemand enums', () => {
  it('SAVES with valid sport from 19-sport catalog', async () => {
    const doc = await AdaptiveSportsProgram.create(baseDoc());
    expect(doc.status).toBe('draft');
  });

  it('REJECTS invalid sport', async () => {
    const p = new AdaptiveSportsProgram(baseDoc({ sport: 'not_a_sport' }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS invalid physicalDemand', async () => {
    const p = new AdaptiveSportsProgram(baseDoc({ physicalDemand: 'extreme' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W362 behavioral — status lifecycle invariants', () => {
  it('REJECTS active without startDate', async () => {
    const p = new AdaptiveSportsProgram(baseDoc({ status: 'active' }));
    await expect(p.save()).rejects.toThrow(/startDate/);
  });

  it('SAVES active with startDate', async () => {
    const doc = await AdaptiveSportsProgram.create(
      baseDoc({ status: 'active', startDate: new Date() })
    );
    expect(doc.status).toBe('active');
  });

  it('REJECTS completed without endDate', async () => {
    const p = new AdaptiveSportsProgram(
      baseDoc({ status: 'completed', startDate: new Date(Date.now() - 86400 * 1000) })
    );
    await expect(p.save()).rejects.toThrow(/endDate/);
  });

  it('REJECTS endDate < startDate', async () => {
    const start = new Date();
    const p = new AdaptiveSportsProgram(
      baseDoc({
        status: 'completed',
        startDate: start,
        endDate: new Date(start.getTime() - 86400 * 1000),
      })
    );
    await expect(p.save()).rejects.toThrow(/endDate/);
  });

  it('REJECTS discontinued without reason', async () => {
    const p = new AdaptiveSportsProgram(baseDoc({ status: 'discontinued' }));
    await expect(p.save()).rejects.toThrow(/discontinuationReason/);
  });

  it('SAVES discontinued with reason', async () => {
    const doc = await AdaptiveSportsProgram.create(
      baseDoc({
        status: 'discontinued',
        discontinuationReason: 'beneficiary moved branches',
      })
    );
    expect(doc.status).toBe('discontinued');
  });
});

describe('W362 behavioral — high-demand sports require medical clearance', () => {
  it('REJECTS physicalDemand=high + status=active without medicalClearance', async () => {
    const p = new AdaptiveSportsProgram(
      baseDoc({
        sport: 'wheelchair_rugby',
        physicalDemand: 'high',
        status: 'active',
        startDate: new Date(),
      })
    );
    await expect(p.save()).rejects.toThrow(/medicalClearance/);
  });

  it('SAVES high-demand with medicalClearance=true', async () => {
    const doc = await AdaptiveSportsProgram.create(
      baseDoc({
        sport: 'wheelchair_rugby',
        physicalDemand: 'high',
        status: 'active',
        startDate: new Date(),
        medicalClearance: true,
        medicalClearanceBy: 'د. أحمد',
        medicalClearanceAt: new Date(),
      })
    );
    expect(doc.medicalClearance).toBe(true);
  });

  it('ALLOWS high-demand draft without clearance (not required until active)', async () => {
    const doc = await AdaptiveSportsProgram.create(
      baseDoc({ sport: 'wheelchair_rugby', physicalDemand: 'high', status: 'draft' })
    );
    expect(doc.status).toBe('draft');
  });
});

describe('W362 behavioral — sessions[] + achievements[] integrity', () => {
  it('REJECTS session without date', async () => {
    const p = new AdaptiveSportsProgram(
      baseDoc({ sessions: [{ durationMinutes: 60, sessionType: 'training' }] })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS session without durationMinutes', async () => {
    const p = new AdaptiveSportsProgram(
      baseDoc({ sessions: [{ date: new Date(), sessionType: 'training' }] })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES with valid session entries', async () => {
    const doc = await AdaptiveSportsProgram.create(
      baseDoc({
        sessions: [
          { date: new Date(), durationMinutes: 60, sessionType: 'training', attended: true },
        ],
      })
    );
    expect(doc.sessions).toHaveLength(1);
  });

  it('REJECTS achievement without title', async () => {
    const p = new AdaptiveSportsProgram(baseDoc({ achievements: [{ earnedAt: new Date() }] }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS achievement without earnedAt', async () => {
    const p = new AdaptiveSportsProgram(baseDoc({ achievements: [{ title: 'First medal' }] }));
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES with valid achievement', async () => {
    const doc = await AdaptiveSportsProgram.create(
      baseDoc({
        achievements: [
          {
            title: 'First branch tournament medal',
            earnedAt: new Date(),
            description: 'Silver medal in inter-branch tournament',
          },
        ],
      })
    );
    expect(doc.achievements).toHaveLength(1);
  });
});

describe('W362 behavioral — defaults', () => {
  it('defaults status=draft, category=individual, physicalDemand=moderate', async () => {
    const doc = await AdaptiveSportsProgram.create(baseDoc({ category: undefined }));
    expect(doc.status).toBe('draft');
    expect(doc.category).toBe('individual');
    expect(doc.physicalDemand).toBe('moderate');
    expect(doc.familyConsent).toBe(false);
    expect(doc.medicalClearance).toBe(false);
  });
});

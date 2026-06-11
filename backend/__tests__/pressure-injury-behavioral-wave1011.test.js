'use strict';

/**
 * pressure-injury-behavioral-wave1011.test.js — behavioral counterpart to
 * `pressure-injury-wave1011.test.js` (static drift guard).
 * MongoMemoryServer-based: real documents, real .create()/.save(),
 * asserts Wave-18 invariants actually fire + virtuals compute on
 * persisted docs + computeBradenRisk bands deterministically.
 *
 * Validates:
 *   - bodySite/stage/origin/status enum gating
 *   - bodySite=other ⇒ bodySiteOther
 *   - status=active ⇒ ≥1 offloadingOrders
 *   - infectionSigns ⇒ infectionAction
 *   - status∈{healed,closed} ⇒ healedAt
 *   - nextReviewDue ≥ date
 *   - computeBradenRisk bands (severe/high/moderate/mild/not_at_risk)
 *   - areaCm2 / isFacilityAcquired / isReassessmentOverdue virtuals
 *   - round-trip persistence incl. the reassessments[] trajectory
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let PressureInjuryRecord;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1011-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  PressureInjuryRecord = require('../models/PressureInjuryRecord');
  await PressureInjuryRecord.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await PressureInjuryRecord.deleteMany({});
});

function baseDoc(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    date: new Date('2026-06-01T08:00:00Z'),
    bodySite: 'sacrum',
    stage: 'stage_2',
    origin: 'facility_acquired',
    status: 'active',
    offloadingOrders: ['repositioning_2hourly'],
    ...overrides,
  };
}

describe('W1011 behavioral — base save + enum gating', () => {
  it('SAVES a minimal active stage-2 sacral injury', async () => {
    const doc = await PressureInjuryRecord.create(baseDoc());
    expect(doc.status).toBe('active');
    expect(doc.stage).toBe('stage_2');
  });

  it('REJECTS an invalid bodySite', async () => {
    await expect(PressureInjuryRecord.create(baseDoc({ bodySite: 'nose' }))).rejects.toThrow(
      /bodySite/
    );
  });

  it('REJECTS an invalid stage', async () => {
    await expect(PressureInjuryRecord.create(baseDoc({ stage: 'stage_9' }))).rejects.toThrow(
      /stage/
    );
  });

  it('REJECTS an invalid origin', async () => {
    await expect(PressureInjuryRecord.create(baseDoc({ origin: 'aliens' }))).rejects.toThrow(
      /origin/
    );
  });

  it('REJECTS bodySite=other with no bodySiteOther', async () => {
    await expect(PressureInjuryRecord.create(baseDoc({ bodySite: 'other' }))).rejects.toThrow(
      /bodySiteOther/
    );
  });
});

describe('W1011 behavioral — clinical safety invariants', () => {
  it('REJECTS an active injury with no offloading order', async () => {
    await expect(PressureInjuryRecord.create(baseDoc({ offloadingOrders: [] }))).rejects.toThrow(
      /offloadingOrders/
    );
  });

  it('REJECTS infectionSigns with no infectionAction', async () => {
    await expect(PressureInjuryRecord.create(baseDoc({ infectionSigns: true }))).rejects.toThrow(
      /infectionAction/
    );
  });

  it('SAVES infectionSigns when an action is documented', async () => {
    const doc = await PressureInjuryRecord.create(
      baseDoc({ infectionSigns: true, infectionAction: 'swab + physician referral' })
    );
    expect(doc.infectionSigns).toBe(true);
  });

  it('REJECTS healed status with no healedAt', async () => {
    await expect(PressureInjuryRecord.create(baseDoc({ status: 'healed' }))).rejects.toThrow(
      /healedAt/
    );
  });

  it('REJECTS bradenScore out of range', async () => {
    await expect(PressureInjuryRecord.create(baseDoc({ bradenScore: 30 }))).rejects.toThrow(
      /braden/i
    );
  });

  it('REJECTS nextReviewDue earlier than date', async () => {
    await expect(
      PressureInjuryRecord.create(
        baseDoc({ date: new Date('2026-06-01'), nextReviewDue: new Date('2026-05-01') })
      )
    ).rejects.toThrow(/nextReviewDue/);
  });
});

describe('W1011 behavioral — computeBradenRisk bands', () => {
  it('maps the 5 Braden bands', () => {
    expect(PressureInjuryRecord.computeBradenRisk(9)).toBe('severe');
    expect(PressureInjuryRecord.computeBradenRisk(12)).toBe('high');
    expect(PressureInjuryRecord.computeBradenRisk(14)).toBe('moderate');
    expect(PressureInjuryRecord.computeBradenRisk(18)).toBe('mild');
    expect(PressureInjuryRecord.computeBradenRisk(23)).toBe('not_at_risk');
  });

  it('returns null for a non-numeric score', () => {
    expect(PressureInjuryRecord.computeBradenRisk(undefined)).toBeNull();
  });
});

describe('W1011 behavioral — virtuals + round-trip persistence', () => {
  it('areaCm2 computes length × width', async () => {
    const doc = await PressureInjuryRecord.create(baseDoc({ lengthCm: 4, widthCm: 3 }));
    expect(doc.areaCm2).toBe(12);
  });

  it('isFacilityAcquired true for a HAPI', async () => {
    const doc = await PressureInjuryRecord.create(baseDoc({ origin: 'facility_acquired' }));
    expect(doc.isFacilityAcquired).toBe(true);
  });

  it('isReassessmentOverdue true for an open injury past review date', async () => {
    const doc = await PressureInjuryRecord.create(
      baseDoc({ date: new Date('2019-12-01'), nextReviewDue: new Date('2020-01-01') })
    );
    const reloaded = await PressureInjuryRecord.findById(doc._id);
    expect(reloaded.isReassessmentOverdue).toBe(true);
  });

  it('round-trips a reassessment trajectory', async () => {
    const doc = await PressureInjuryRecord.create(baseDoc({ lengthCm: 5, widthCm: 4 }));
    doc.reassessments.push({
      date: new Date('2026-06-10'),
      stage: 'stage_2',
      lengthCm: 3,
      widthCm: 2,
      status: 'healing',
      note: 'granulating well',
      byName: 'ممرضة الجروح',
    });
    doc.status = 'healing';
    doc.lengthCm = 3;
    doc.widthCm = 2;
    await doc.save();
    const reloaded = await PressureInjuryRecord.findById(doc._id).lean();
    expect(reloaded.reassessments).toHaveLength(1);
    expect(reloaded.reassessments[0].status).toBe('healing');
    expect(reloaded.status).toBe('healing');
    expect(reloaded.lengthCm).toBe(3);
  });
});

'use strict';

/**
 * audiology-screening-behavioral-wave722.test.js — behavioral counterpart to
 * the W722 static drift guard. MongoMemoryServer-based: actually persists docs
 * and asserts the Wave-18 invariants fire, virtuals compute, defaults round-trip.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let AS;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w722-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  AS = require('../models/AudiologyScreening');
  await AS.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await AS.deleteMany({});
});

function baseDoc(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    date: new Date(),
    screeningMethod: 'play_audiometry',
    ...overrides,
  };
}

describe('W722 behavioral — defaults + method', () => {
  it('SAVES a draft screen with defaults', async () => {
    const doc = await AS.create(baseDoc());
    expect(doc.status).toBe('draft');
    expect(doc.outcome).toBe('monitor');
    expect(doc.hearingLossType).toBe('unknown');
    expect(doc.needsReferral).toBe(false);
    expect(doc.riskIndicatorCount).toBe(0);
    expect(doc.worseEarLevel).toBeNull();
  });
  it('REJECTS an unknown screeningMethod', async () => {
    const p = new AS(baseDoc({ screeningMethod: 'telepathy' }));
    await expect(p.save()).rejects.toThrow();
  });
  it('REJECTS an out-of-set per-ear level', async () => {
    const p = new AS(baseDoc({ levelRight: 'a_bit_deaf' }));
    await expect(p.save()).rejects.toThrow(/levelRight/);
  });
  it('REJECTS an out-of-set tympanometry trace', async () => {
    const p = new AS(baseDoc({ tympanometryLeft: 'Z' }));
    await expect(p.save()).rejects.toThrow(/tympanometryLeft/);
  });
});

describe('W722 behavioral — referral / amplification / risk gates', () => {
  it('REJECTS outcome=refer with no referralReason', async () => {
    const p = new AS(baseDoc({ outcome: 'refer' }));
    await expect(p.save()).rejects.toThrow(/referralReason/);
  });
  it('SAVES outcome=refer WITH a reason (+needsReferral virtual)', async () => {
    const doc = await AS.create(
      baseDoc({ outcome: 'refer', referralReason: 'flat tymp + no OAE', referralTo: 'ENT' })
    );
    expect(doc.needsReferral).toBe(true);
  });
  it('REJECTS amplificationRecommended with no detail', async () => {
    const p = new AS(baseDoc({ amplificationRecommended: true }));
    await expect(p.save()).rejects.toThrow(/amplificationDetail/);
  });
  it('REJECTS riskIndicatorsPresent with empty indicators', async () => {
    const p = new AS(baseDoc({ riskIndicatorsPresent: true }));
    await expect(p.save()).rejects.toThrow(/riskIndicators/);
  });
  it('REJECTS an out-of-set risk indicator', async () => {
    const p = new AS(
      baseDoc({ riskIndicatorsPresent: true, riskIndicators: ['hates_loud_music'] })
    );
    await expect(p.save()).rejects.toThrow(/riskIndicators/);
  });
  it('SAVES risk cluster + computes riskIndicatorCount', async () => {
    const doc = await AS.create(
      baseDoc({
        riskIndicatorsPresent: true,
        riskIndicators: ['family_history_of_hearing_loss', 'frequent_ear_infections'],
      })
    );
    expect(doc.riskIndicatorCount).toBe(2);
  });
});

describe('W722 behavioral — finalize gate', () => {
  it('REJECTS finalized without a screener', async () => {
    const p = new AS(baseDoc({ status: 'finalized', screenedAt: new Date() }));
    await expect(p.save()).rejects.toThrow(/screener|screenedBy/);
  });
  it('REJECTS finalized without screenedAt', async () => {
    const p = new AS(baseDoc({ status: 'finalized', screenedByName: 'Dr Hana' }));
    await expect(p.save()).rejects.toThrow(/screenedAt/);
  });
  it('SAVES finalized with screener + screenedAt', async () => {
    const doc = await AS.create(
      baseDoc({ status: 'finalized', screenedByName: 'Dr Hana', screenedAt: new Date() })
    );
    expect(doc.status).toBe('finalized');
  });
});

describe('W722 behavioral — worseEarLevel virtual', () => {
  it('picks the worse of the two measured ears', async () => {
    const doc = await AS.create(baseDoc({ levelRight: 'mild_26_40', levelLeft: 'severe_71_90' }));
    expect(doc.worseEarLevel).toBe('severe_71_90');
  });
  it('reassessmentDue before date is REJECTED', async () => {
    const p = new AS(
      baseDoc({ date: new Date('2026-06-01'), reassessmentDue: new Date('2026-05-01') })
    );
    await expect(p.save()).rejects.toThrow(/reassessmentDue/);
  });
});

describe('W722 behavioral — indexes', () => {
  it('compound indexes exist', async () => {
    const indexes = await AS.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('beneficiaryId+date');
    expect(keys).toContain('branchId+date');
    expect(keys).toContain('outcome+date');
    expect(keys).toContain('status+date');
  });
});

'use strict';

/**
 * orientation-mobility-behavioral-wave1021.test.js — behavioral counterpart
 * to `orientation-mobility-wave1021.test.js` (static drift guard).
 * MongoMemoryServer-based: real docs, real .create()/.save(), asserts
 * Wave-18 invariants fire + computeIndependence bands deterministically +
 * virtuals compute + round-trip persistence.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let OM;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1021-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  OM = require('../models/OrientationMobilityAssessment');
  await OM.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await OM.deleteMany({});
});

function baseDoc(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    date: new Date('2026-06-01T08:00:00Z'),
    visionStatus: 'blind',
    primaryMobilityAid: 'long_cane',
    independenceLevel: 'independent',
    independenceScore: 80,
    ...overrides,
  };
}

describe('W1021 behavioral — base save + enum gating', () => {
  it('SAVES a minimal independent draft', async () => {
    const doc = await OM.create(baseDoc());
    expect(doc.status).toBe('draft');
    expect(doc.independenceLevel).toBe('independent');
  });

  it('REJECTS an invalid visionStatus', async () => {
    await expect(OM.create(baseDoc({ visionStatus: 'perfect' }))).rejects.toThrow(/visionStatus/);
  });

  it('REJECTS an invalid primaryMobilityAid', async () => {
    await expect(OM.create(baseDoc({ primaryMobilityAid: 'jetpack' }))).rejects.toThrow(
      /primaryMobilityAid/
    );
  });

  it('REJECTS an invalid independenceLevel', async () => {
    await expect(OM.create(baseDoc({ independenceLevel: 'superhuman' }))).rejects.toThrow(
      /independenceLevel/
    );
  });
});

describe('W1021 behavioral — low independence requires a training plan', () => {
  it('REJECTS dependent with no training goal', async () => {
    await expect(
      OM.create(baseDoc({ independenceLevel: 'dependent', independenceScore: 10 }))
    ).rejects.toThrow(/trainingGoals/);
  });

  it('REJECTS emerging with no training goal', async () => {
    await expect(
      OM.create(baseDoc({ independenceLevel: 'emerging', independenceScore: 30 }))
    ).rejects.toThrow(/trainingGoals/);
  });

  it('SAVES dependent with a training goal', async () => {
    const doc = await OM.create(
      baseDoc({
        independenceLevel: 'dependent',
        independenceScore: 10,
        trainingGoals: ['cane_skills_indoor', 'sensory_training'],
      })
    );
    expect(doc.trainingGoals).toHaveLength(2);
  });

  it('SAVES developing with no goal (above the gate)', async () => {
    const doc = await OM.create(baseDoc({ independenceLevel: 'developing', independenceScore: 60 }));
    expect(doc.independenceLevel).toBe('developing');
  });
});

describe('W1021 behavioral — finalize gating + date sanity', () => {
  it('REJECTS finalized with no finalizer', async () => {
    await expect(
      OM.create(baseDoc({ status: 'finalized', finalizedAt: new Date() }))
    ).rejects.toThrow(/finalizedBy/);
  });

  it('REJECTS nextReviewDue earlier than date', async () => {
    await expect(
      OM.create(baseDoc({ nextReviewDue: new Date('2026-05-01'), date: new Date('2026-06-01') }))
    ).rejects.toThrow(/nextReviewDue/);
  });

  it('SAVES a finalized assessment with finalizer + time', async () => {
    const doc = await OM.create(
      baseDoc({
        status: 'finalized',
        finalizedByName: 'أخصائي التوجّه',
        finalizedAt: new Date('2026-06-01T09:00:00Z'),
      })
    );
    expect(doc.status).toBe('finalized');
  });
});

describe('W1021 behavioral — computeIndependence banding', () => {
  it('no assessed domains → dependent/0', () => {
    expect(OM.computeIndependence({})).toEqual({ score: 0, level: 'dependent' });
  });

  it('all domains independent → 100/independent', () => {
    const d = {};
    for (const dom of OM.DOMAINS) d[dom] = 'independent';
    expect(OM.computeIndependence(d)).toEqual({ score: 100, level: 'independent' });
  });

  it('one independent + one dependent → 50/developing', () => {
    const r = OM.computeIndependence({ sensoryAwareness: 'independent', spatialConcepts: 'dependent' });
    expect(r.score).toBe(50);
    expect(r.level).toBe('developing');
  });

  it('a single emerging domain → 33/emerging', () => {
    const r = OM.computeIndependence({ sensoryAwareness: 'emerging' });
    expect(r.score).toBe(33);
    expect(r.level).toBe('emerging');
  });

  it("'not_assessed' domains are skipped from the average", () => {
    const r = OM.computeIndependence({ sensoryAwareness: 'independent', spatialConcepts: 'not_assessed' });
    expect(r.score).toBe(100);
    expect(r.level).toBe('independent');
  });
});

describe('W1021 behavioral — virtuals + round-trip persistence', () => {
  it('isIndependent true at independent level', async () => {
    const doc = await OM.create(baseDoc());
    expect(doc.isIndependent).toBe(true);
  });

  it('isReassessmentOverdue true for finalized + past due', async () => {
    const doc = await OM.create(
      baseDoc({
        date: new Date('2019-12-01'),
        independenceLevel: 'dependent',
        independenceScore: 10,
        trainingGoals: ['cane_skills_indoor'],
        nextReviewDue: new Date('2020-01-01'),
        status: 'finalized',
        finalizedByName: 'أخصائي التوجّه',
        finalizedAt: new Date('2019-12-01'),
      })
    );
    const reloaded = await OM.findById(doc._id);
    expect(reloaded.isReassessmentOverdue).toBe(true);
  });

  it('round-trips the domain profile + computed result', async () => {
    const domains = {
      sensoryAwareness: 'independent',
      spatialConcepts: 'developing',
      caneSkills: 'emerging',
    };
    const computed = OM.computeIndependence(domains);
    const doc = await OM.create(
      baseDoc({
        ...domains,
        independenceScore: computed.score,
        independenceLevel: computed.level,
        trainingGoals: computed.level === 'dependent' || computed.level === 'emerging' ? ['cane_skills_indoor'] : [],
      })
    );
    const reloaded = await OM.findById(doc._id).lean();
    expect(reloaded.sensoryAwareness).toBe('independent');
    expect(reloaded.caneSkills).toBe('emerging');
    expect(reloaded.independenceScore).toBe(computed.score);
    expect(reloaded.independenceLevel).toBe(computed.level);
  });
});

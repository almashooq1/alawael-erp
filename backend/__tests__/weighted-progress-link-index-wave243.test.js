'use strict';

/**
 * weighted-progress-link-index-wave243.test.js — Wave 243.
 *
 * Verifies the W243 enrichment: weightedProgress breakdown now carries
 * a `linkIndex` field pointing into the goal's un-filtered measureLinks[]
 * array. This lets the UI call reviewLink/unlinkLink with the correct
 * slot index when the filtered breakdown order doesn't match raw order.
 *
 * Specifically tested:
 *   - Pure rules.weightedProgress passes through `_origIndex` as
 *     `linkIndex` on breakdown entries.
 *   - Legacy callers (no `_origIndex` on input) get `linkIndex: null`
 *     (back-compat — no breakage to anyone who depended on the old shape).
 *   - Service-level computeWeightedProgress correctly attaches origIndex
 *     when one of the goal's measureLinks is unlinked (so the filtered
 *     index would differ from raw).
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Measure;
let TherapeuticGoal;
let rules;
let linkage;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w243-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ TherapeuticGoal } = require('../domains/goals/models/TherapeuticGoal'));
  rules = require('../measures/linkage/rules');
  linkage = require('../services/goalMeasureLinkage.service');
  await Measure.init();
  await TherapeuticGoal.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Measure.deleteMany({});
  await TherapeuticGoal.deleteMany({});
});

async function seedMeasure({ code = 'BERG' } = {}) {
  return Measure.create({
    code,
    name: code,
    category: 'motor',
    version: '1.0.0',
    purpose: 'outcome',
    rawShape: 'items_array',
    derivedType: 'sum',
    interpretationStyle: 'tier',
    scoringAlgorithmRef: `scoring/${code.toLowerCase()}.js`,
    scoringEngineVersion: '1.0.0',
    status: 'active',
    administrationTime: 20,
    administeredBy: ['physical_therapist'],
    ageRange: { min: 5, max: 95, unit: 'years' },
    minScore: 0,
    maxScore: 56,
    scoringDirection: 'higher_better',
    reassessment: { standardIntervalDays: 90 },
    interpretation: {
      mcid: { value: 4, type: 'absolute', status: 'established', source: 'cite' },
    },
    targetPopulation: ['all'],
  });
}

describe('W243 — pure rules pass-through', () => {
  test('breakdown carries _origIndex as linkIndex', () => {
    const links = [
      { measureId: 'a', measureCode: 'A', linkType: 'PRIMARY', weight: 0.6, _origIndex: 0 },
      { measureId: 'b', measureCode: 'B', linkType: 'SECONDARY', weight: 0.4, _origIndex: 2 },
    ];
    const interps = new Map([
      ['a', { category: 'SUSTAINED_IMPROVEMENT' }],
      ['b', { category: 'SLOW_PROGRESS' }],
    ]);
    const r = rules.weightedProgress(links, interps);
    expect(r.breakdown[0].linkIndex).toBe(0);
    expect(r.breakdown[1].linkIndex).toBe(2);
  });

  test('legacy callers (no _origIndex) get linkIndex: null', () => {
    const links = [{ measureId: 'a', measureCode: 'A', linkType: 'PRIMARY', weight: 1 }];
    const interps = new Map([['a', { category: 'SUSTAINED_IMPROVEMENT' }]]);
    const r = rules.weightedProgress(links, interps);
    expect(r.breakdown[0].linkIndex).toBeNull();
  });
});

describe('W243 — service-level enrichment', () => {
  test('computeWeightedProgress preserves origIndex around unlinked slot', async () => {
    // Goal with 3 measureLinks: PRIMARY @0, unlinked @1, SECONDARY @2.
    // Filtered contributing = [PRIMARY, SECONDARY]. UI needs linkIndex
    // 0 and 2 (not 0 and 1).
    const mP = await seedMeasure({ code: 'PRIM' });
    const mU = await seedMeasure({ code: 'UNLNK' });
    const mS = await seedMeasure({ code: 'SEC' });
    const benId = new mongoose.Types.ObjectId();
    const linker = new mongoose.Types.ObjectId();

    const goal = await TherapeuticGoal.create({
      beneficiaryId: benId,
      episodeId: new mongoose.Types.ObjectId(),
      title: 'g',
      type: 'short_term',
      startDate: new Date(),
      target: { value: 40 },
      baseline: { value: 20, date: new Date() },
      status: 'active',
      objectives: [
        {
          title: 'o',
          measureLinks: [
            {
              measureId: mP._id,
              measureCode: 'PRIM',
              linkType: 'PRIMARY',
              weight: 0.6,
              linkRationale: 'primary measure rationale',
              interventionRefs: ['X'],
              status: 'active',
              linkedBy: linker,
            },
            {
              measureId: mU._id,
              measureCode: 'UNLNK',
              linkType: 'SECONDARY',
              weight: 0,
              linkRationale: 'historically attached, now retired',
              interventionRefs: ['X'],
              status: 'unlinked',
              unlinkReason: 'measure deprecated',
              unlinkedAt: new Date(),
              unlinkedBy: new mongoose.Types.ObjectId(),
              linkedBy: linker,
            },
            {
              measureId: mS._id,
              measureCode: 'SEC',
              linkType: 'SECONDARY',
              weight: 0.4,
              linkRationale: 'secondary supports primary',
              interventionRefs: ['X'],
              status: 'active',
              linkedBy: linker,
            },
          ],
        },
      ],
    });

    const out = await linkage.computeWeightedProgress({
      goalId: goal._id,
      interpretations: new Map([
        [String(mP._id), { category: 'SUSTAINED_IMPROVEMENT' }],
        [String(mS._id), { category: 'SLOW_PROGRESS' }],
      ]),
    });

    expect(out.objectives.length).toBe(1);
    expect(out.objectives[0].breakdown.length).toBe(2);
    const primary = out.objectives[0].breakdown.find(b => b.measureCode === 'PRIM');
    const secondary = out.objectives[0].breakdown.find(b => b.measureCode === 'SEC');
    expect(primary.linkIndex).toBe(0);
    expect(secondary.linkIndex).toBe(2); // skipped over unlinked slot @1
  });
});

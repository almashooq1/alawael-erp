'use strict';

/**
 * progress-history-wave248.test.js — Wave 248.
 *
 * Verifies the W248 progress-history pipeline:
 *
 *   - W216 measureGoalUpdater pushes currentProgressSnapshot on each
 *     progressHistory entry (per W248 enrichment).
 *   - linkage.progressHistory({goalId}) returns sorted time series
 *     with goalId/title/currentProgress + history[] entries each
 *     carrying date/value/rating/currentProgressSnapshot/notes.
 *   - Legacy entries (without snapshot) return snapshot=null —
 *     back-compat for goals seeded before W248.
 *   - Empty progressHistory returns empty `history: []`.
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
let goalUpdater;
let linkage;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w248-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ TherapeuticGoal } = require('../domains/goals/models/TherapeuticGoal'));
  goalUpdater = require('../services/measureGoalUpdater.service');
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

async function seedMeasure() {
  return Measure.create({
    code: 'BERG',
    name: 'BERG',
    category: 'motor',
    version: '1.0.0',
    purpose: 'outcome',
    rawShape: 'items_array',
    derivedType: 'sum',
    interpretationStyle: 'tier',
    scoringAlgorithmRef: 'scoring/berg.js',
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

async function seedGoal({ benId, measureId, baseline = 20, target = 40 }) {
  return TherapeuticGoal.create({
    beneficiaryId: benId,
    episodeId: new mongoose.Types.ObjectId(),
    title: 'Improve balance',
    type: 'short_term',
    startDate: new Date(),
    baseline: { value: baseline, date: new Date() },
    target: { value: target },
    status: 'active',
    objectives: [{ title: 'o', measureId }],
  });
}

describe('W248 — measureGoalUpdater currentProgressSnapshot', () => {
  test('progressHistory entry includes currentProgressSnapshot', async () => {
    const benId = new mongoose.Types.ObjectId();
    const m = await seedMeasure();
    const goal = await seedGoal({ benId, measureId: m._id });
    await goalUpdater.updateGoalsForAdmin({
      beneficiaryId: benId,
      measureId: m._id,
      totalRawScore: 30, // halfway = 50%
    });
    const after = await TherapeuticGoal.findById(goal._id).lean();
    expect(after.progressHistory.length).toBe(1);
    expect(after.progressHistory[0].value).toBe(30);
    expect(after.progressHistory[0].currentProgressSnapshot).toBe(50);
    expect(after.currentProgress).toBe(50);
  });
});

describe('W248 — linkage.progressHistory', () => {
  test('returns sorted time series with snapshot per entry', async () => {
    const benId = new mongoose.Types.ObjectId();
    const m = await seedMeasure();
    const goal = await seedGoal({ benId, measureId: m._id });

    // Three admins out-of-order to test sort
    await goalUpdater.updateGoalsForAdmin({
      beneficiaryId: benId,
      measureId: m._id,
      totalRawScore: 25,
      applicationDate: new Date('2026-03-01'),
    });
    await goalUpdater.updateGoalsForAdmin({
      beneficiaryId: benId,
      measureId: m._id,
      totalRawScore: 35,
      applicationDate: new Date('2026-05-01'),
    });
    await goalUpdater.updateGoalsForAdmin({
      beneficiaryId: benId,
      measureId: m._id,
      totalRawScore: 30,
      applicationDate: new Date('2026-04-01'),
    });

    const out = await linkage.progressHistory({ goalId: goal._id });
    expect(out.goalId).toBe(String(goal._id));
    expect(out.title).toBe('Improve balance');
    expect(out.history.length).toBe(3);
    // Sorted ascending by date
    expect(new Date(out.history[0].date).getUTCMonth()).toBe(2); // March
    expect(new Date(out.history[1].date).getUTCMonth()).toBe(3); // April
    expect(new Date(out.history[2].date).getUTCMonth()).toBe(4); // May
    // Snapshots: 25 → 25%, 30 → 50%, 35 → 75%
    expect(out.history[0].currentProgressSnapshot).toBe(25);
    expect(out.history[1].currentProgressSnapshot).toBe(50);
    expect(out.history[2].currentProgressSnapshot).toBe(75);
  });

  test('legacy entry without snapshot returns null', async () => {
    const benId = new mongoose.Types.ObjectId();
    const m = await seedMeasure();
    const goal = await TherapeuticGoal.create({
      beneficiaryId: benId,
      episodeId: new mongoose.Types.ObjectId(),
      title: 'Legacy goal',
      type: 'short_term',
      startDate: new Date(),
      baseline: { value: 20, date: new Date() },
      target: { value: 40 },
      status: 'active',
      objectives: [{ title: 'o', measureId: m._id }],
      progressHistory: [
        // legacy entry — no currentProgressSnapshot field
        {
          date: new Date('2026-02-01'),
          value: 28,
          rating: 'emerging',
        },
      ],
    });
    const out = await linkage.progressHistory({ goalId: goal._id });
    expect(out.history.length).toBe(1);
    expect(out.history[0].value).toBe(28);
    expect(out.history[0].currentProgressSnapshot).toBeNull();
  });

  test('empty progressHistory returns empty history array', async () => {
    const benId = new mongoose.Types.ObjectId();
    const m = await seedMeasure();
    const goal = await seedGoal({ benId, measureId: m._id });
    const out = await linkage.progressHistory({ goalId: goal._id });
    expect(out.history).toEqual([]);
  });

  test('goalId not found throws', async () => {
    await expect(
      linkage.progressHistory({ goalId: new mongoose.Types.ObjectId() })
    ).rejects.toThrow(/not found/);
  });

  test('goalId required', async () => {
    await expect(linkage.progressHistory({})).rejects.toThrow(/goalId required/);
  });
});

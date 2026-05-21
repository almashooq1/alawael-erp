'use strict';

/**
 * review-link-expected-target-wave247.test.js — Wave 247.
 *
 * Verifies reviewLink's optional `expectedTarget` payload (W247):
 *
 *   - verdict='modify_target' + expectedTarget present → link.expectedTarget
 *     updated alongside the review entry; link.status flips to under_review
 *     (existing W235 behavior unchanged).
 *
 *   - verdict='continue' + expectedTarget present → field IGNORED (only
 *     modify_target consumes it). Status flips to active per existing rules.
 *
 *   - partial expectedTarget payload only overwrites the provided fields;
 *     prior values on other fields persist.
 *
 *   - SoD still enforced when expectedTarget present (first reviewer ≠ linkedBy).
 *
 *   - reviewHistory still appends a single entry per call (no double-write).
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
let linkage;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w247-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ TherapeuticGoal } = require('../domains/goals/models/TherapeuticGoal'));
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

async function seedGoalWithLink({ linkerId, initialTarget }) {
  const m = await seedMeasure();
  const goal = await TherapeuticGoal.create({
    beneficiaryId: new mongoose.Types.ObjectId(),
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
            measureId: m._id,
            measureCode: 'BERG',
            linkType: 'PRIMARY',
            weight: 1,
            linkRationale: 'evidence-based primary measure',
            interventionRefs: ['PROGRAM_X'],
            status: 'active',
            linkedBy: linkerId,
            expectedTarget: initialTarget || {
              value: 40,
              direction: 'reach_at_least',
              achievedByDate: new Date('2026-12-31'),
            },
          },
        ],
      },
    ],
  });
  return { goal, measure: m };
}

describe('W247 — reviewLink expectedTarget', () => {
  test('modify_target + expectedTarget → link.expectedTarget updated', async () => {
    const linkerId = new mongoose.Types.ObjectId();
    const reviewerId = new mongoose.Types.ObjectId();
    const { goal } = await seedGoalWithLink({ linkerId });
    await linkage.reviewLink({
      goalId: goal._id,
      objectiveIndex: 0,
      linkIndex: 0,
      verdict: 'modify_target',
      notes: 'lowering target — Botox response slower than expected',
      expectedTarget: {
        value: 35,
        direction: 'reach_at_least',
        achievedByDate: '2027-03-01',
      },
      actor: { userId: reviewerId },
    });
    const after = await TherapeuticGoal.findById(goal._id).lean();
    const link = after.objectives[0].measureLinks[0];
    expect(link.expectedTarget.value).toBe(35);
    expect(link.expectedTarget.direction).toBe('reach_at_least');
    expect(new Date(link.expectedTarget.achievedByDate).getUTCFullYear()).toBe(2027);
    expect(link.status).toBe('under_review');
    expect(link.reviewHistory.length).toBe(1);
    expect(link.reviewHistory[0].verdict).toBe('modify_target');
  });

  test('verdict=continue + expectedTarget present → field IGNORED', async () => {
    const linkerId = new mongoose.Types.ObjectId();
    const reviewerId = new mongoose.Types.ObjectId();
    const { goal } = await seedGoalWithLink({ linkerId });
    await linkage.reviewLink({
      goalId: goal._id,
      objectiveIndex: 0,
      linkIndex: 0,
      verdict: 'continue',
      expectedTarget: { value: 99 }, // should be ignored
      actor: { userId: reviewerId },
    });
    const after = await TherapeuticGoal.findById(goal._id).lean();
    const link = after.objectives[0].measureLinks[0];
    expect(link.expectedTarget.value).toBe(40); // unchanged
    expect(link.status).toBe('active');
  });

  test('partial payload only overwrites provided fields', async () => {
    const linkerId = new mongoose.Types.ObjectId();
    const reviewerId = new mongoose.Types.ObjectId();
    const { goal } = await seedGoalWithLink({ linkerId });
    await linkage.reviewLink({
      goalId: goal._id,
      objectiveIndex: 0,
      linkIndex: 0,
      verdict: 'modify_target',
      expectedTarget: { value: 38 }, // only value
      actor: { userId: reviewerId },
    });
    const after = await TherapeuticGoal.findById(goal._id).lean();
    const link = after.objectives[0].measureLinks[0];
    expect(link.expectedTarget.value).toBe(38);
    expect(link.expectedTarget.direction).toBe('reach_at_least'); // preserved
  });

  test('SoD still enforced when expectedTarget present', async () => {
    const linkerId = new mongoose.Types.ObjectId();
    const { goal } = await seedGoalWithLink({ linkerId });
    await expect(
      linkage.reviewLink({
        goalId: goal._id,
        objectiveIndex: 0,
        linkIndex: 0,
        verdict: 'modify_target',
        expectedTarget: { value: 30 },
        actor: { userId: linkerId }, // SAME as linker
      })
    ).rejects.toThrow(/SoD|first review/i);
  });

  test('modify_target without expectedTarget → status flips, target unchanged', async () => {
    const linkerId = new mongoose.Types.ObjectId();
    const reviewerId = new mongoose.Types.ObjectId();
    const { goal } = await seedGoalWithLink({ linkerId });
    await linkage.reviewLink({
      goalId: goal._id,
      objectiveIndex: 0,
      linkIndex: 0,
      verdict: 'modify_target',
      actor: { userId: reviewerId },
    });
    const after = await TherapeuticGoal.findById(goal._id).lean();
    const link = after.objectives[0].measureLinks[0];
    expect(link.expectedTarget.value).toBe(40); // unchanged
    expect(link.status).toBe('under_review');
  });
});

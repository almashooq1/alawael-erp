'use strict';

/**
 * plan-goal-linkage-behavioral-wave1154.test.js — gap #4 behavioral counterpart.
 *
 * Proves the canonical plan↔goal edges support their backward traversals against
 * an in-memory MongoDB, and that the W1154 indexes are registered:
 *   • TherapeuticGoal.carePlanId  → "which goals belong to this care plan?"
 *   • Goal.therapeuticGoalId      → "which IEP goals bridge to this canonical goal?"
 * Paired with the static guard `plan-goal-linkage-wave1154.test.js`.
 *
 * Per docs/blueprint/43-beneficiary-journey-operating-system.md §III gap #4.
 *
 * Run: cd backend && npx jest --config=jest.config.js \
 *        __tests__/plan-goal-linkage-behavioral-wave1154.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let TherapeuticGoal;
let Goal;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'w1154-plan-goal-behavioral-test' },
    });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  TherapeuticGoal = require('../domains/goals/models/TherapeuticGoal').TherapeuticGoal;
  Goal = require('../models/Goal');
  await TherapeuticGoal.init();
  await Goal.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await TherapeuticGoal.collection.deleteMany({});
  await Goal.collection.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

describe('gap #4 (W1154) — canonical goal→plan edge behavioral', () => {
  test('backward query: find all canonical goals belonging to a care plan', async () => {
    const planA = oid();
    const planB = oid();
    const beneficiaryId = oid();
    const episodeId = oid();
    // raw insert — the read pipeline (index + query) is what gap #4 tests
    await TherapeuticGoal.collection.insertMany([
      { beneficiaryId, episodeId, carePlanId: planA, title: 'g1', type: 'short_term' },
      { beneficiaryId, episodeId, carePlanId: planA, title: 'g2', type: 'short_term' },
      { beneficiaryId, episodeId, carePlanId: planB, title: 'g3', type: 'short_term' },
      { beneficiaryId, episodeId, title: 'standalone' }, // no plan
    ]);

    const fromA = await TherapeuticGoal.find({ carePlanId: planA }).lean();
    expect(fromA).toHaveLength(2);
    const fromB = await TherapeuticGoal.find({ carePlanId: planB }).lean();
    expect(fromB).toHaveLength(1);
  });

  test('the carePlanId index is registered on the TherapeuticGoal collection', async () => {
    const indexes = await TherapeuticGoal.collection.indexes();
    expect(indexes.some(ix => ix.key && ix.key.carePlanId === 1)).toBe(true);
  });
});

describe('gap #4 (W1154) — IEP→canonical bridge behavioral', () => {
  test('backward query: find all IEP goals bridging to a canonical TherapeuticGoal', async () => {
    const canonical = oid();
    await Goal.collection.insertMany([
      { title: 'iep-1', therapeuticGoalId: canonical },
      { title: 'iep-2', therapeuticGoalId: canonical },
      { title: 'iep-3', therapeuticGoalId: oid() },
      { title: 'iep-unbridged' }, // no bridge
    ]);
    const bridged = await Goal.find({ therapeuticGoalId: canonical }).lean();
    expect(bridged).toHaveLength(2);
  });

  test('the therapeuticGoalId index is registered on the Goal collection', async () => {
    const indexes = await Goal.collection.indexes();
    expect(indexes.some(ix => ix.key && ix.key.therapeuticGoalId === 1)).toBe(true);
  });
});

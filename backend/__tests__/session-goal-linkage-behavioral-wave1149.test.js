'use strict';

/**
 * session-goal-linkage-behavioral-wave1149.test.js — R2 behavioral counterpart.
 *
 * Proves the canonical session→goal forward link (ClinicalSession.goalProgress[]
 * .goalId → TherapeuticGoal) works at runtime against an in-memory MongoDB AND
 * that the reverse traversal — "which sessions targeted this goal?" — returns
 * the right sessions (the query the W1149 index accelerates). Paired with the
 * static guard `session-goal-linkage-wave1149.test.js`.
 *
 * Per docs/blueprint/43-beneficiary-journey-operating-system.md §III gap #2 + §XVII (R2).
 *
 * Run: cd backend && npx jest --config=jest.config.js \
 *        __tests__/session-goal-linkage-behavioral-wave1149.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let ClinicalSession;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'w1149-session-goal-behavioral-test' },
    });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ClinicalSession = require('../domains/sessions/models/ClinicalSession').ClinicalSession;
  await ClinicalSession.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await ClinicalSession.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

function baseSession(overrides = {}) {
  return {
    beneficiaryId: oid(),
    episodeId: oid(),
    therapistId: oid(),
    scheduledDate: new Date('2026-02-01'),
    ...overrides,
  };
}

describe('R2 (W1149) — session→goal linkage behavioral', () => {
  test('a session records goalProgress against a TherapeuticGoal id and round-trips', async () => {
    const goalId = oid();
    const s = await ClinicalSession.create(
      baseSession({
        goalProgress: [
          {
            goalId,
            goalTitle: 'Walk 10m',
            progressBefore: 20,
            progressAfter: 35,
            rating: 'developing',
          },
        ],
      })
    );
    const fresh = await ClinicalSession.findById(s._id).lean();
    expect(fresh.goalProgress).toHaveLength(1);
    expect(String(fresh.goalProgress[0].goalId)).toBe(String(goalId));
    expect(fresh.goalProgress[0].progressAfter).toBe(35);
  });

  test('reverse traversal: find all sessions that targeted a given goal', async () => {
    const goalA = oid();
    const goalB = oid();
    await ClinicalSession.create(baseSession({ goalProgress: [{ goalId: goalA }] }));
    await ClinicalSession.create(
      baseSession({ goalProgress: [{ goalId: goalA }, { goalId: goalB }] })
    );
    await ClinicalSession.create(baseSession({ goalProgress: [{ goalId: goalB }] }));

    const sessionsForA = await ClinicalSession.find({ 'goalProgress.goalId': goalA }).lean();
    expect(sessionsForA).toHaveLength(2);

    const sessionsForB = await ClinicalSession.find({ 'goalProgress.goalId': goalB }).lean();
    expect(sessionsForB).toHaveLength(2);
  });

  test('averageGoalProgress virtual computes the mean delta across goalProgress', async () => {
    const s = await ClinicalSession.create(
      baseSession({
        goalProgress: [
          { goalId: oid(), progressBefore: 10, progressAfter: 30 }, // +20
          { goalId: oid(), progressBefore: 50, progressAfter: 60 }, // +10
        ],
      })
    );
    expect(s.averageGoalProgress).toBe(15); // (20 + 10) / 2
  });

  test('the goalProgress.goalId index is registered on the collection', async () => {
    const indexes = await ClinicalSession.collection.indexes();
    const hasGoalIndex = indexes.some(ix => ix.key && ix.key['goalProgress.goalId'] === 1);
    expect(hasGoalIndex).toBe(true);
  });
});

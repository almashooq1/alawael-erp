'use strict';

/**
 * golden-thread-service-behavioral-wave1156.test.js — behavioral counterpart.
 *
 * Proves traceByBeneficiary() actually walks the reverse-traversal edges against
 * an in-memory MongoDB and assembles the connected graph: goal → its sessions
 * (ClinicalSession.goalProgress.goalId, W1149) → its source assessment
 * (MeasureApplication via measureApplicationId, W1151) → baseline/outcome.
 * Paired with the static/pure guard `golden-thread-service-wave1156.test.js`.
 *
 * Seeds via raw collection.insertMany — the service only READS (.find().lean()),
 * so this tests the real query/assembly path on realistic BSON without fighting
 * the heavy TherapeuticGoal measureLink validation.
 *
 * Run: cd backend && npx jest --config=jest.config.js \
 *        __tests__/golden-thread-service-behavioral-wave1156.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let TherapeuticGoal;
let ClinicalSession;
let goldenThreadService;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'w1156-golden-thread-behavioral-test' },
    });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  TherapeuticGoal = require('../domains/goals/models/TherapeuticGoal').TherapeuticGoal;
  ClinicalSession = require('../domains/sessions/models/ClinicalSession').ClinicalSession;
  goldenThreadService = require('../services/goldenThread.service');
  await TherapeuticGoal.init();
  await ClinicalSession.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await TherapeuticGoal.collection.deleteMany({});
  await ClinicalSession.collection.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

describe('golden-thread service (W1156) — traceByBeneficiary behavioral', () => {
  test('assembles the connected graph: goal → sessions → measures → baseline/outcome', async () => {
    const beneficiaryId = oid();
    const episodeId = oid();
    const goalA = oid();
    const goalB = oid();

    await TherapeuticGoal.collection.insertMany([
      {
        _id: goalA,
        beneficiaryId,
        episodeId,
        title: 'Walk 10m',
        status: 'active',
        currentProgress: 40,
        baseline: { value: 5 },
        objectives: [
          {
            measureLinks: [
              { measureId: oid(), measureCode: 'GMFM', linkType: 'PRIMARY', status: 'active' },
            ],
          },
        ],
      },
      {
        _id: goalB,
        beneficiaryId,
        episodeId,
        title: 'Two-word phrases',
        status: 'active',
        objectives: [], // no measure → break-stage
      },
    ]);

    // Two sessions targeted goalA; none targeted goalB.
    await ClinicalSession.collection.insertMany([
      { beneficiaryId, episodeId, status: 'completed', goalProgress: [{ goalId: goalA }] },
      { beneficiaryId, episodeId, status: 'completed', goalProgress: [{ goalId: goalA }] },
    ]);

    const result = await goldenThreadService.traceByBeneficiary(beneficiaryId);
    expect(result.threads).toHaveLength(2);

    const a = result.threads.find(t => String(t.goalId) === String(goalA));
    expect(a.sessionCount).toBe(2);
    expect(a.measureLinks).toHaveLength(1);
    expect(a.threadStage).toBe('complete');

    const b = result.threads.find(t => String(t.goalId) === String(goalB));
    expect(b.sessionCount).toBe(0);
    expect(b.threadStage).toBe('no_measure_link');

    expect(result.summary).toMatchObject({ goalCount: 2, completeCount: 1, sessionLinkedCount: 1 });
  });

  test("a session that targets ANOTHER beneficiary's goal is not mis-attributed", async () => {
    const beneficiaryId = oid();
    const otherGoal = oid();
    const myGoal = oid();
    await TherapeuticGoal.collection.insertMany([
      {
        _id: myGoal,
        beneficiaryId,
        episodeId: oid(),
        title: 'mine',
        baseline: { value: 1 },
        currentProgress: 10,
        objectives: [
          { measureLinks: [{ measureId: oid(), linkType: 'PRIMARY', status: 'active' }] },
        ],
      },
    ]);
    // a session whose goalProgress references BOTH my goal and a foreign goal
    await ClinicalSession.collection.insertMany([
      {
        beneficiaryId,
        episodeId: oid(),
        status: 'completed',
        goalProgress: [{ goalId: myGoal }, { goalId: otherGoal }],
      },
    ]);
    const result = await goldenThreadService.traceByBeneficiary(beneficiaryId);
    expect(result.threads).toHaveLength(1);
    expect(result.threads[0].sessionCount).toBe(1); // only counted for my goal; foreign goalId ignored
  });

  test('a beneficiary with no goals returns an empty thread (no throw)', async () => {
    const result = await goldenThreadService.traceByBeneficiary(oid());
    expect(result.threads).toEqual([]);
    expect(result.summary.goalCount).toBe(0);
  });

  test('soft-deleted goals are excluded', async () => {
    const beneficiaryId = oid();
    await TherapeuticGoal.collection.insertMany([
      { beneficiaryId, episodeId: oid(), title: 'live', objectives: [] },
      { beneficiaryId, episodeId: oid(), title: 'gone', objectives: [], isDeleted: true },
    ]);
    const result = await goldenThreadService.traceByBeneficiary(beneficiaryId);
    expect(result.threads).toHaveLength(1);
    expect(result.threads[0].title).toBe('live');
  });
});

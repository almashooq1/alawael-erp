'use strict';

/**
 * golden-thread-next-actions-behavioral-wave1158.test.js — integration proof
 * that traceByBeneficiary() surfaces the Smart Attention Queue (nextActions +
 * summary.attentionCount) end-to-end against an in-memory MongoDB. Paired with
 * the pure guard `golden-thread-next-actions-wave1158.test.js`.
 *
 * Run: cd backend && npx jest --config=jest.config.js \
 *        __tests__/golden-thread-next-actions-behavioral-wave1158.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let TherapeuticGoal;
let goldenThreadService;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'w1158-next-actions-behavioral-test' },
    });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  TherapeuticGoal = require('../domains/goals/models/TherapeuticGoal').TherapeuticGoal;
  require('../domains/sessions/models/ClinicalSession'); // register for the service
  goldenThreadService = require('../services/goldenThread.service');
  await TherapeuticGoal.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await TherapeuticGoal.collection.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

describe('golden-thread (W1158) — nextActions surfaced by traceByBeneficiary', () => {
  test('a beneficiary with a no-measure goal gets a LINK_MEASURE attention item', async () => {
    const beneficiaryId = oid();
    await TherapeuticGoal.collection.insertMany([
      { beneficiaryId, episodeId: oid(), title: 'unlinked goal', objectives: [] }, // no_measure_link
      {
        beneficiaryId,
        episodeId: oid(),
        title: 'complete goal',
        baseline: { value: 1 },
        currentProgress: 40,
        objectives: [
          { measureLinks: [{ measureId: oid(), linkType: 'PRIMARY', status: 'active' }] },
        ],
      },
    ]);

    const result = await goldenThreadService.traceByBeneficiary(beneficiaryId);
    expect(Array.isArray(result.nextActions)).toBe(true);
    expect(result.summary.attentionCount).toBe(result.nextActions.length);

    const codes = result.nextActions.map(a => a.code);
    expect(codes).toContain('LINK_MEASURE');
    // most-urgent first
    expect(result.nextActions[0].priority).toBeLessThanOrEqual(
      result.nextActions[result.nextActions.length - 1].priority
    );
  });

  test('a beneficiary whose goals are all on-track has an empty attention queue', async () => {
    const beneficiaryId = oid();
    await TherapeuticGoal.collection.insertMany([
      {
        beneficiaryId,
        episodeId: oid(),
        title: 'healthy',
        baseline: { value: 1 },
        currentProgress: 60,
        objectives: [
          { measureLinks: [{ measureId: oid(), linkType: 'PRIMARY', status: 'active' }] },
        ],
      },
    ]);
    // give it a session so it is not flagged NO_SESSIONS
    const ClinicalSession = mongoose.model('ClinicalSession');
    const goal = await TherapeuticGoal.collection.findOne({ beneficiaryId });
    await ClinicalSession.collection.insertOne({
      beneficiaryId,
      episodeId: oid(),
      status: 'completed',
      goalProgress: [{ goalId: goal._id }],
    });

    const result = await goldenThreadService.traceByBeneficiary(beneficiaryId);
    expect(result.summary.attentionCount).toBe(0);
    expect(result.nextActions).toEqual([]);
  });
});

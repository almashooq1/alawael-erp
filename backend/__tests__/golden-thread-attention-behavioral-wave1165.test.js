'use strict';

/**
 * golden-thread-attention-behavioral-wave1165.test.js — integration proof that
 * attentionForBeneficiaries() traces a set of beneficiaries and folds them into
 * a caseload triage against an in-memory MongoDB. Paired with the pure guard
 * `golden-thread-attention-wave1165.test.js`.
 *
 * Run: cd backend && npx jest --config=jest.config.js \
 *        __tests__/golden-thread-attention-behavioral-wave1165.test.js --runInBand
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
      instance: { dbName: 'w1165-caseload-attention-behavioral-test' },
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

const linkedGoal = (beneficiaryId, extra = {}) => ({
  beneficiaryId,
  episodeId: oid(),
  title: 'g',
  baseline: { value: 1 },
  currentProgress: 50,
  objectives: [{ measureLinks: [{ measureId: oid(), linkType: 'PRIMARY', status: 'active' }] }],
  ...extra,
});

describe('golden-thread (W1165) — attentionForBeneficiaries behavioral', () => {
  test('ranks beneficiaries needing attention, most-urgent first; skips on-track ones', async () => {
    const urgent = oid(); // a goal with NO measure → P1 LINK_MEASURE
    const midddle = oid(); // a complete goal but ZERO sessions → P4
    const onTrack = oid(); // complete + a session → no attention

    await TherapeuticGoal.collection.insertMany([
      { beneficiaryId: urgent, episodeId: oid(), title: 'no-measure', objectives: [] },
      linkedGoal(midddle),
      linkedGoal(onTrack),
    ]);
    const onTrackGoal = await TherapeuticGoal.collection.findOne({ beneficiaryId: onTrack });
    await ClinicalSession.collection.insertOne({
      beneficiaryId: onTrack,
      episodeId: oid(),
      status: 'completed',
      goalProgress: [{ goalId: onTrackGoal._id }],
    });

    const { rows, summary } = await goldenThreadService.attentionForBeneficiaries([
      urgent,
      midddle,
      onTrack,
    ]);

    // onTrack excluded; urgent ranked before middle
    expect(rows.map(r => String(r.beneficiaryId))).toEqual([String(urgent), String(midddle)]);
    expect(rows[0].topAction.code).toBe('LINK_MEASURE');
    expect(rows[0].topPriority).toBe(1);
    expect(summary.beneficiariesNeedingAttention).toBe(2);
    expect(summary.urgentCount).toBe(1);
  });

  test('an empty caseload yields an empty triage', async () => {
    const { rows, summary } = await goldenThreadService.attentionForBeneficiaries([]);
    expect(rows).toEqual([]);
    expect(summary.beneficiariesNeedingAttention).toBe(0);
  });
});

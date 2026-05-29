'use strict';

/**
 * assessment-goal-from-suggestion-wave568.test.js — W568 behavioral.
 *
 * Closes the assessment → goal loop: administer an instrument, then
 * materialize one of its SMART goal DRAFTS into a real persisted
 * TherapeuticGoal via assessmentInsightService.createGoalFromSuggestion.
 *
 *   • creates a valid TherapeuticGoal with the draft's SMART fields,
 *     baseline/target, type/domain/priority, clinician as author, and the
 *     source measure recorded in tags (NO objective-level measureLink — that
 *     is a deliberate later clinical step per W235)
 *   • episodeId resolves from the administration, else from the request,
 *     else 400
 *   • bad goalIndex → 400; unknown application → 404
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Measure;
let MeasureApplication;
let TherapeuticGoal;
let digital;
let insight;
const { MEASURES } = require('../measures/catalog/flagship-measures.catalog');

const ASSESSOR = new mongoose.Types.ObjectId();
const EPISODE = new mongoose.Types.ObjectId();

function pedsqlLow() {
  return Array.from({ length: 23 }, () => 4); // impaired HRQOL → improvement goal
}

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w568-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  if (!mongoose.models.User) {
    mongoose.model(
      'User',
      new mongoose.Schema({ name: String, firstName: String, lastName: String })
    );
  }
  if (!mongoose.models.Beneficiary) {
    mongoose.model('Beneficiary', new mongoose.Schema({ name: String, fileNumber: String }));
  }
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ MeasureApplication } = require('../domains/goals/models/MeasureApplication'));
  ({ TherapeuticGoal } = require('../domains/goals/models/TherapeuticGoal'));
  ({ digitalAssessmentService: digital } = require('../services/digitalAssessment.service'));
  ({ assessmentInsightService: insight } = require('../services/assessmentInsight.service'));
  await Measure.init();
  await MeasureApplication.init();
  await TherapeuticGoal.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Promise.all([
    Measure.deleteMany({}),
    MeasureApplication.deleteMany({}),
    TherapeuticGoal.deleteMany({}),
  ]);
  for (const def of MEASURES) await Measure.create(def);
});

async function administerWithEpisode(episodeId) {
  const beneficiaryId = new mongoose.Types.ObjectId();
  const { application } = await digital.administer({
    beneficiaryId,
    measureCode: 'PEDSQL',
    rawItems: pedsqlLow(),
    episodeId,
    assessorId: ASSESSOR,
  });
  return { application, beneficiaryId };
}

describe('W568 — create goal from suggestion', () => {
  test('materializes a valid TherapeuticGoal from the first SMART draft', async () => {
    const { application, beneficiaryId } = await administerWithEpisode(EPISODE);

    const goal = await insight.createGoalFromSuggestion({
      applicationId: application._id,
      assessorId: ASSESSOR,
      branchId: undefined,
    });

    expect(String(goal.beneficiaryId)).toBe(String(beneficiaryId));
    expect(String(goal.episodeId)).toBe(String(EPISODE));
    expect(goal.type).toBeTruthy();
    expect(typeof goal.target.value).toBe('number');
    expect(typeof goal.baseline.value).toBe('number');
    expect(goal.specific).toBeTruthy();
    expect(goal.measurable).toBeTruthy();
    expect(goal.timeBound).toBeTruthy();
    expect(String(goal.createdBy)).toBe(String(ASSESSOR));
    expect(goal.tags).toContain('assessment-derived');
    expect(goal.tags).toContain('PEDSQL');
    // No auto measure-link (deliberate — W235 linkage is a later clinical step).
    expect(goal.objectives || []).toHaveLength(0);
    // round-trips
    const persisted = await TherapeuticGoal.findById(goal._id).lean();
    expect(persisted).toBeTruthy();
    expect(persisted.status).toBe('draft');
  });

  test('uses episodeId from the request when the administration has none', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const { application } = await digital.administer({
      beneficiaryId,
      measureCode: 'PEDSQL',
      rawItems: pedsqlLow(),
      assessorId: ASSESSOR,
    });
    const goal = await insight.createGoalFromSuggestion({
      applicationId: application._id,
      episodeId: EPISODE,
      assessorId: ASSESSOR,
    });
    expect(String(goal.episodeId)).toBe(String(EPISODE));
  });

  test('no episode anywhere → 400', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const { application } = await digital.administer({
      beneficiaryId,
      measureCode: 'PEDSQL',
      rawItems: pedsqlLow(),
      assessorId: ASSESSOR,
    });
    await expect(
      insight.createGoalFromSuggestion({ applicationId: application._id, assessorId: ASSESSOR })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('out-of-range goalIndex → 400', async () => {
    const { application } = await administerWithEpisode(EPISODE);
    await expect(
      insight.createGoalFromSuggestion({
        applicationId: application._id,
        goalIndex: 9,
        assessorId: ASSESSOR,
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('unknown applicationId → 404', async () => {
    await expect(
      insight.createGoalFromSuggestion({
        applicationId: new mongoose.Types.ObjectId(),
        assessorId: ASSESSOR,
      })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test('missing assessorId → 400', async () => {
    const { application } = await administerWithEpisode(EPISODE);
    await expect(
      insight.createGoalFromSuggestion({ applicationId: application._id })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

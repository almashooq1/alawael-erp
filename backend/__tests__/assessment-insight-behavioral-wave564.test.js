'use strict';

/**
 * assessment-insight-behavioral-wave564.test.js — W564 behavioral.
 *
 * Administers real instruments via digitalAssessmentService against a
 * MongoMemoryServer, then exercises assessmentInsightService.insightForApplication
 * end-to-end:
 *   • a PedsQL administration yields a narrative + a band-crossing SMART goal
 *     draft linked back to the measure
 *   • the narrative reflects the improving comparison on a 2nd administration
 *   • invalid / unknown applicationId → 400 / 404
 *
 * Pairs with the pure-core unit test W563.
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
let digital;
let insight;
const { MEASURES } = require('../measures/catalog/flagship-measures.catalog');

const ASSESSOR = new mongoose.Types.ObjectId();

// PedsQL has 23 items; an all-zeros raw vector → low (impaired) HRQOL score.
function pedsqlLow() {
  return Array.from({ length: 23 }, () => 4); // worst response on a 0–4 distress scale
}
function pedsqlBetter() {
  return Array.from({ length: 23 }, () => 1);
}

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w564-test' } });
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
  ({ digitalAssessmentService: digital } = require('../services/digitalAssessment.service'));
  ({ assessmentInsightService: insight } = require('../services/assessmentInsight.service'));
  await Measure.init();
  await MeasureApplication.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Measure.deleteMany({});
  await MeasureApplication.deleteMany({});
  for (const def of MEASURES) await Measure.create(def);
});

describe('W564 — insight for a PedsQL administration', () => {
  test('produces a bilingual narrative + a SMART goal draft linked to the measure', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const { application } = await digital.administer({
      beneficiaryId,
      measureCode: 'PEDSQL',
      rawItems: pedsqlLow(),
      assessorId: ASSESSOR,
    });

    const out = await insight.insightForApplication(application._id);
    expect(out.measureCode).toBe('PEDSQL');
    expect(out.narrative_ar).toContain('جودة الحياة');
    expect(out.narrative_en.length).toBeGreaterThan(20);
    expect(Array.isArray(out.goalSuggestions)).toBe(true);
    expect(out.goalSuggestions.length).toBeGreaterThanOrEqual(1);

    const g = out.goalSuggestions[0];
    expect(g._autoSuggested).toBe(true);
    expect(g.measureLinks[0].measureCode).toBe('PEDSQL');
    expect(typeof g.baseline.value).toBe('number');
    expect(typeof g.target.value).toBe('number');
  });

  test('narrative reflects the improving trend on a 2nd administration', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await digital.administer({
      beneficiaryId,
      measureCode: 'PEDSQL',
      rawItems: pedsqlLow(),
      assessorId: ASSESSOR,
    });
    const { application } = await digital.administer({
      beneficiaryId,
      measureCode: 'PEDSQL',
      rawItems: pedsqlBetter(),
      assessorId: ASSESSOR,
    });
    const out = await insight.insightForApplication(application._id);
    // PedsQL is higher_better; fewer-distress responses → higher score → improving
    expect(out.narrative_ar).toMatch(/تحسّن|خطّ الأساس/);
  });
});

describe('W564 — validation', () => {
  test('invalid applicationId → 400', async () => {
    await expect(insight.insightForApplication('nope')).rejects.toMatchObject({ statusCode: 400 });
  });
  test('unknown applicationId → 404', async () => {
    await expect(
      insight.insightForApplication(new mongoose.Types.ObjectId())
    ).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

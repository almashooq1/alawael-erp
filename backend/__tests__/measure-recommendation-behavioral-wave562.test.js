'use strict';

/**
 * measure-recommendation-behavioral-wave562.test.js — W562 behavioral.
 *
 * Exercises measureRecommendationService.recommendForBeneficiary against a
 * real MongoMemoryServer with the real Measure + MeasureApplication models
 * and the flagship catalog seeded:
 *
 *   • a fresh beneficiary → every eligible instrument is 'never', high
 *     priority, and (for M-CHAT-R/CARS-2/PedsQL) administrable
 *   • the eligibility gate excludes age-inappropriate instruments
 *   • a recently-administered measure drops to 'current' and is excluded
 *     by default (includeCurrent=false)
 *   • administrableOnly filters to digital instruments
 *   • invalid / unknown beneficiaryId → 400 / 404
 *
 * Pairs with the pure-core unit test W561.
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
let Beneficiary;
let svc;
const { MEASURES } = require('../measures/catalog/flagship-measures.catalog');

const REF_DATE = '2026-05-29';

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w562-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  if (!mongoose.models.User) {
    mongoose.model('User', new mongoose.Schema({ name: String }));
  }
  if (!mongoose.models.Beneficiary) {
    mongoose.model(
      'Beneficiary',
      new mongoose.Schema({
        name: String,
        fileNumber: String,
        dateOfBirth: Date,
        _ageReferenceDate: Date, // test-only deterministic clock for age
        category: String,
        disability: { type: { type: String }, conditions: [String] },
      })
    );
  }
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ MeasureApplication } = require('../domains/goals/models/MeasureApplication'));
  Beneficiary = mongoose.model('Beneficiary');
  ({ measureRecommendationService: svc } = require('../services/measureRecommendation.service'));
  await Measure.init();
  await MeasureApplication.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Promise.all([
    Measure.deleteMany({}),
    MeasureApplication.deleteMany({}),
    Beneficiary.deleteMany({}),
  ]);
  for (const def of MEASURES) await Measure.create(def);
});

// 24-month-old autistic toddler — eligible for all three flagship measures.
async function makeToddler() {
  return Beneficiary.create({
    name: 'طفل اختبار',
    fileNumber: 'T-001',
    dateOfBirth: '2024-05-29',
    _ageReferenceDate: REF_DATE,
    disability: { type: 'autism', conditions: ['F84.0'] },
  });
}

describe('W562 — fresh beneficiary', () => {
  test('recommends every eligible instrument as never-administered + high priority', async () => {
    const ben = await makeToddler();
    const out = await svc.recommendForBeneficiary(ben._id, { now: REF_DATE });

    const codes = out.recommendations.map(r => r.measureCode).sort();
    expect(codes).toEqual(['CARS-2', 'M-CHAT-R', 'PEDSQL']);
    for (const r of out.recommendations) {
      expect(r.reassessment.status).toBe('never');
      expect(r.administrable).toBe(true);
      expect(r.priority).toBe('high');
      expect(r.reasons_ar.length).toBeGreaterThan(0);
    }
    expect(out.beneficiary.ageMonths).toBe(24);
    expect(out.counts.high).toBe(3);
  });
});

describe('W562 — eligibility gate', () => {
  test('excludes age-inappropriate instruments (10-year-old → no M-CHAT-R)', async () => {
    const ben = await Beneficiary.create({
      name: 'طفل كبير',
      fileNumber: 'T-002',
      dateOfBirth: '2016-05-29', // 10y at REF_DATE
      _ageReferenceDate: REF_DATE,
      disability: { type: 'autism' },
    });
    const out = await svc.recommendForBeneficiary(ben._id, { now: REF_DATE });
    const codes = out.recommendations.map(r => r.measureCode);
    expect(codes).not.toContain('M-CHAT-R'); // 16–30 months only
    expect(codes).toContain('CARS-2'); // 2–12 years
  });
});

describe('W562 — reassessment cadence', () => {
  test('a recently-administered measure drops to current and is excluded by default', async () => {
    const ben = await makeToddler();
    const mchat = await Measure.findOne({ code: 'M-CHAT-R' });
    await MeasureApplication.create({
      beneficiaryId: ben._id,
      measureId: mchat._id,
      applicationDate: new Date(REF_DATE),
      applicationNumber: 1,
      purpose: 'baseline',
      totalRawScore: 1,
      overallSeverity: 'normal',
      assessorId: new mongoose.Types.ObjectId(),
      status: 'completed',
    });

    const def = await svc.recommendForBeneficiary(ben._id, { now: REF_DATE });
    expect(def.recommendations.map(r => r.measureCode)).not.toContain('M-CHAT-R');

    const withCurrent = await svc.recommendForBeneficiary(ben._id, {
      now: REF_DATE,
      includeCurrent: true,
    });
    const mchatRec = withCurrent.recommendations.find(r => r.measureCode === 'M-CHAT-R');
    expect(mchatRec.reassessment.status).toBe('current');
    expect(mchatRec.priority).toBe('not_now');
  });
});

describe('W562 — filters + validation', () => {
  test('administrableOnly keeps only digital instruments', async () => {
    const ben = await makeToddler();
    const out = await svc.recommendForBeneficiary(ben._id, {
      now: REF_DATE,
      administrableOnly: true,
    });
    expect(out.recommendations.every(r => r.administrable)).toBe(true);
  });

  test('invalid beneficiaryId → 400', async () => {
    await expect(svc.recommendForBeneficiary('not-an-id')).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test('unknown beneficiaryId → 404', async () => {
    const ghost = new mongoose.Types.ObjectId();
    await expect(svc.recommendForBeneficiary(ghost)).rejects.toMatchObject({ statusCode: 404 });
  });
});

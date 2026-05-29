'use strict';

/**
 * measure-recommendation-population-gate-wave571.test.js — W571 regression.
 *
 * Locks the W571 fix for a real silent-exclusion bug: the catalog's
 * `targetPopulation` tokens (autism / cerebral_palsy / children / …) do NOT
 * share a vocabulary with Beneficiary.disability.type (the 7-value ICF enum
 * physical/mental/sensory/multiple/learning/speech/other). The original hard
 * population gate therefore excluded the autism screens (M-CHAT-R, CARS-2)
 * for EVERY real beneficiary, because none carries disability.type='autism'.
 *
 * W571 makes targetPopulation a SOFT ranking signal only — age + ICD-10 stay
 * the hard eligibility gate. This test uses REALISTIC disability.type enum
 * values and asserts the autism measures are no longer silently dropped.
 *
 * Uses MongoMemoryServer with the real Measure + the flagship catalog.
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
const { DISABILITY_TYPE_TO_COHORTS } = require('../services/measureRecommendation.service');

const REF_DATE = '2026-05-29';

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w571-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  if (!mongoose.models.User) mongoose.model('User', new mongoose.Schema({ name: String }));
  if (!mongoose.models.Beneficiary) {
    mongoose.model(
      'Beneficiary',
      new mongoose.Schema({
        name: String,
        dateOfBirth: Date,
        _ageReferenceDate: Date,
        // mirror the REAL production enum so the test is faithful
        disability: {
          type: {
            type: String,
            enum: ['physical', 'mental', 'sensory', 'multiple', 'learning', 'speech', 'other'],
          },
          conditions: [String],
        },
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

describe('W571 — population gate is soft, not hard (silent-exclusion fix)', () => {
  test("a 'mental'-type 24mo toddler still gets the autism screens recommended", async () => {
    const ben = await Beneficiary.create({
      name: 'طفل',
      dateOfBirth: '2024-05-29',
      _ageReferenceDate: REF_DATE,
      disability: { type: 'mental' }, // realistic enum — NOT 'autism'
    });
    const out = await svc.recommendForBeneficiary(ben._id, { now: REF_DATE });
    const codes = out.recommendations.map(r => r.measureCode);
    // Pre-W571 these were silently excluded (tp=['children','autism'] vs type='mental').
    expect(codes).toContain('M-CHAT-R');
    expect(codes).toContain('CARS-2');
  });

  test("a 'physical'-type toddler also sees age-eligible screens (no hard drop)", async () => {
    const ben = await Beneficiary.create({
      name: 'طفل',
      dateOfBirth: '2024-05-29',
      _ageReferenceDate: REF_DATE,
      disability: { type: 'physical' },
    });
    const out = await svc.recommendForBeneficiary(ben._id, { now: REF_DATE });
    // age 24mo → M-CHAT-R (16–30mo) + CARS-2/PEDSQL (≥2y) all age-eligible
    expect(out.recommendations.length).toBeGreaterThanOrEqual(3);
  });

  test('disability→cohort map gives a soft boost for mental→autism, not a gate', () => {
    expect(DISABILITY_TYPE_TO_COHORTS.mental).toContain('autism');
    expect(DISABILITY_TYPE_TO_COHORTS.physical).toContain('cerebral_palsy');
    // 'other' maps to no cohorts but must still never exclude (soft-only).
    expect(DISABILITY_TYPE_TO_COHORTS.other).toEqual([]);
  });
});

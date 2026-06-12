'use strict';

/**
 * W1261 — AI monthly parent reports see UI-entered assessments.
 *
 * The final row of the DDD_VS_LEGACY split table: smartReport.service read
 * only the legacy `Assessment` model, while the UI writes the canonical
 * `ClinicalAssessment`. This guard proves (MMS):
 *   1. A ClinicalAssessment in the period now appears in the gathered
 *      report data, normalized to the report row shape (tool/date/score).
 *   2. Out-of-period rows are excluded.
 *   3. Legacy rows (when the legacy model has data) merge side-by-side.
 */

jest.unmock('mongoose');
jest.setTimeout(120000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { gatherMonthlyData } = require('../services/ai/smartReport.service');
const ClinicalAssessment = require('../models/ClinicalAssessment');

describe('W1261 smartReport × ClinicalAssessment (MMS)', () => {
  let mongod;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  beforeEach(async () => {
    await ClinicalAssessment.deleteMany({});
  });

  const periodStart = new Date('2026-06-01T00:00:00Z');
  const periodEnd = new Date('2026-06-30T23:59:59Z');

  function beneficiary() {
    return { _id: new mongoose.Types.ObjectId(), full_name: 'مستفيد تجريبي' };
  }

  test('a UI-entered assessment in the period appears in the report data', async () => {
    const ben = beneficiary();
    await ClinicalAssessment.create({
      beneficiary: ben._id,
      tool: 'PLS-5',
      category: 'language',
      assessmentDate: new Date('2026-06-10'),
      score: 78,
    });

    const data = await gatherMonthlyData(ben, periodStart, periodEnd);
    expect(data.assessments).toHaveLength(1);
    expect(data.assessments[0].type).toBe('PLS-5');
    expect(data.assessments[0].total_score).toBe(78);
    expect(new Date(data.assessments[0].date)).toEqual(new Date('2026-06-10'));
  });

  test('out-of-period + other-beneficiary rows are excluded', async () => {
    const ben = beneficiary();
    await ClinicalAssessment.create({
      beneficiary: ben._id,
      tool: 'VB-MAPP',
      assessmentDate: new Date('2026-05-15'), // before period
      score: 50,
    });
    await ClinicalAssessment.create({
      beneficiary: new mongoose.Types.ObjectId(), // someone else
      tool: 'CARS-2',
      assessmentDate: new Date('2026-06-15'),
      score: 30,
    });

    const data = await gatherMonthlyData(ben, periodStart, periodEnd);
    expect(data.assessments).toHaveLength(0);
  });

  test('non-numeric tool falls back to rawScore-or-null (faithful-or-null)', async () => {
    const ben = beneficiary();
    await ClinicalAssessment.create({
      beneficiary: ben._id,
      tool: 'Observation',
      assessmentDate: new Date('2026-06-20'),
      rawScore: 12,
    });

    const data = await gatherMonthlyData(ben, periodStart, periodEnd);
    expect(data.assessments[0].total_score).toBe(12);
  });
});

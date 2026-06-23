'use strict';

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');
const ClinicalRiskScore = require('../domains/ai-recommendations/models/ClinicalRiskScore');
const { integrationBus } = require('../integration/systemIntegrationBus');
const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');
const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

afterEach(async () => {
  await CareTimeline.deleteMany({});
  await ClinicalRiskScore.deleteMany({});
});

/**
 * @param {mongoose.Types.ObjectId} beneficiaryId
 * @param {Record<string, unknown>} [overrides]
 */
function score(beneficiaryId, overrides = {}) {
  return {
    beneficiaryId,
    totalScore: 80,
    riskLevel: 'critical',
    trend: 'new',
    ...overrides,
  };
}

describe('W1131 — ClinicalRiskScore escalated → unified-core CareTimeline linkage', () => {
  test('records a critical clinical row for a new critical score', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const episodeId = new mongoose.Types.ObjectId();
    const doc = await ClinicalRiskScore.create(
      score(beneficiaryId, { branchId, episodeId, totalScore: 82 })
    );
    const rows = await waitForRows({ beneficiaryId }, 1);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.eventType).toBe('clinical_risk_score_escalated');
    expect(row.category).toBe('clinical');
    expect(row.severity).toBe('critical');
    expect(String(row.metadata.riskScoreId)).toBe(String(doc._id));
    expect(row.metadata.totalScore).toBe(82);
    expect(row.metadata.riskLevel).toBe('critical');
    expect(row.title).toContain('(82/100)');
    expect(String(row.branchId)).toBe(String(branchId));
    expect(String(row.episodeId)).toBe(String(episodeId));
  });

  test('maps a worsening high score to an error row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await ClinicalRiskScore.create(
      score(beneficiaryId, {
        totalScore: 60,
        riskLevel: 'high',
        trend: 'worsening',
        previousScore: 40,
      })
    );
    const rows = await waitForRows({ beneficiaryId }, 1);
    const row = rows[0];
    expect(row).toBeTruthy();
    expect(row.severity).toBe('error');
    expect(row.metadata.previousScore).toBe(40);
    expect(row.metadata.trend).toBe('worsening');
  });

  test('does NOT link a low/moderate score', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await ClinicalRiskScore.create(
      score(beneficiaryId, { totalScore: 30, riskLevel: 'moderate', trend: 'new' })
    );
    await waitForCount({}, 0);
  });

  test('does NOT link a stable/improving high score (escalation only)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await ClinicalRiskScore.create(
      score(beneficiaryId, { totalScore: 60, riskLevel: 'high', trend: 'stable' })
    );
    await waitForCount({}, 0);
  });

  test('does not double-record on a later save', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await ClinicalRiskScore.create(score(beneficiaryId));
    await waitForCount({ beneficiaryId }, 1);

    doc.recommendationIds = [new mongoose.Types.ObjectId()];
    await doc.save();
    await waitForCount({ beneficiaryId }, 1);
  });

  test('pre-save weighted/category aggregation still runs after async-style conversion', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await ClinicalRiskScore.create(
      score(beneficiaryId, {
        factors: [
          { code: 'regression', category: 'clinical', weight: 2, score: 8 },
          { code: 'high_absence', category: 'attendance', weight: 1, score: 4 },
        ],
      })
    );

    expect(doc.factors[0].weightedScore).toBe(16);
    expect(doc.factors[1].weightedScore).toBe(4);
    expect(doc.categoryScores.clinical).toBe(16);
    expect(doc.categoryScores.attendance).toBe(4);
  });
});

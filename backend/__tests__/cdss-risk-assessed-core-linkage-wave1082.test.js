'use strict';

/**
 * cdss-risk-assessed-core-linkage-wave1082.test.js — W1082.
 *
 * Links the safety-critical milestone (a CDSS risk assessment is recorded)
 * into the unified core. A new CdssRiskAssessment emits
 * cdss-risk.cdss_risk.assessed → CareTimeline 'cdss_risk_assessed'
 * (clinical; severity tracks the risk level). Edits don't re-fire.
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let CdssRiskAssessment;
let CareTimeline;
let integrationBus;

function baseAssessment(riskLevel, overrides = {}) {
  return {
    branchId: new mongoose.Types.ObjectId(),
    beneficiaryId: new mongoose.Types.ObjectId(),
    assessedBy: new mongoose.Types.ObjectId(),
    assessmentType: 'fall_risk',
    riskLevel,
    totalScore: 12,
    assessmentDate: new Date(),
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1082-cdss-risk' } });
  await mongoose.connect(mongod.getUri());

  CdssRiskAssessment = require('../models/CdssRiskAssessment');
  ({ CareTimeline } = require('../domains/timeline/models/CareTimeline'));
  require('../models/Beneficiary');

  ({ integrationBus } = require('../integration/systemIntegrationBus'));
  const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

afterEach(async () => {
  await Promise.all([CdssRiskAssessment.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1082 — CDSS risk assessments reach the unified-core timeline', () => {
  it('a low-risk assessment lands a cdss_risk_assessed row (info)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const a = await CdssRiskAssessment.create(baseAssessment('low', { beneficiaryId }));

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'cdss_risk_assessed' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('info');
    expect(String(tl.metadata.assessmentId)).toBe(String(a._id));
    expect(tl.metadata.riskLevel).toBe('low');
    expect(tl.metadata.assessmentType).toBe('fall_risk');
  });

  it('a very_high-risk assessment is recorded with critical severity', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await CdssRiskAssessment.create(baseAssessment('very_high', { beneficiaryId }));

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'cdss_risk_assessed' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('critical');
    expect(tl.metadata.riskLevel).toBe('very_high');
  });

  it('a high-risk assessment is recorded with error severity', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await CdssRiskAssessment.create(baseAssessment('high', { beneficiaryId }));

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'cdss_risk_assessed' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('error');
  });

  it('editing an existing assessment does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const a = await CdssRiskAssessment.create(baseAssessment('moderate', { beneficiaryId }));

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'cdss_risk_assessed' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('warning');

    const again = await CdssRiskAssessment.findById(a._id);
    again.clinicalNotes = 'reviewed';
    await again.save();
    await waitForCount({ beneficiaryId, eventType: 'cdss_risk_assessed' }, 1);
  });
});

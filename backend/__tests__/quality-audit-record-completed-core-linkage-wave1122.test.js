'use strict';

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');
const QualityAudit = require('../domains/quality/models/QualityAudit');
const { integrationBus } = require('../integration/systemIntegrationBus');
const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');

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
  await QualityAudit.deleteMany({});
});

/**
 * @param {mongoose.Types.ObjectId | null} beneficiaryId
 * @param {Record<string, unknown>} [overrides]
 */
function audit(beneficiaryId, overrides = {}) {
  return {
    scope: 'beneficiary',
    ...(beneficiaryId ? { beneficiaryId } : {}),
    overallScore: 88,
    complianceLevel: 'good',
    ...overrides,
  };
}

describe('W1122 — QualityAudit completed → unified-core CareTimeline linkage', () => {
  test('records a quality success row for a beneficiary-scoped audit', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const doc = await QualityAudit.create(
      audit(beneficiaryId, { branchId, overallScore: 92, complianceLevel: 'excellent' })
    );
    await waitForRows({ beneficiaryId }, 1);

    const rows = await CareTimeline.find({ beneficiaryId }).lean();
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.eventType).toBe('quality_audit_record_completed');
    expect(row.category).toBe('quality');
    expect(row.severity).toBe('success');
    expect(String(row.metadata.auditId)).toBe(String(doc._id));
    expect(row.metadata.overallScore).toBe(92);
    expect(row.metadata.complianceLevel).toBe('excellent');
    expect(row.title).toContain('(92%)');
    expect(String(row.branchId)).toBe(String(branchId));
  });

  test('maps a non_compliant audit to an error row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await QualityAudit.create(
      audit(beneficiaryId, { overallScore: 41, complianceLevel: 'non_compliant' })
    );
    await waitForRows({ beneficiaryId }, 1);

    const row = await CareTimeline.findOne({ beneficiaryId }).lean();
    expect(row).toBeTruthy();
    expect(row.severity).toBe('error');
  });

  test('does NOT link a branch-scoped audit (no beneficiary)', async () => {
    const doc = await QualityAudit.create({
      scope: 'branch',
      branchId: new mongoose.Types.ObjectId(),
      overallScore: 75,
      complianceLevel: 'acceptable',
    });
    await waitForCount({}, 0);
    expect(doc.scope).toBe('branch');
  });

  test('does not double-record on a later save', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await QualityAudit.create(audit(beneficiaryId));
    await waitForRows({ beneficiaryId }, 1);
    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(1);

    doc.overallScore = 90;
    await doc.save();
    await waitForCount({ beneficiaryId }, 1);
  });
});

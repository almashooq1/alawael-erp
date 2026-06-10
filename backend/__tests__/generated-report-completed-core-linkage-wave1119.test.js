'use strict';

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');
const GeneratedReport = require('../domains/reports/models/GeneratedReport');
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
  await GeneratedReport.deleteMany({});
});

/**
 * @param {mongoose.Types.ObjectId} beneficiaryId
 * @param {Record<string, unknown>} [overrides]
 */
function report(beneficiaryId, overrides = {}) {
  return {
    templateId: new mongoose.Types.ObjectId(),
    templateCode: 'PROGRESS_SUMMARY',
    scope: 'beneficiary',
    beneficiaryId,
    period: { from: new Date('2025-01-01'), to: new Date('2025-01-31') },
    title: 'تقرير تقدم شهري',
    ...overrides,
  };
}

async function settle() {
  await new Promise(r => setTimeout(r, 60));
}

describe('W1119 — GeneratedReport completed → unified-core CareTimeline linkage', () => {
  test('records an administrative success row when a beneficiary report completes', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const doc = await GeneratedReport.create(
      report(beneficiaryId, { branchId, templateCode: 'OUTCOME_REPORT' })
    );
    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(0); // status generating

    doc.status = 'completed';
    await doc.save();
    await settle();

    const rows = await CareTimeline.find({ beneficiaryId }).lean();
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.eventType).toBe('generated_report_completed');
    expect(row.category).toBe('administrative');
    expect(row.severity).toBe('success');
    expect(String(row.metadata.reportId)).toBe(String(doc._id));
    expect(row.metadata.templateCode).toBe('OUTCOME_REPORT');
    expect(row.title).toContain('(OUTCOME_REPORT)');
    expect(String(row.branchId)).toBe(String(branchId));
  });

  test('records when a report is created already completed', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await GeneratedReport.create(
      report(beneficiaryId, { status: 'completed', templateCode: 'KPI_REPORT' })
    );
    await settle();

    const rows = await CareTimeline.find({ beneficiaryId }).lean();
    expect(rows).toHaveLength(1);
    expect(rows[0].metadata.templateCode).toBe('KPI_REPORT');
  });

  test('does NOT link a non-beneficiary-scoped report', async () => {
    const doc = await GeneratedReport.create({
      templateId: new mongoose.Types.ObjectId(),
      templateCode: 'BRANCH_ROLLUP',
      scope: 'branch',
      branchId: new mongoose.Types.ObjectId(),
      period: { from: new Date('2025-01-01'), to: new Date('2025-01-31') },
      title: 'تقرير الفرع',
      status: 'completed',
    });
    await settle();

    expect(await CareTimeline.countDocuments({})).toBe(0);
    expect(doc.status).toBe('completed');
  });

  test('does not double-record on a later unrelated save', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await GeneratedReport.create(report(beneficiaryId, { status: 'completed' }));
    await settle();
    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(1);

    doc.dataPointsCount = 42;
    await doc.save();
    await settle();

    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(1);
  });
});

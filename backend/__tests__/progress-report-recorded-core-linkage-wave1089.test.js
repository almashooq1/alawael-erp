'use strict';

/**
 * W1089 — BeneficiaryProgress → unified core timeline linkage.
 *
 * Recording a monthly beneficiary progress report publishes
 * `progress-report.progress_report.recorded`, which the DDD cross-module
 * subscriber materialises into a per-beneficiary CareTimeline row
 * (category: clinical). This proves the "اربط كل تقرير بالمستفيد
 * والزمن" doctrine for the monthly progress report.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const BeneficiaryProgress = require('../models/BeneficiaryProgress');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');

const { integrationBus } = require('../integration/systemIntegrationBus');
const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      dbName: 'w1089-progress-report',
      launchTimeout: 60000,
    },
  });
  await mongoose.connect(mongoServer.getUri(), {
    serverSelectionTimeoutMS: 60000,
    connectTimeoutMS: 60000,
  });
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  // If setup failed (or connection is closed), skip cleanup to avoid
  // noisy buffered-operation timeouts masking the real failure.
  if (mongoose.connection.readyState !== 1) return;
  await BeneficiaryProgress.deleteMany({});
  await CareTimeline.deleteMany({});
});

async function waitForTimeline(filter, { tries = 40, gap = 50 } = {}) {
  for (let i = 0; i < tries; i += 1) {
    const row = await CareTimeline.findOne(filter).lean();
    if (row) return row;
    await new Promise(r => setTimeout(r, gap));
  }
  return null;
}

function progress(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    month: '2026-05',
    academicScore: 82,
    attendanceRate: 95,
    behaviorRating: 8,
    overallPerformance: 'good',
    ...overrides,
  };
}

describe('W1089 — BeneficiaryProgress → CareTimeline linkage', () => {
  it('records a clinical timeline row when a monthly progress report is created', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await BeneficiaryProgress.create(progress({ beneficiaryId }));

    const row = await waitForTimeline({ beneficiaryId });
    expect(row).toBeTruthy();
    expect(row.eventType).toBe('progress_report_recorded');
    expect(row.category).toBe('clinical');
    expect(row.severity).toBe('info'); // 'good'
    expect(String(row.metadata.reportId)).toBe(String(doc._id));
    expect(row.metadata.month).toBe('2026-05');
    expect(row.title).toContain('2026-05');
  });

  it('marks an excellent report as success severity', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await BeneficiaryProgress.create(progress({ beneficiaryId, overallPerformance: 'excellent' }));

    const row = await waitForTimeline({ beneficiaryId });
    expect(row).toBeTruthy();
    expect(row.severity).toBe('success');
  });

  it('marks a needs_improvement report as warning severity', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await BeneficiaryProgress.create(
      progress({ beneficiaryId, overallPerformance: 'needs_improvement' })
    );

    const row = await waitForTimeline({ beneficiaryId });
    expect(row).toBeTruthy();
    expect(row.severity).toBe('warning');
  });

  it('does not duplicate the timeline row on a subsequent save (update)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await BeneficiaryProgress.create(progress({ beneficiaryId }));

    await waitForTimeline({ beneficiaryId });

    doc.teacherNotes = 'updated note';
    await doc.save();
    await new Promise(r => setTimeout(r, 300));

    const count = await CareTimeline.countDocuments({ beneficiaryId });
    expect(count).toBe(1);
  });
});

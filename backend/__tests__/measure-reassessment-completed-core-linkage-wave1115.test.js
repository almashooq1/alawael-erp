'use strict';

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');
const { MeasureReassessmentTask } = require('../domains/goals/models/MeasureReassessmentTask');
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
  await MeasureReassessmentTask.deleteMany({});
});

/**
 * @param {mongoose.Types.ObjectId} beneficiaryId
 * @param {Record<string, unknown>} [overrides]
 */
function task(beneficiaryId, overrides = {}) {
  const now = new Date();
  return {
    beneficiaryId,
    measureCode: 'VABS3',
    measureId: new mongoose.Types.ObjectId(),
    dueAt: now,
    enteredAt: now,
    sentAt: now,
    status: 'pending',
    ...overrides,
  };
}

describe('W1115 — MeasureReassessmentTask completion → unified-core CareTimeline linkage', () => {
  test('records a clinical/success row when a reassessment task is completed', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const doc = await MeasureReassessmentTask.create(
      task(beneficiaryId, { branchId, measureCode: 'CARS2' })
    );
    await waitForCount({ beneficiaryId }, 0);

    doc.status = 'completed';
    doc.completedAt = new Date();
    await doc.save();
    const rows = await waitForRows({ beneficiaryId }, 1);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.eventType).toBe('measure_reassessment_completed');
    expect(row.category).toBe('clinical');
    expect(row.severity).toBe('success');
    expect(String(row.metadata.taskId)).toBe(String(doc._id));
    expect(row.metadata.measureCode).toBe('CARS2');
    expect(row.title).toContain('(CARS2)');
    expect(String(row.branchId)).toBe(String(branchId));
  });

  test('fires when a task is created already completed', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await MeasureReassessmentTask.create(
      task(beneficiaryId, { status: 'completed', completedAt: new Date(), measureCode: 'GMFM88' })
    );
    const rows = await waitForRows({ beneficiaryId }, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0].metadata.measureCode).toBe('GMFM88');
  });

  test('does not fire for an acknowledged (non-completed) transition', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await MeasureReassessmentTask.create(task(beneficiaryId));
    await waitForCount({ beneficiaryId }, 0);

    doc.status = 'acknowledged';
    await doc.save();
    await waitForCount({ beneficiaryId }, 0);
  });

  test('does not double-record on a later unrelated save', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await MeasureReassessmentTask.create(
      task(beneficiaryId, { status: 'completed', completedAt: new Date() })
    );
    await waitForCount({ beneficiaryId }, 1);

    doc.acknowledgedAt = new Date();
    await doc.save();
    await waitForCount({ beneficiaryId }, 1);
  });
});

'use strict';

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');
const WorkflowTask = require('../domains/workflow/models/WorkflowTask');
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
  await WorkflowTask.deleteMany({});
});

/**
 * @param {mongoose.Types.ObjectId} beneficiaryId
 * @param {Record<string, unknown>} [overrides]
 */
function task(beneficiaryId, overrides = {}) {
  return {
    beneficiaryId,
    episodeId: new mongoose.Types.ObjectId(),
    type: 'complete_assessment',
    title: 'Complete initial assessment',
    status: 'pending',
    ...overrides,
  };
}

describe('W1113 — WorkflowTask completion → unified-core CareTimeline linkage', () => {
  test('records an administrative/success row when a task transitions to completed', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const doc = await WorkflowTask.create(
      task(beneficiaryId, { branchId, type: 'family_meeting' })
    );
    await waitForCount({ beneficiaryId }, 0);

    doc.status = 'completed';
    doc.completedAt = new Date();
    await doc.save();
    const rows = await waitForRows({ beneficiaryId }, 1);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.eventType).toBe('workflow_task_completed');
    expect(row.category).toBe('administrative');
    expect(row.severity).toBe('success');
    expect(String(row.metadata.taskId)).toBe(String(doc._id));
    expect(row.metadata.type).toBe('family_meeting');
    expect(row.title).toContain('(family_meeting)');
    expect(String(row.branchId)).toBe(String(branchId));
  });

  test('fires when a task is created already completed', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await WorkflowTask.create(task(beneficiaryId, { status: 'completed', type: 'followup_call' }));
    const rows = await waitForRows({ beneficiaryId }, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0].metadata.type).toBe('followup_call');
  });

  test('does not fire for a non-completed status change', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await WorkflowTask.create(task(beneficiaryId));
    await waitForCount({ beneficiaryId }, 0);

    doc.status = 'in_progress';
    await doc.save();
    await waitForCount({ beneficiaryId }, 0);
  });

  test('does not double-record on a later unrelated save', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await WorkflowTask.create(task(beneficiaryId, { status: 'completed' }));
    await waitForCount({ beneficiaryId }, 1);

    doc.description = 'Closed and archived';
    await doc.save();
    await waitForCount({ beneficiaryId }, 1);
  });
});

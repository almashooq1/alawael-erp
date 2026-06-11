'use strict';

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');
const CorrectiveAction = require('../domains/quality/models/CorrectiveAction');
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
  await CorrectiveAction.deleteMany({});
});

/**
 * @param {Record<string, unknown>} [overrides]
 */
function action(overrides = {}) {
  return {
    auditId: new mongoose.Types.ObjectId(),
    type: 'update_care_plan',
    severity: 'high',
    title: 'إجراء تصحيحي: تحديث خطة الرعاية',
    requiredAction: 'تحديث خطة الرعاية خلال 7 أيام',
    dueDate: new Date(Date.now() + 7 * 86400000),
    ...overrides,
  };
}

async function settle() {
  await new Promise(r => setTimeout(r, 60));
}

/** Poll until a timeline row matching `query` exists (CI-load safe). */
async function waitForTimeline(query, { timeout = 4000, interval = 25 } = {}) {
  const start = Date.now();
  while (true) {
    const row = await CareTimeline.findOne(query);
    if (row) return row;
    if (Date.now() - start > timeout) return null;
    await new Promise(r => setTimeout(r, interval));
  }
}

describe('W1134 — CorrectiveAction opened → unified-core CareTimeline linkage', () => {
  test('records a quality row when a beneficiary-scoped action is opened', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const episodeId = new mongoose.Types.ObjectId();
    const doc = await CorrectiveAction.create(action({ beneficiaryId, branchId, episodeId }));
    await waitForTimeline({ beneficiaryId });

    const rows = await CareTimeline.find({ beneficiaryId }).lean();
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.eventType).toBe('corrective_action_opened');
    expect(row.category).toBe('quality');
    expect(row.severity).toBe('error'); // high → error
    expect(String(row.metadata.correctiveActionId)).toBe(String(doc._id));
    expect(row.metadata.actionType).toBe('update_care_plan');
    expect(row.title).toContain('update_care_plan');
    expect(row.title_ar).toContain('إجراء تصحيحي');
    expect(String(row.branchId)).toBe(String(branchId));
    expect(String(row.episodeId)).toBe(String(episodeId));
  });

  test('maps critical severity to a critical row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await CorrectiveAction.create(
      action({ beneficiaryId, severity: 'critical', type: 'escalate_to_supervisor' })
    );
    await waitForTimeline({ beneficiaryId });

    const row = await CareTimeline.findOne({ beneficiaryId }).lean();
    expect(row).toBeTruthy();
    expect(row.severity).toBe('critical');
    expect(row.metadata.severity).toBe('critical');
  });

  test('maps medium/low severities to warning/info rows', async () => {
    const b1 = new mongoose.Types.ObjectId();
    const b2 = new mongoose.Types.ObjectId();
    await CorrectiveAction.create(action({ beneficiaryId: b1, severity: 'medium' }));
    await CorrectiveAction.create(action({ beneficiaryId: b2, severity: 'low' }));
    await waitForTimeline({ beneficiaryId: b1 });
    await waitForTimeline({ beneficiaryId: b2 });

    const r1 = await CareTimeline.findOne({ beneficiaryId: b1 }).lean();
    const r2 = await CareTimeline.findOne({ beneficiaryId: b2 }).lean();
    expect(r1.severity).toBe('warning');
    expect(r2.severity).toBe('info');
  });

  test('does NOT link a facility-level action (no beneficiaryId)', async () => {
    await CorrectiveAction.create(action({ type: 'equipment_request' }));
    await settle();

    expect(await CareTimeline.countDocuments({})).toBe(0);
  });

  test('does not double-record on a later lifecycle save', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await CorrectiveAction.create(action({ beneficiaryId }));
    await waitForTimeline({ beneficiaryId });
    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(1);

    doc.status = 'in_progress';
    doc.startedAt = new Date();
    await doc.save();
    await settle();

    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(1);
  });

  test('payload carries audit linkage + due date for downstream consumers', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const auditId = new mongoose.Types.ObjectId();
    const dueDate = new Date(Date.now() + 7 * 86400000);
    await CorrectiveAction.create(action({ beneficiaryId, auditId, dueDate }));
    await waitForTimeline({ beneficiaryId });

    const row = await CareTimeline.findOne({ beneficiaryId }).lean();
    expect(String(row.metadata.auditId)).toBe(String(auditId));
    expect(new Date(row.metadata.dueDate).getTime()).toBe(dueDate.getTime());
    expect(row.metadata.openedAt).toBeTruthy();
  });
});

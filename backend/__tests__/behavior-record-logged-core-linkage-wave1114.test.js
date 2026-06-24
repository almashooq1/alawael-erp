'use strict';

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');
const BehaviorRecord = require('../domains/behavior/models/BehaviorRecord');
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
  await BehaviorRecord.deleteMany({});
});

/**
 * @param {mongoose.Types.ObjectId} beneficiaryId
 * @param {Record<string, unknown>} [overrides]
 */
function record(beneficiaryId, overrides = {}) {
  return {
    beneficiaryId,
    reportedBy: new mongoose.Types.ObjectId(),
    occurredAt: new Date(),
    antecedent: { description: 'Asked to transition from playtime' },
    behavior: {
      description: 'Threw materials',
      topography: 'property_destruction',
      severity: 'moderate',
    },
    setting: 'classroom',
    ...overrides,
  };
}

describe('W1114 — BehaviorRecord logging → unified-core CareTimeline linkage', () => {
  test('records a clinical/warning row when an ABC record is submitted on create', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const doc = await BehaviorRecord.create(record(beneficiaryId, { branchId }));
    const rows = await waitForRows({ beneficiaryId }, 1);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.eventType).toBe('behavior_record_logged');
    expect(row.category).toBe('clinical');
    expect(row.severity).toBe('warning');
    expect(String(row.metadata.recordId)).toBe(String(doc._id));
    expect(row.metadata.topography).toBe('property_destruction');
    expect(row.title).toContain('(property_destruction)');
    expect(String(row.branchId)).toBe(String(branchId));
  });

  test('does not fire while a record stays in draft, then fires on submit', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await BehaviorRecord.create(record(beneficiaryId, { status: 'draft' }));
    await waitForCount({ beneficiaryId }, 0);

    doc.status = 'submitted';
    await doc.save();
    await waitForCount({ beneficiaryId }, 1);
  });

  test('does not fire for a later review transition', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await BehaviorRecord.create(record(beneficiaryId));
    await waitForCount({ beneficiaryId }, 1);

    doc.status = 'reviewed';
    await doc.save();
    await waitForCount({ beneficiaryId }, 1);
  });

  test('records exactly one row per distinct submitted record', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await BehaviorRecord.create(record(beneficiaryId));
    await BehaviorRecord.create(record(beneficiaryId, { setting: 'playground' }));
    await waitForCount({ beneficiaryId }, 2);
  });
});

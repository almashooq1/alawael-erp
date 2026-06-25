'use strict';

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');
const FamilyCommunication = require('../domains/family/models/FamilyCommunication');
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
  await FamilyCommunication.deleteMany({});
});

/**
 * @param {mongoose.Types.ObjectId} beneficiaryId
 * @param {Record<string, unknown>} [overrides]
 */
function communication(beneficiaryId, overrides = {}) {
  return {
    beneficiaryId,
    type: 'phone_call',
    direction: 'outgoing',
    summary: 'Discussed home practice plan with the family',
    ...overrides,
  };
}

describe('W1112 — FamilyCommunication logging → unified-core CareTimeline linkage', () => {
  test('records a family/info timeline row on create with metadata and branch', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const doc = await FamilyCommunication.create(
      communication(beneficiaryId, { branchId, type: 'home_visit' })
    );
    const rows = await waitForRows({ beneficiaryId }, 1);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.eventType).toBe('family_communication_logged');
    expect(row.category).toBe('family');
    expect(row.severity).toBe('info');
    expect(String(row.metadata.communicationId)).toBe(String(doc._id));
    expect(row.metadata.type).toBe('home_visit');
    expect(row.title).toContain('(home_visit)');
    expect(String(row.branchId)).toBe(String(branchId));
  });

  test('records a row even without branch context', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await FamilyCommunication.create(communication(beneficiaryId, { type: 'whatsapp' }));

    const rows = await waitForRows({ beneficiaryId }, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0].metadata.type).toBe('whatsapp');
    expect(rows[0].branchId).toBeUndefined();
  });

  test('does not double-record on a later unrelated save', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await FamilyCommunication.create(communication(beneficiaryId));
    await waitForCount({ beneficiaryId }, 1);

    doc.subject = 'Updated subject line';
    await doc.save();
    await waitForCount({ beneficiaryId }, 1);
  });

  test('records exactly one row per distinct communication', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await FamilyCommunication.create(communication(beneficiaryId, { type: 'sms' }));
    await FamilyCommunication.create(communication(beneficiaryId, { type: 'email' }));
    await waitForCount({ beneficiaryId }, 2);
  });
});

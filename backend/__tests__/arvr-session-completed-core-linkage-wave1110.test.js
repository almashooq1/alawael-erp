'use strict';

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');
const ARVRSession = require('../domains/ar-vr/models/ARVRSession');
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
  await ARVRSession.deleteMany({});
});

/**
 * @param {string} beneficiaryId
 * @param {Record<string, unknown>} [overrides]
 */
function arvrSession(beneficiaryId, overrides = {}) {
  return {
    beneficiaryId,
    therapistId: new mongoose.Types.ObjectId(),
    technologyType: 'vr',
    scenario: { name: 'Balance training garden' },
    plannedDurationMinutes: 30,
    status: 'scheduled',
    ...overrides,
  };
}

async function settle() {
  await new Promise(r => setTimeout(r, 60));
}

describe('W1110 — ARVRSession completion → unified-core CareTimeline linkage', () => {
  test('records a clinical/success timeline row when a session reaches completed', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const doc = await ARVRSession.create(
      arvrSession(beneficiaryId, { branchId, technologyType: 'ar' })
    );

    // Not completed yet → no row
    await settle();
    expect(await CareTimeline.countDocuments({})).toBe(0);

    doc.status = 'completed';
    doc.endedAt = new Date();
    await doc.save();
    await settle();

    const rows = await CareTimeline.find({ beneficiaryId }).lean();
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.eventType).toBe('arvr_session_completed');
    expect(row.category).toBe('clinical');
    expect(row.severity).toBe('success');
    expect(String(row.metadata.sessionId)).toBe(String(doc._id));
    expect(row.metadata.technologyType).toBe('ar');
    expect(row.title).toContain('(ar)');
    expect(String(row.branchId)).toBe(String(branchId));
  });

  test('fires when a session is created already completed', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await ARVRSession.create(
      arvrSession(beneficiaryId, { status: 'completed', endedAt: new Date() })
    );
    await settle();

    const rows = await CareTimeline.find({ beneficiaryId }).lean();
    expect(rows).toHaveLength(1);
    expect(rows[0].eventType).toBe('arvr_session_completed');
  });

  test('does not fire for non-completed statuses', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await ARVRSession.create(arvrSession(beneficiaryId));

    doc.status = 'in_progress';
    await doc.save();
    await settle();

    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(0);
  });

  test('does not double-record on a later unrelated save', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await ARVRSession.create(
      arvrSession(beneficiaryId, { status: 'completed', endedAt: new Date() })
    );
    await settle();
    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(1);

    doc.plannedDurationMinutes = 45;
    await doc.save();
    await settle();

    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(1);
  });
});

'use strict';

/**
 * W1092 — PickupAuthorization → unified core timeline linkage.
 *
 * Creating a pickup authorization (authorizing a non-guardian to collect
 * the beneficiary from a day-rehab center) publishes
 * `pickup-authorization.pickup_authorization.requested`, which the DDD
 * cross-module subscriber materialises into a per-beneficiary CareTimeline
 * row (category: administrative). A safety/operational milestone.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const PickupAuthorization = require('../models/PickupAuthorization');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');

const { integrationBus } = require('../integration/systemIntegrationBus');
const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: { dbName: 'w1092-pickup-authorization' },
  });
  await mongoose.connect(mongoServer.getUri());
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  await PickupAuthorization.deleteMany({});
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

function authorization(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    pickupPersonName: 'العم خالد',
    pickupPersonRelationship: 'عم',
    pickupPersonNationalId: '1234567890',
    validFrom: new Date('2026-05-01T00:00:00.000Z'),
    validUntil: new Date('2026-05-31T00:00:00.000Z'),
    ...overrides,
  };
}

describe('W1092 — PickupAuthorization → CareTimeline linkage', () => {
  it('records an administrative timeline row when an authorization is created', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const doc = await PickupAuthorization.create(authorization({ beneficiaryId, branchId }));

    const row = await waitForTimeline({ beneficiaryId });
    expect(row).toBeTruthy();
    expect(row.eventType).toBe('pickup_authorization_requested');
    expect(row.category).toBe('administrative');
    expect(row.severity).toBe('info');
    expect(String(row.branchId)).toBe(String(branchId));
    expect(String(row.metadata.authorizationId)).toBe(String(doc._id));
    expect(row.metadata.pickupPersonRelationship).toBe('عم');
    expect(row.title).toContain('العم خالد');
  });

  it('does not duplicate the timeline row when the authorization is signed', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await PickupAuthorization.create(authorization({ beneficiaryId }));

    await waitForTimeline({ beneficiaryId });

    doc.status = 'signed';
    doc.signedByParentAt = new Date();
    doc.signedByParentName = 'الأب';
    await doc.save();
    await new Promise(r => setTimeout(r, 300));

    const count = await CareTimeline.countDocuments({ beneficiaryId });
    expect(count).toBe(1);
  });

  it('captures the validity window in metadata', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await PickupAuthorization.create(authorization({ beneficiaryId }));

    const row = await waitForTimeline({ beneficiaryId });
    expect(row).toBeTruthy();
    expect(row.metadata.validFrom).toBeTruthy();
    expect(row.metadata.validUntil).toBeTruthy();
  });
});

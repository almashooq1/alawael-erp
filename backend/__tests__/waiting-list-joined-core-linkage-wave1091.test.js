'use strict';

/**
 * W1091 — WaitingListEntry → unified core timeline linkage.
 *
 * When a KNOWN beneficiary is added to the waiting list for a new service
 * line, the model publishes `waiting-list.waiting_list.joined`, which the
 * DDD cross-module subscriber materialises into a per-beneficiary
 * CareTimeline row (category: administrative).
 *
 * Prospective-only entries (guardianId set, no beneficiaryId) must NOT
 * produce a timeline row.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const WaitingListEntry = require('../models/WaitingListEntry');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');

const { integrationBus } = require('../integration/systemIntegrationBus');
const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: { dbName: 'w1091-waiting-list' },
  });
  await mongoose.connect(mongoServer.getUri());
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  await WaitingListEntry.deleteMany({});
  await CareTimeline.deleteMany({});
});

function entry(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    serviceType: 'نطق وتخاطب',
    priority: 3,
    status: 'waiting',
    ...overrides,
  };
}

describe('W1091 — WaitingListEntry → CareTimeline linkage', () => {
  it('records an administrative timeline row for a known beneficiary', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const doc = await WaitingListEntry.create(entry({ beneficiaryId, branchId }));

    const rowRows = await waitForRows({ beneficiaryId }, 1);
    const row = rowRows[0];
    expect(row).toBeTruthy();
    expect(row.eventType).toBe('waiting_list_joined');
    expect(row.category).toBe('administrative');
    expect(row.severity).toBe('info'); // priority 3
    expect(String(row.branchId)).toBe(String(branchId));
    expect(String(row.metadata.entryId)).toBe(String(doc._id));
    expect(row.metadata.serviceType).toBe('نطق وتخاطب');
  });

  it('marks an urgent (priority 1) entry as warning severity', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await WaitingListEntry.create(entry({ beneficiaryId, priority: 1 }));

    const rowRows = await waitForRows({ beneficiaryId }, 1);
    const row = rowRows[0];
    expect(row).toBeTruthy();
    expect(row.severity).toBe('warning');
  });

  it('does NOT fire for a prospective-only entry (no beneficiaryId)', async () => {
    const guardianId = new mongoose.Types.ObjectId();
    await WaitingListEntry.create({
      guardianId,
      prospectName: 'طفل جديد',
      serviceType: 'علاج وظيفي',
      status: 'waiting',
    });

    await waitForCount({ eventType: 'waiting_list_joined' }, 0);
  });

  it('does not duplicate the timeline row when the entry is later offered', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await WaitingListEntry.create(entry({ beneficiaryId }));

    await waitForRows({ beneficiaryId }, 1);

    doc.status = 'offered';
    doc.offeredAt = new Date();
    await doc.save();
    await waitForCount({ beneficiaryId }, 1);
  });
});

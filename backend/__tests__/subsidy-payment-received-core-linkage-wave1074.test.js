'use strict';

/**
 * subsidy-payment-received-core-linkage-wave1074.test.js — W1074.
 *
 * Links beneficiary subsidy/pension receipt into the unified core
 * (per-beneficiary CareTimeline). Marking a subsidy entry as 'received'
 * emits subsidy-entry.subsidy_entry.received → CareTimeline
 * 'subsidy_payment_received' (administrative; success). Anchors the
 * financial-support milestone on the beneficiary's timeline.
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let BeneficiarySubsidyEntry;
let CareTimeline;
let integrationBus;

function baseEntry(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    year: 2025,
    month: 1,
    subsidyType: 'disability_allowance',
    amountSAR: 1200,
    status: 'expected',
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1074-subsidy-entry' } });
  await mongoose.connect(mongod.getUri());

  BeneficiarySubsidyEntry = require('../models/BeneficiarySubsidyEntry');
  ({ CareTimeline } = require('../domains/timeline/models/CareTimeline'));
  require('../models/Beneficiary');

  ({ integrationBus } = require('../integration/systemIntegrationBus'));
  const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

afterEach(async () => {
  await Promise.all([BeneficiarySubsidyEntry.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1074 — received subsidy payments reach the unified-core timeline', () => {
  it('marking a subsidy received lands a subsidy_payment_received row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const e = await BeneficiarySubsidyEntry.create(baseEntry({ beneficiaryId }));

    e.status = 'received';
    e.receivedDate = new Date();
    await e.save();

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'subsidy_payment_received' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('administrative');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.entryId)).toBe(String(e._id));
    expect(tl.metadata.subsidyType).toBe('disability_allowance');
    expect(tl.metadata.amountSAR).toBe(1200);
  });

  it('an entry created directly as received also lands a row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const e = await BeneficiarySubsidyEntry.create(
      baseEntry({
        beneficiaryId,
        subsidyType: 'social_security',
        status: 'received',
        receivedDate: new Date(),
      })
    );

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'subsidy_payment_received' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.metadata.subsidyType).toBe('social_security');
  });

  it('an expected (unpaid) entry does not create a timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await BeneficiarySubsidyEntry.create(baseEntry({ beneficiaryId, status: 'expected' }));

    await waitForCount(
      {
        beneficiaryId,
        eventType: 'subsidy_payment_received',
      },
      0
    );
  });

  it('re-saving a received entry does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const e = await BeneficiarySubsidyEntry.create(baseEntry({ beneficiaryId }));
    e.status = 'received';
    e.receivedDate = new Date();
    await e.save();

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'subsidy_payment_received' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    const again = await BeneficiarySubsidyEntry.findById(e._id);
    again.receiptNumber = 'RC-7781';
    await again.save();
    await waitForCount(
      {
        beneficiaryId,
        eventType: 'subsidy_payment_received',
      },
      1
    );
  });
});

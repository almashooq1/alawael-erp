'use strict';

/**
 * assistive-device-return-core-linkage-wave1028.test.js — W1028.
 *
 * Links assistive-device loan RETURN into the unified core (per-beneficiary
 * CareTimeline). When a loaned device (AssistiveDevice, W359) is handed back —
 * availability flips to 'available' and the loan reaches status 'returned' —
 * the model emits assistive-devices.assistive_device.returned →
 * CareTimeline 'assistive_device_returned' (administrative/success).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers):
 * asserts the OBSERVABLE EFFECT (a persisted CareTimeline row).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let AssistiveDevice;
let CareTimeline;
let integrationBus;

let tagSeq = 0;
function baseDevice(overrides = {}) {
  tagSeq += 1;
  return {
    assetTag: `AD-${Date.now()}-${tagSeq}`,
    name: 'Standard wheelchair',
    category: 'wheelchair',
    branchId: new mongoose.Types.ObjectId(),
    availability: 'available',
    ...overrides,
  };
}

async function checkoutAndReturn(dev, beneficiaryId) {
  dev.availability = 'loaned';
  dev.currentLoaneeId = beneficiaryId;
  dev.currentLoanStartedAt = new Date();
  dev.loans.push({
    beneficiaryId,
    status: 'checked_out',
    startedAt: new Date(),
    conditionOnCheckout: 'good',
  });
  await dev.save();

  const loan = dev.loans[dev.loans.length - 1];
  loan.status = 'returned';
  loan.returnedAt = new Date();
  loan.conditionOnReturn = 'good';
  dev.availability = 'available';
  dev.currentLoaneeId = null;
  dev.currentLoanStartedAt = null;
  await dev.save();
  return dev;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1028-assistive-return-core' } });
  await mongoose.connect(mongod.getUri());

  AssistiveDevice = require('../models/AssistiveDevice');
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
  await Promise.all([AssistiveDevice.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1028 — Assistive-device return reaches the unified-core timeline', () => {
  it('returning a loaned device lands an assistive_device_returned row (administrative/success)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const dev = await checkoutAndReturn(await AssistiveDevice.create(baseDevice()), beneficiaryId);

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'assistive_device_returned' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('administrative');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.deviceId)).toBe(String(dev._id));
    expect(tl.metadata.conditionOnReturn).toBe('good');
    expect(tl.metadata.category).toBe('wheelchair');
  });

  it('a device that is never loaned produces NO return timeline row', async () => {
    await AssistiveDevice.create(baseDevice());
    await waitForCount({ eventType: 'assistive_device_returned' }, 0);
  });

  it('re-saving an already-returned device does not re-fire the return event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const dev = await checkoutAndReturn(await AssistiveDevice.create(baseDevice()), beneficiaryId);

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'assistive_device_returned' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    const again = await AssistiveDevice.findById(dev._id);
    again.notes = 'Cleaned and shelved after return.';
    await again.save();
    await waitForCount({ beneficiaryId, eventType: 'assistive_device_returned' }, 1);
  });
});

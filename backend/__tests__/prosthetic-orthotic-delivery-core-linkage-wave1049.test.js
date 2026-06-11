'use strict';

/**
 * prosthetic-orthotic-delivery-core-linkage-wave1049.test.js — W1049.
 *
 * Links prosthetic/orthotic DELIVERY into the unified core (per-beneficiary
 * CareTimeline). When a ProstheticOrthoticOrder reaches stage 'delivered'
 * the model emits prosthetic-orthotic-order.prosthetic_orthotic.delivered →
 * CareTimeline 'prosthetic_orthotic_delivered' (clinical/success).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let ProstheticOrthoticOrder;
let CareTimeline;
let integrationBus;

async function waitForTimeline(query, { timeout = 4000, interval = 25 } = {}) {
  const start = Date.now();

  while (true) {
    const row = await CareTimeline.findOne(query);
    if (row) return row;
    if (Date.now() - start > timeout) return null;
    await new Promise(r => setTimeout(r, interval));
  }
}

function baseOrder(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    deviceCategory: 'afo',
    prescribedDate: new Date('2026-04-01'),
    stage: 'prescribed',
    ...overrides,
  };
}

function deliveredFields() {
  return {
    stage: 'delivered',
    deliveredDate: new Date('2026-05-12'),
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1049-prosthetic-core' } });
  await mongoose.connect(mongod.getUri());

  ProstheticOrthoticOrder = require('../models/ProstheticOrthoticOrder');
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
  await Promise.all([ProstheticOrthoticOrder.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1049 — prosthetic/orthotic delivery reaches the unified-core timeline', () => {
  it('delivering a device lands a prosthetic_orthotic_delivered row (clinical/success)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const order = await ProstheticOrthoticOrder.create(baseOrder({ beneficiaryId }));

    Object.assign(order, deliveredFields());
    await order.save();

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'prosthetic_orthotic_delivered',
    });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.orderId)).toBe(String(order._id));
    expect(tl.metadata.deviceCategory).toBe('afo');
  });

  it('a prescribed (non-delivered) order produces NO timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await ProstheticOrthoticOrder.create(baseOrder({ beneficiaryId, stage: 'prescribed' }));

    await new Promise(r => setTimeout(r, 200));
    expect(await CareTimeline.countDocuments({ eventType: 'prosthetic_orthotic_delivered' })).toBe(
      0
    );
  });

  it('re-saving an already-delivered order does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const order = await ProstheticOrthoticOrder.create(
      baseOrder({ beneficiaryId, ...deliveredFields() })
    );

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'prosthetic_orthotic_delivered',
    });
    expect(tl).toBeTruthy();

    const again = await ProstheticOrthoticOrder.findById(order._id);
    again.wearingSchedule = '8 hours daily';
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId,
        eventType: 'prosthetic_orthotic_delivered',
      })
    ).toBe(1);
  });
});

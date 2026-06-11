'use strict';

/**
 * medication-order-activated-core-linkage-wave1078.test.js — W1078.
 *
 * Links the clinical milestone (a new active medication order is started)
 * into the unified core. A MedicationOrder created with status 'active'
 * emits medication-order.medication_order.activated → CareTimeline
 * 'medication_order_started' (clinical; info). held / stopped orders are
 * NOT surfaced.
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let MedicationOrder;
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
    name: 'Risperidone 0.5mg',
    status: 'active',
    startedAt: new Date(),
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1078-medication-order' } });
  await mongoose.connect(mongod.getUri());

  ({ MedicationOrder } = require('../models/MedicationOrder'));
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
  await Promise.all([MedicationOrder.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1078 — new active medication orders reach the unified-core timeline', () => {
  it('an active order lands a medication_order_started row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const o = await MedicationOrder.create(baseOrder({ beneficiaryId }));

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'medication_order_started' });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('info');
    expect(String(tl.metadata.orderId)).toBe(String(o._id));
    expect(tl.metadata.name).toBe('Risperidone 0.5mg');
  });

  it('a held order does NOT create a timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await MedicationOrder.create(baseOrder({ beneficiaryId, status: 'held' }));

    await new Promise(r => setTimeout(r, 250));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId,
        eventType: 'medication_order_started',
      })
    ).toBe(0);
  });

  it('a stopped order does NOT create a timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await MedicationOrder.create(baseOrder({ beneficiaryId, status: 'stopped' }));

    await new Promise(r => setTimeout(r, 250));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId,
        eventType: 'medication_order_started',
      })
    ).toBe(0);
  });

  it('editing an active order does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const o = await MedicationOrder.create(baseOrder({ beneficiaryId }));

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'medication_order_started' });
    expect(tl).toBeTruthy();

    const again = await MedicationOrder.findById(o._id);
    again.rxNormClass = 'antipsychotic';
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId,
        eventType: 'medication_order_started',
      })
    ).toBe(1);
  });
});

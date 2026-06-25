'use strict';

/**
 * beneficiary-status-core-linkage-wave982.test.js — W982.
 *
 * Wires beneficiary lifecycle STATUS changes (active → completed / paused /
 * dropped) onto the unified-core timeline via the canonical
 * `core.beneficiary.status_changed` event (the contract already existed but had
 * no producer + no timeline subscriber). This is the ONLY path that records a
 * status change on the CareTimeline — the env-gated modelEventBridge emits the
 * 'beneficiary.*' variant to the LIVE-registry subscribers (notify/re-publish),
 * which do not write the timeline.
 *
 * Producer: native Beneficiary post-save hook (update-only). RUNTIME end-to-end
 * against a real in-memory Mongo + the real integration bus + real subscribers.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Beneficiary, CareTimeline;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w982-benstatus' } });
  await mongoose.connect(mongod.getUri());
  Beneficiary = require('../models/Beneficiary');
  ({ CareTimeline } = require('../domains/timeline/models/CareTimeline'));
  const { integrationBus } = require('../integration/systemIntegrationBus');
  const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

afterEach(async () => {
  await Promise.all([Beneficiary.deleteMany({}), CareTimeline.deleteMany({})]);
});

function newBeneficiary(extra = {}) {
  return Beneficiary.create({ firstName: 'سالم', lastName: 'الأحمد', ...extra });
}

describe('W982 — beneficiary status changes reach the unified-core timeline', () => {
  it('creating a beneficiary does NOT emit a status_changed row', async () => {
    const b = await newBeneficiary();
    await waitForCount({ beneficiaryId: b._id, eventType: 'status_changed' }, 0);
  });

  it('active → graduated lands a success status_changed row', async () => {
    const b = await newBeneficiary();
    const loaded = await Beneficiary.findById(b._id);
    loaded.status = 'graduated';
    await loaded.save();
    const tlRows = await waitForRows({ beneficiaryId: b._id, eventType: 'status_changed' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('success');
    expect(tl.metadata.oldStatus).toBe('active');
    expect(tl.metadata.newStatus).toBe('graduated');
  });

  it('active → deceased lands a CRITICAL status_changed row', async () => {
    const b = await newBeneficiary();
    const loaded = await Beneficiary.findById(b._id);
    loaded.status = 'deceased';
    await loaded.save();
    const tlRows = await waitForRows({ beneficiaryId: b._id, eventType: 'status_changed' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('critical');
  });
});

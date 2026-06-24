'use strict';

/**
 * waitlist-core-linkage-wave979.test.js — W979.
 *
 * Wires the waitlist journey into the unified-core timeline:
 *   - Waitlist.create()          → waitlist.waitlist.added  → 'waitlisted' row
 *   - status → 'BOOKED'          → waitlist.waitlist.booked → 'waitlist_booked'
 *     row (admission into active care — the high-value moment)
 *
 * Producer: native pre-compile post-save hooks in models/Waitlist.js. RUNTIME
 * end-to-end against a real in-memory Mongo + the real integration bus + real
 * subscribers (the W349 lesson — assert the row actually persists).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Waitlist, CareTimeline;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w978-waitlist' } });
  await mongoose.connect(mongod.getUri());

  Waitlist = require('../models/Waitlist');
  ({ CareTimeline } = require('../domains/timeline/models/CareTimeline'));
  require('../models/Beneficiary');

  const { integrationBus } = require('../integration/systemIntegrationBus');
  const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

afterEach(async () => {
  await Promise.all([Waitlist.deleteMany({}), CareTimeline.deleteMany({})]);
});

function newEntry(extra = {}) {
  return Waitlist.create({
    beneficiary: new mongoose.Types.ObjectId(),
    department: 'SPEECH',
    priority: 'HIGH',
    ...extra,
  });
}

describe('W979 — waitlist journey reaches the unified-core timeline', () => {
  it('adding to the waitlist lands a "waitlisted" row', async () => {
    const e = await newEntry();
    const tlRows = await waitForRows({ beneficiaryId: e.beneficiary, eventType: 'waitlisted' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('administrative');
    expect(tl.metadata.department).toBe('SPEECH');
  });

  it('booking from the waitlist lands a "waitlist_booked" (admission) row, once', async () => {
    const e = await newEntry();
    await waitForRows({ beneficiaryId: e.beneficiary, eventType: 'waitlisted' }, 1);

    const loaded = await Waitlist.findById(e._id);
    loaded.status = 'BOOKED';
    await loaded.save();

    const tlRows = await waitForRows(
      {
        beneficiaryId: e.beneficiary,
        eventType: 'waitlist_booked',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('success');

    // booked fires once; waitlisted did not re-fire on the update
    expect(
      await CareTimeline.countDocuments({ beneficiaryId: e.beneficiary, eventType: 'waitlisted' })
    ).toBe(1);
  });

  it('an OFFERED transition does not produce a booked row', async () => {
    const e = await newEntry();
    await waitForRows({ beneficiaryId: e.beneficiary, eventType: 'waitlisted' }, 1);
    const loaded = await Waitlist.findById(e._id);
    loaded.status = 'OFFERED';
    await loaded.save();
    await waitForCount(
      {
        beneficiaryId: e.beneficiary,
        eventType: 'waitlist_booked',
      },
      0
    );
  });
});

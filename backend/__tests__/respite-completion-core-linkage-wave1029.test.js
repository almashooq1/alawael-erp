'use strict';

/**
 * respite-completion-core-linkage-wave1029.test.js — W1029.
 *
 * Links respite-booking COMPLETION into the unified core (per-beneficiary
 * CareTimeline). When a RespiteBooking (W363) reaches the terminal 'completed'
 * status (the beneficiary is checked out), the model emits
 * respite.respite.completed → CareTimeline 'respite_completed' (family/success).
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
let RespiteBooking;
let CareTimeline;
let integrationBus;

function baseBooking(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    bookingType: 'day',
    startAt: new Date(Date.now() + 3600e3),
    endAt: new Date(Date.now() + 7200e3),
    nightCount: 0,
    emergencyContactName: 'Primary caregiver',
    emergencyContactPhone: '+966500000000',
    ...overrides,
  };
}

async function completeBooking(booking) {
  booking.status = 'completed';
  booking.checkedInAt = new Date();
  booking.checkedOutAt = new Date();
  await booking.save();
  return booking;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({
    instance: { dbName: 'w1029-respite-completion-core' },
  });
  await mongoose.connect(mongod.getUri());

  RespiteBooking = require('../models/RespiteBooking');
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
  await Promise.all([RespiteBooking.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1029 — Respite booking completion reaches the unified-core timeline', () => {
  it('completing a respite booking lands a respite_completed row (family/success)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const booking = await completeBooking(
      await RespiteBooking.create(baseBooking({ beneficiaryId }))
    );

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'respite_completed' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('family');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.respiteBookingId)).toBe(String(booking._id));
    expect(tl.metadata.bookingType).toBe('day');
  });

  it('a not-completed booking produces NO completion timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await RespiteBooking.create(baseBooking({ beneficiaryId, status: 'requested' }));

    await waitForCount({ eventType: 'respite_completed' }, 0);
  });

  it('re-saving an already-completed booking does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const booking = await completeBooking(
      await RespiteBooking.create(baseBooking({ beneficiaryId }))
    );

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'respite_completed' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    const again = await RespiteBooking.findById(booking._id);
    again.checkOutHandoffNotes = 'Family briefed at handover.';
    await again.save();
    await waitForCount({ beneficiaryId, eventType: 'respite_completed' }, 1);
  });
});

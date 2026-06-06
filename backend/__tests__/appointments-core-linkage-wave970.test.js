'use strict';

/**
 * appointments-core-linkage-wave970.test.js — W970.
 *
 * Completes the appointment → unified-core linkage. The CareTimeline appointment
 * subscribers landed on main alongside the W928/W929 episode work, but their
 * contracts (dddEventContracts), CareTimeline enum values and — most importantly
 * — a PRODUCER never did, so `appointments.appointment.*` were orphan
 * subscribers (W389 red) that would also throw at runtime. W970 adds:
 *   - APPOINTMENT_EVENTS contracts,
 *   - `appointment_*` CareTimeline enum values,
 *   - native post-save producer hooks in models/Appointment.js.
 *
 * This is a RUNTIME end-to-end test (real in-memory Mongo, real integration bus,
 * real subscribers) — the W349 lesson: static drift guards saw the subscribers
 * but never ran a save, so they missed both the missing producer and the enum
 * throw. We assert the OBSERVABLE EFFECT — a persisted CareTimeline row — which
 * exercises the whole produce → bus → subscribe → persist chain.
 *
 * Note on the producer mechanism: the hooks live in the model file (pre-compile)
 * because schema middleware added AFTER mongoose.model() compilation never fires
 * — which is exactly why the generic modelEventBridge produced nothing here.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Appointment;
let CareTimeline;
let integrationBus;

async function waitForTimeline(query, { timeout = 4000, interval = 25 } = {}) {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const row = await CareTimeline.findOne(query);
    if (row) return row;
    if (Date.now() - start > timeout) return null;
    await new Promise(r => setTimeout(r, interval));
  }
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w930-appt-core' } });
  await mongoose.connect(mongod.getUri());

  Appointment = require('../models/Appointment');
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
  await Promise.all([Appointment.deleteMany({}), CareTimeline.deleteMany({})]);
});

function newAppointment(extra = {}) {
  return Appointment.create({
    beneficiary: new mongoose.Types.ObjectId(),
    beneficiaryName: 'سالم الأحمد',
    therapist: new mongoose.Types.ObjectId(),
    type: 'تقييم',
    date: new Date('2026-06-10T09:00:00.000Z'),
    startTime: '09:00',
    ...extra,
  });
}

describe('W970 — Appointment lifecycle reaches the unified-core timeline', () => {
  it('booking lands an appointment_booked CareTimeline row', async () => {
    const appt = await newAppointment();

    const tl = await waitForTimeline({
      beneficiaryId: appt.beneficiary,
      eventType: 'appointment_booked',
    });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(String(tl.metadata.appointmentId)).toBe(String(appt._id));
    expect(tl.metadata.appointmentType).toBe('تقييم');
  });

  it('no-show lands a HIGH-signal appointment_no_show row (and does not re-fire booked)', async () => {
    const appt = await newAppointment();
    await waitForTimeline({ beneficiaryId: appt.beneficiary, eventType: 'appointment_booked' });

    const reloaded = await Appointment.findById(appt._id);
    reloaded.status = 'NO_SHOW';
    await reloaded.save();

    const tl = await waitForTimeline({
      beneficiaryId: appt.beneficiary,
      eventType: 'appointment_no_show',
    });
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('warning');

    // booked must have fired exactly once (on create) — not again on the update
    const bookedCount = await CareTimeline.countDocuments({
      beneficiaryId: appt.beneficiary,
      eventType: 'appointment_booked',
    });
    expect(bookedCount).toBe(1);
  });

  it('cancellation lands an appointment_cancelled row', async () => {
    const appt = await newAppointment();
    await waitForTimeline({ beneficiaryId: appt.beneficiary, eventType: 'appointment_booked' });

    const reloaded = await Appointment.findById(appt._id);
    reloaded.status = 'CANCELLED';
    await reloaded.save();

    const tl = await waitForTimeline({
      beneficiaryId: appt.beneficiary,
      eventType: 'appointment_cancelled',
    });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('administrative');
  });

  it('an appointment with no beneficiary produces no timeline row', async () => {
    await Appointment.create({ type: 'تقييم', date: new Date(), startTime: '10:00' });
    await new Promise(r => setTimeout(r, 200));
    const count = await CareTimeline.countDocuments({ eventType: 'appointment_booked' });
    expect(count).toBe(0);
  });
});

describe('W970 — regression guard: core timeline subscribers actually PERSIST', () => {
  it('core.beneficiary.registered writes a CareTimeline row (was silently failing pre-W970)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await integrationBus.publish('core', 'beneficiary.registered', {
      beneficiaryId,
      mrn: 'MRN-001',
      name: 'سالم الأحمد',
    });
    const tl = await waitForTimeline({ beneficiaryId, eventType: 'registration' });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('administrative');
  });
});

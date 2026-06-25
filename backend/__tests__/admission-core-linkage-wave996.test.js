'use strict';

/**
 * admission-core-linkage-wave996.test.js — W996.
 *
 * Links waitlist enrollment (admission) into the unified core
 * (per-beneficiary CareTimeline), following the W970/W992…W995 pattern.
 * Enrolling a WaitlistEntry applicant (status → 'enrolled') is the admission
 * milestone that OPENS the beneficiary's episode of care:
 *   - WaitlistEntry.status === 'enrolled' → admissions.admission.enrolled
 *
 * Pre-W996 enrollment mutated a standalone waitlist record invisible to the
 * longitudinal beneficiary view. W996 adds the three artifacts doctrine
 * requires per event:
 *   1. ADMISSION_EVENTS contract (dddEventContracts),
 *   2. `admission_enrolled` CareTimeline enum value + the subscriber,
 *   3. a producer that emits exactly once when status reaches 'enrolled'
 *      (the flag is set in the model's existing callback-style pre('save')
 *      hook; the post('save') hook publishes).
 *
 * RUNTIME end-to-end test (real in-memory Mongo, real integration bus, real
 * subscribers): asserts the OBSERVABLE EFFECT (a persisted CareTimeline row),
 * exercising produce → bus → subscribe → persist.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let WaitlistEntry;
let CareTimeline;
let integrationBus;

function baseEntry(overrides = {}) {
  return {
    branch: new mongoose.Types.ObjectId(),
    applicantName: 'Sara A.',
    applicantPhone: '0512345678',
    disabilityType: 'physical',
    disabilitySeverity: 'moderate',
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w996-admission-core' } });
  await mongoose.connect(mongod.getUri());

  WaitlistEntry = require('../models/WaitlistEntry');
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
  await Promise.all([WaitlistEntry.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W996 — Waitlist enrollment reaches the unified-core timeline', () => {
  it('enrolling an applicant lands an admission_enrolled row (success)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const entry = await WaitlistEntry.create(baseEntry({ status: 'pending' }));

    // enroll() sets status='enrolled', enrolledAt, beneficiary, then saves.
    await entry.enroll(beneficiaryId);

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'admission_enrolled' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('administrative');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.waitlistEntryId)).toBe(String(entry._id));
    expect(tl.metadata.applicantName).toBe('Sara A.');
    expect(tl.metadata.disabilityType).toBe('physical');
  });

  it('a pending applicant produces NO timeline row', async () => {
    await WaitlistEntry.create(baseEntry({ status: 'pending' }));

    await waitForCount({ eventType: 'admission_enrolled' }, 0);
  });

  it('a new-as-enrolled entry without a linked beneficiary emits nothing', async () => {
    // beneficiary stays null → producer guards and skips (no timeline target).
    await WaitlistEntry.create(baseEntry({ status: 'enrolled', enrolledAt: new Date() }));

    await waitForCount({ eventType: 'admission_enrolled' }, 0);
  });

  it('re-saving an already-enrolled entry does not re-fire', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const entry = await WaitlistEntry.create(baseEntry({ status: 'pending' }));
    await entry.enroll(beneficiaryId);

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'admission_enrolled' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    const again = await WaitlistEntry.findById(entry._id);
    again.notes = 'Welcome packet handed over.';
    await again.save();
    await waitForCount({ beneficiaryId, eventType: 'admission_enrolled' }, 1);
  });
});

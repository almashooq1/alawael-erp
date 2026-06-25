'use strict';

/**
 * mar-core-linkage-wave994.test.js — W994.
 *
 * Links the Medication Administration Record (MAR, W191b) into the unified core
 * (per-beneficiary CareTimeline + dashboards), following the W970/W992/W993
 * pattern. Pre-W994 a recorded dose was a standalone CRUD log invisible to the
 * longitudinal beneficiary view:
 *   - MedicationAdministrationRecord (W191b) → medications.medication.dose_recorded
 *
 * A recorded dose outcome is a clinical event the care team must see on the
 * timeline — especially a REFUSED or MISSED dose (a missed anti-epileptic can
 * precede a seizure). One contract + one subscriber + one CareTimeline enum
 * value serve every terminal outcome (administered/refused/missed/held); the
 * `status` payload field distinguishes them.
 *
 * W994 adds, atomically, the THREE artifacts doctrine requires per event:
 *   1. MEDICATION_EVENTS contract (dddEventContracts),
 *   2. `medication_dose_recorded` CareTimeline enum value + the subscriber,
 *   3. native pre-compile post-save PRODUCER hooks that emit when a dose leaves
 *      'scheduled' (new-as-terminal OR scheduled→terminal).
 *
 * RUNTIME end-to-end test (real in-memory Mongo, real integration bus, real
 * subscribers): we assert the OBSERVABLE EFFECT (a persisted CareTimeline row),
 * exercising produce → bus → subscribe → persist.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Mar;
let CareTimeline;
let integrationBus;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w994-mar-core' } });
  await mongoose.connect(mongod.getUri());

  Mar = require('../models/MedicationAdministrationRecord');
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
  await Promise.all([Mar.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W994 — Medication dose outcomes reach the unified-core timeline', () => {
  it('an administered dose lands a medication_dose_recorded row (info)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const ev = await Mar.create({
      beneficiaryId,
      medicationName: 'Levetiracetam',
      dose: '250mg',
      route: 'oral',
      date: new Date('2026-06-14T08:00:00.000Z'),
      scheduledTime: new Date('2026-06-14T08:00:00.000Z'),
      actualTime: new Date('2026-06-14T08:05:00.000Z'),
      status: 'administered',
      administeredByName: 'Nurse A',
    });

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'medication_dose_recorded' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('info'); // administered → info
    expect(tl.metadata.status).toBe('administered');
    expect(String(tl.metadata.marId)).toBe(String(ev._id));
    expect(tl.metadata.medicationName).toBe('Levetiracetam');
  });

  it('a refused dose escalates the timeline entry to warning', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await Mar.create({
      beneficiaryId,
      medicationName: 'Risperidone',
      route: 'oral',
      date: new Date(),
      scheduledTime: new Date(),
      status: 'refused',
      refusalReason: 'Beneficiary declined the dose.',
    });

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'medication_dose_recorded' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('warning'); // refused → warning
    expect(tl.metadata.status).toBe('refused');
  });

  it('a missed dose escalates the timeline entry to warning', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await Mar.create({
      beneficiaryId,
      medicationName: 'Valproate',
      route: 'oral',
      date: new Date(),
      scheduledTime: new Date(),
      status: 'missed',
    });

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'medication_dose_recorded' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('warning'); // missed → warning
  });

  it('a scheduled (not-yet-given) dose produces NO timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await Mar.create({
      beneficiaryId,
      medicationName: 'Vitamin D',
      route: 'oral',
      date: new Date(),
      scheduledTime: new Date(),
      status: 'scheduled',
    });

    await waitForCount(
      {
        beneficiaryId,
        eventType: 'medication_dose_recorded',
      },
      0
    );
  });

  it('transitioning scheduled→administered fires exactly once', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const ev = await Mar.create({
      beneficiaryId,
      medicationName: 'Melatonin',
      route: 'oral',
      date: new Date(),
      scheduledTime: new Date(),
      status: 'scheduled',
    });
    await waitForCount({ beneficiaryId, eventType: 'medication_dose_recorded' }, 0);

    const reloaded = await Mar.findById(ev._id);
    reloaded.status = 'administered';
    reloaded.actualTime = new Date();
    reloaded.administeredByName = 'Nurse B';
    await reloaded.save();

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'medication_dose_recorded' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    // Re-saving without a status change must NOT re-fire.
    const again = await Mar.findById(ev._id);
    again.notes = 'Tolerated well.';
    await again.save();
    await waitForCount({ beneficiaryId, eventType: 'medication_dose_recorded' }, 1);
  });
});

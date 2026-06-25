'use strict';

/**
 * medical-referral-core-linkage-wave1001.test.js — W1001.
 *
 * Links medical referral COMPLETION into the unified core (per-beneficiary
 * CareTimeline), following the W970/W992…W997 pattern. MedicalReferral is the
 * clinical, beneficiary-REQUIRED referral record. When a referral reaches
 * 'completed' (the consultation/treatment loop concluded), the longitudinal
 * record must carry it as a clinical milestone:
 *   - MedicalReferral.status === 'completed' → medical-referrals.medical_referral.completed
 *
 * Three artifacts: (1) MEDICAL_REFERRAL_EVENTS contract, (2)
 * `medical_referral_completed` CareTimeline enum value + subscriber, (3) a
 * producer (async pre/post hooks matching the schema's existing async style)
 * that fires exactly once on the transition into 'completed'.
 *
 * RUNTIME end-to-end test (real in-memory Mongo, real integration bus, real
 * subscribers): asserts the OBSERVABLE EFFECT (a persisted CareTimeline row).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let MedicalReferral;
let CareTimeline;
let integrationBus;

function baseReferral(overrides = {}) {
  return {
    beneficiary: new mongoose.Types.ObjectId(),
    referralType: 'external_outgoing',
    referredTo: { specialty: 'neurology' },
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1001-medical-referral-core' } });
  await mongoose.connect(mongod.getUri());

  ({ MedicalReferral } = require('../models/medicalReferral.model'));
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
  await Promise.all([MedicalReferral.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1001 — Medical referral completion reaches the unified-core timeline', () => {
  it('completing a referral lands a medical_referral_completed row (clinical/success)', async () => {
    const beneficiary = new mongoose.Types.ObjectId();
    const ref = await MedicalReferral.create(baseReferral({ beneficiary, status: 'sent' }));

    ref.status = 'completed';
    await ref.save();

    const tlRows = await waitForRows(
      {
        beneficiaryId: beneficiary,
        eventType: 'medical_referral_completed',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.referralId)).toBe(String(ref._id));
    expect(tl.metadata.specialty).toBe('neurology');
    expect(tl.metadata.referralType).toBe('external_outgoing');
  });

  it('a referral still in progress produces NO timeline row', async () => {
    const beneficiary = new mongoose.Types.ObjectId();
    await MedicalReferral.create(baseReferral({ beneficiary, status: 'in_progress' }));

    await waitForCount({ eventType: 'medical_referral_completed' }, 0);
  });

  it('re-saving an already-completed referral does not re-fire', async () => {
    const beneficiary = new mongoose.Types.ObjectId();
    const ref = await MedicalReferral.create(baseReferral({ beneficiary, status: 'sent' }));
    ref.status = 'completed';
    await ref.save();

    const tlRows = await waitForRows(
      {
        beneficiaryId: beneficiary,
        eventType: 'medical_referral_completed',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    const again = await MedicalReferral.findById(ref._id);
    again.notes = 'Consultation letter filed.';
    await again.save();
    await waitForCount(
      {
        beneficiaryId: beneficiary,
        eventType: 'medical_referral_completed',
      },
      1
    );
  });
});

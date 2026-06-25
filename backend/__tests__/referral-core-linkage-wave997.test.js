'use strict';

/**
 * referral-core-linkage-wave997.test.js — W997.
 *
 * Links referral CONVERSION into the unified core (per-beneficiary
 * CareTimeline), following the W970/W992…W996 pattern. ReferralTracking is the
 * canonical, beneficiary-keyed referral record. When a referral for a KNOWN
 * beneficiary reaches 'converted' (the referral resulted in the beneficiary
 * entering/continuing care — the model's own "% convert to enrollments" KPI),
 * the longitudinal record must show it:
 *   - ReferralTracking.status === 'converted' → referrals.referral.converted
 *
 * Three artifacts: (1) REFERRAL_EVENTS contract, (2) `referral_converted`
 * CareTimeline enum value + subscriber, (3) a producer that fires exactly once
 * on the transition into 'converted', guarded on a present beneficiaryId.
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
let ReferralTracking;
let CareTimeline;
let integrationBus;

function baseReferral(overrides = {}) {
  return {
    direction: 'incoming',
    referralSource: 'مستشفى الملك فهد',
    serviceType: 'علاج طبيعي',
    branchId: new mongoose.Types.ObjectId(),
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w997-referral-core' } });
  await mongoose.connect(mongod.getUri());

  ReferralTracking = require('../models/ReferralTracking');
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
  await Promise.all([ReferralTracking.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W997 — Referral conversion reaches the unified-core timeline', () => {
  it('converting a referral for a known beneficiary lands a referral_converted row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const ref = await ReferralTracking.create(baseReferral({ beneficiaryId, status: 'pending' }));

    ref.status = 'converted';
    ref.settledAt = new Date();
    await ref.save();

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'referral_converted' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('administrative');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.referralId)).toBe(String(ref._id));
    expect(tl.metadata.direction).toBe('incoming');
    expect(tl.metadata.serviceType).toBe('علاج طبيعي');
  });

  it('a pending referral produces NO timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await ReferralTracking.create(baseReferral({ beneficiaryId, status: 'pending' }));

    await waitForCount({ eventType: 'referral_converted' }, 0);
  });

  it('a converted referral WITHOUT a linked beneficiary emits nothing (prospective)', async () => {
    await ReferralTracking.create(
      baseReferral({ status: 'converted', prospectName: 'Prospect X', settledAt: new Date() })
    );

    await waitForCount({ eventType: 'referral_converted' }, 0);
  });

  it('re-saving an already-converted referral does not re-fire', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const ref = await ReferralTracking.create(baseReferral({ beneficiaryId, status: 'pending' }));
    ref.status = 'converted';
    await ref.save();

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'referral_converted' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    const again = await ReferralTracking.findById(ref._id);
    again.notes = 'Welcome call done.';
    await again.save();
    await waitForCount({ beneficiaryId, eventType: 'referral_converted' }, 1);
  });
});

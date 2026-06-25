'use strict';

/**
 * insurance-eligibility-checked-core-linkage-wave1058.test.js — W1058.
 *
 * Links NPHIES insurance-eligibility checks into the unified core
 * (per-beneficiary CareTimeline). Recording a check emits
 * insurance-eligibility.insurance_eligibility.checked → CareTimeline
 * 'insurance_eligibility_checked' (administrative; warning when not eligible).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let InsuranceEligibilityCheck;
let CareTimeline;
let integrationBus;
let seq = 0;

function baseCheck(overrides = {}) {
  seq += 1;
  return {
    branchId: new mongoose.Types.ObjectId(),
    uuid: `elig-${Date.now()}-${seq}`,
    policyId: new mongoose.Types.ObjectId(),
    beneficiaryId: new mongoose.Types.ObjectId(),
    checkType: 'general',
    isEligible: true,
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1058-insurance-eligibility' } });
  await mongoose.connect(mongod.getUri());

  InsuranceEligibilityCheck = require('../models/InsuranceEligibilityCheck');
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
  await Promise.all([InsuranceEligibilityCheck.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1058 — insurance eligibility checks reach the unified-core timeline', () => {
  it('an eligible check lands an insurance_eligibility_checked row (success)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const c = await InsuranceEligibilityCheck.create(
      baseCheck({ beneficiaryId, isEligible: true })
    );

    const tlRows = await waitForRows(
      {
        beneficiaryId,
        eventType: 'insurance_eligibility_checked',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('administrative');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.checkId)).toBe(String(c._id));
  });

  it('an ineligible check is recorded with warning severity', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await InsuranceEligibilityCheck.create(baseCheck({ beneficiaryId, isEligible: false }));

    const tlRows = await waitForRows(
      {
        beneficiaryId,
        eventType: 'insurance_eligibility_checked',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('warning');
  });

  it('re-saving an existing check does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const c = await InsuranceEligibilityCheck.create(baseCheck({ beneficiaryId }));

    const tlRows = await waitForRows(
      {
        beneficiaryId,
        eventType: 'insurance_eligibility_checked',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    const again = await InsuranceEligibilityCheck.findById(c._id);
    again.responseTimeMs = 240;
    await again.save();
    await waitForCount(
      {
        beneficiaryId,
        eventType: 'insurance_eligibility_checked',
      },
      1
    );
  });
});

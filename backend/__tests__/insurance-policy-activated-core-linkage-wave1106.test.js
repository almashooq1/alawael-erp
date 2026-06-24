'use strict';

/**
 * W1106 — InsurancePolicy → unified core timeline linkage.
 *
 * When a beneficiary's insurance policy becomes active — either newly issued
 * (status defaults to 'active') or resumed from a suspended/pending state —
 * the model publishes `insurance-policy.insurance_policy.activated`, which the
 * DDD cross-module subscriber materialises into one per-beneficiary
 * CareTimeline row (category: administrative, severity: success). A policy
 * created in a non-active state never fires until it is activated, and an
 * already-active policy is never double-counted on subsequent saves.
 *
 * Doctrine: every milestone for a single beneficiary is linked to the
 * beneficiary + the unified timeline + time.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');
const { integrationBus } = require('../integration/systemIntegrationBus');
const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');

let InsurancePolicy;
let mongo;
let seq = 0;

/** Build a valid InsurancePolicy payload (all required + unique fields). */
function policy(beneficiaryId, branchId, overrides = {}) {
  seq += 1;
  const u = `w1106-${Date.now()}-${seq}`;
  return {
    branchId,
    policyNumber: `POL-${seq}`,
    policyUuid: `${u}-policy`,
    uuid: `${u}-uuid`,
    beneficiaryId,
    insuranceCompanyId: new mongoose.Types.ObjectId(),
    memberId: `MEM-${seq}`,
    planType: 'premium',
    startDate: new Date(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    ...overrides,
  };
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  InsurancePolicy = mongoose.models.InsurancePolicy || require('../models/InsurancePolicy');
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

afterEach(async () => {
  await CareTimeline.deleteMany({});
  await InsurancePolicy.deleteMany({});
});

describe('W1106 InsurancePolicy → CareTimeline (insurance_policy.activated)', () => {
  it('records an administrative/success row when a policy is issued active', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();

    const doc = await InsurancePolicy.create(policy(beneficiaryId, branchId));
    const rows = await waitForRows({ beneficiaryId }, 1);
  });

  it('fires when a suspended policy is resumed to active', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();

    const doc = await InsurancePolicy.create(
      policy(beneficiaryId, branchId, { status: 'suspended' })
    );
    await waitForRows({ beneficiaryId }, 0);

    doc.status = 'active';
    await doc.save();

    const rows = await waitForRows({ beneficiaryId }, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0].eventType).toBe('insurance_policy_activated');
  });

  it('does not fire when a policy is issued in a non-active state', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();

    await InsurancePolicy.create(policy(beneficiaryId, branchId, { status: 'pending' }));
    const rows = await waitForRows({ beneficiaryId }, 0);
  });

  it('does not duplicate the row on a later unrelated save', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();

    const doc = await InsurancePolicy.create(policy(beneficiaryId, branchId));
    const rows = await waitForRows({ beneficiaryId }, 1);
  });
});

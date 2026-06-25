'use strict';

/**
 * insurance-claim-core-linkage-wave994.test.js — W994.
 *
 * Wires insurance-claim outcomes onto the unified-core timeline: an approved
 * (or partially-approved) claim means the beneficiary's care is funded (success)
 * and a rejected claim means funding was denied (warning — access at risk).
 * Producer: native NphiesInsuranceClaim post-save hook (status flip to approved /
 * partially_approved / rejected). RUNTIME end-to-end against a real in-memory
 * Mongo + the real integration bus + real subscribers → `insurance_claim`
 * CareTimeline rows (administrative category).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let InsuranceClaim, CareTimeline;
let claimSeq = 0;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w994-insurance' } });
  await mongoose.connect(mongod.getUri());
  InsuranceClaim = require('../models/nphies/InsuranceClaim');
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
  await Promise.all([InsuranceClaim.deleteMany({}), CareTimeline.deleteMany({})]);
});

// Create a fresh submitted claim (required: beneficiaryId, insurancePolicyId,
// claimNumber [unique], serviceStartDate, serviceEndDate, totalAmount).
function newSubmittedClaim(extra = {}) {
  claimSeq += 1;
  return InsuranceClaim.create({
    beneficiaryId: new mongoose.Types.ObjectId(),
    insurancePolicyId: new mongoose.Types.ObjectId(),
    claimNumber: `CLM-TEST-${claimSeq}`,
    serviceStartDate: new Date(),
    serviceEndDate: new Date(),
    totalAmount: 1000,
    status: 'submitted',
    ...extra,
  });
}

describe('W994 — insurance claim outcomes reach the unified-core timeline', () => {
  it('a submitted claim produces no row until it is decided; approval → success', async () => {
    const c = await newSubmittedClaim();
    await waitForCount({ beneficiaryId: c.beneficiaryId }, 0);

    const loaded = await InsuranceClaim.findById(c._id);
    loaded.status = 'approved';
    loaded.approvedAmount = 1000;
    await loaded.save();

    const tlRows = await waitForRows(
      {
        beneficiaryId: c.beneficiaryId,
        eventType: 'insurance_claim',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('administrative');
    expect(tl.severity).toBe('success');
  });

  it('a partially_approved claim also lands a SUCCESS row', async () => {
    const c = await newSubmittedClaim();
    const loaded = await InsuranceClaim.findById(c._id);
    loaded.status = 'partially_approved';
    loaded.approvedAmount = 600;
    await loaded.save();
    const tlRows = await waitForRows(
      {
        beneficiaryId: c.beneficiaryId,
        eventType: 'insurance_claim',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('success');
  });

  it('a rejected claim lands a WARNING row', async () => {
    const c = await newSubmittedClaim();
    const loaded = await InsuranceClaim.findById(c._id);
    loaded.status = 'rejected';
    await loaded.save();
    const tlRows = await waitForRows(
      {
        beneficiaryId: c.beneficiaryId,
        eventType: 'insurance_claim',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('warning');
  });

  it('a non-terminal status change (in_review) produces no row', async () => {
    const c = await newSubmittedClaim();
    const loaded = await InsuranceClaim.findById(c._id);
    loaded.status = 'in_review';
    await loaded.save();
    await waitForCount({ beneficiaryId: c.beneficiaryId }, 0);
  });
});

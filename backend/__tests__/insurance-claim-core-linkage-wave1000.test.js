'use strict';

/**
 * insurance-claim-core-linkage-wave1000.test.js — W1000.
 *
 * Links insurance claim PAYMENT into the unified core (per-beneficiary
 * CareTimeline), following the W994…W999 pattern. InsuranceClaim is the
 * reimbursement record (beneficiary REQUIRED). When a claim reaches 'paid',
 * the reimbursement loop is closed and the longitudinal record must carry it
 * as a financial milestone:
 *   - InsuranceClaim.status === 'paid' → insurance-claims.insurance_claim.paid
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
let InsuranceClaim;
let CareTimeline;
let integrationBus;

function baseClaim(overrides = {}) {
  return {
    beneficiary: new mongoose.Types.ObjectId(),
    contract: new mongoose.Types.ObjectId(),
    visitDate: new Date(),
    totalGross: 1000,
    totalNet: 800,
    claimType: 'professional',
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1000-insurance-claim-core' } });
  await mongoose.connect(mongod.getUri());

  ({ InsuranceClaim } = require('../models/insuranceClaim.model'));
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
  await Promise.all([InsuranceClaim.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1000 — Insurance claim payment reaches the unified-core timeline', () => {
  it('paying a claim lands an insurance_claim_paid row (administrative/success)', async () => {
    const beneficiary = new mongoose.Types.ObjectId();
    const claim = await InsuranceClaim.create(
      baseClaim({ beneficiary, status: 'approved', payerShare: 640 })
    );

    claim.status = 'paid';
    claim.payment = { date: new Date(), amount: 640, method: 'bank_transfer' };
    await claim.save();

    const tlRows = await waitForRows(
      {
        beneficiaryId: beneficiary,
        eventType: 'insurance_claim_paid',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('administrative');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.claimId)).toBe(String(claim._id));
    expect(tl.metadata.claimType).toBe('professional');
    expect(tl.metadata.paymentAmount).toBe(640);
  });

  it('an unpaid (approved) claim produces NO timeline row', async () => {
    const beneficiary = new mongoose.Types.ObjectId();
    await InsuranceClaim.create(baseClaim({ beneficiary, status: 'approved' }));

    await waitForCount({ eventType: 'insurance_claim_paid' }, 0);
  });

  it('re-saving an already-paid claim does not re-fire', async () => {
    const beneficiary = new mongoose.Types.ObjectId();
    const claim = await InsuranceClaim.create(baseClaim({ beneficiary, status: 'approved' }));
    claim.status = 'paid';
    await claim.save();

    const tlRows = await waitForRows(
      {
        beneficiaryId: beneficiary,
        eventType: 'insurance_claim_paid',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    const again = await InsuranceClaim.findById(claim._id);
    again.notes = 'Remittance advice filed.';
    await again.save();
    await waitForCount(
      {
        beneficiaryId: beneficiary,
        eventType: 'insurance_claim_paid',
      },
      1
    );
  });
});

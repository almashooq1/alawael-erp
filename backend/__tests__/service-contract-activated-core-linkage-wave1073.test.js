'use strict';

/**
 * service-contract-activated-core-linkage-wave1073.test.js — W1073.
 *
 * Links beneficiary service-contract activation into the unified core
 * (per-beneficiary CareTimeline). Moving a contract draft → active emits
 * beneficiary-contract.beneficiary_contract.activated → CareTimeline
 * 'service_contract_activated' (administrative; success). Anchors the
 * enrollment / renewal milestone on the beneficiary's timeline.
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let BeneficiaryContract;
let CareTimeline;
let integrationBus;
let seq = 0;

async function waitForTimeline(query, { timeout = 4000, interval = 25 } = {}) {
  const start = Date.now();

  while (true) {
    const row = await CareTimeline.findOne(query);
    if (row) return row;
    if (Date.now() - start > timeout) return null;
    await new Promise(r => setTimeout(r, interval));
  }
}

function baseContract(overrides = {}) {
  const now = Date.now();
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    contractNumber: `SC-${now}-${++seq}`,
    startDate: new Date(now),
    endDate: new Date(now + 365 * 24 * 60 * 60 * 1000),
    totalAmount: 24000,
    currency: 'SAR',
    status: 'draft',
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1073-service-contract' } });
  await mongoose.connect(mongod.getUri());

  ({ BeneficiaryContract } = require('../models/BeneficiaryContract'));
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
  await Promise.all([BeneficiaryContract.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1073 — activated service contracts reach the unified-core timeline', () => {
  it('activating a contract lands a service_contract_activated row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const c = await BeneficiaryContract.create(baseContract({ beneficiaryId }));

    c.status = 'active';
    await c.save();

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'service_contract_activated' });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('administrative');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.contractId)).toBe(String(c._id));
    expect(tl.metadata.contractNumber).toBe(c.contractNumber);
    expect(tl.metadata.currency).toBe('SAR');
  });

  it('a contract created directly as active also lands a row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const c = await BeneficiaryContract.create(baseContract({ beneficiaryId, status: 'active' }));

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'service_contract_activated' });
    expect(tl).toBeTruthy();
    expect(String(tl.metadata.contractId)).toBe(String(c._id));
  });

  it('a draft contract does not create a timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await BeneficiaryContract.create(baseContract({ beneficiaryId, status: 'draft' }));

    await new Promise(r => setTimeout(r, 250));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId,
        eventType: 'service_contract_activated',
      })
    ).toBe(0);
  });

  it('re-saving an active contract does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const c = await BeneficiaryContract.create(baseContract({ beneficiaryId }));
    c.status = 'active';
    await c.save();

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'service_contract_activated' });
    expect(tl).toBeTruthy();

    const again = await BeneficiaryContract.findById(c._id);
    again.notes = 'addendum signed';
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId,
        eventType: 'service_contract_activated',
      })
    ).toBe(1);
  });
});

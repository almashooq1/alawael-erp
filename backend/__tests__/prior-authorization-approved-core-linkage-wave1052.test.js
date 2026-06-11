'use strict';

/**
 * prior-authorization-approved-core-linkage-wave1052.test.js — W1052.
 *
 * Links insurance prior-authorization APPROVAL into the unified core
 * (per-beneficiary CareTimeline). When a PriorAuthorization reaches status
 * 'approved' the model emits prior-authorization.prior_authorization.approved
 * → CareTimeline 'prior_authorization_approved' (administrative/success).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let PriorAuthorization;
let CareTimeline;
let integrationBus;

async function waitForTimeline(query, { timeout = 4000, interval = 25 } = {}) {
  const start = Date.now();

  while (true) {
    const row = await CareTimeline.findOne(query);
    if (row) return row;
    if (Date.now() - start > timeout) return null;
    await new Promise(r => setTimeout(r, interval));
  }
}

let seq = 0;
function baseAuth(overrides = {}) {
  seq += 1;
  const tag = `w1052-${Date.now()}-${seq}`;
  return {
    branchId: new mongoose.Types.ObjectId(),
    authNumber: `AUTH-${tag}`,
    authUuid: `auid-${tag}`,
    uuid: `uuid-${tag}`,
    policyId: new mongoose.Types.ObjectId(),
    beneficiaryId: new mongoose.Types.ObjectId(),
    serviceType: 'physiotherapy',
    clinicalJustification: 'Medically necessary per care plan.',
    status: 'pending',
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1052-prior-auth-core' } });
  await mongoose.connect(mongod.getUri());

  PriorAuthorization = require('../models/PriorAuthorization');
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
  await Promise.all([PriorAuthorization.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1052 — prior-authorization approval reaches the unified-core timeline', () => {
  it('approving an auth lands a prior_authorization_approved row (administrative/success)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const a = await PriorAuthorization.create(baseAuth({ beneficiaryId }));

    a.status = 'approved';
    await a.save();

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'prior_authorization_approved',
    });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('administrative');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.authorizationId)).toBe(String(a._id));
  });

  it('a pending (non-approved) auth produces NO timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await PriorAuthorization.create(baseAuth({ beneficiaryId, status: 'pending' }));

    await new Promise(r => setTimeout(r, 200));
    expect(await CareTimeline.countDocuments({ eventType: 'prior_authorization_approved' })).toBe(
      0
    );
  });

  it('re-saving an already-approved auth does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const a = await PriorAuthorization.create(baseAuth({ beneficiaryId, status: 'approved' }));

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'prior_authorization_approved',
    });
    expect(tl).toBeTruthy();

    const again = await PriorAuthorization.findById(a._id);
    again.notes = 'Filed with NPHIES.';
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId,
        eventType: 'prior_authorization_approved',
      })
    ).toBe(1);
  });
});

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

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let PriorAuthorization;
let CareTimeline;
let integrationBus;

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

    const tlRows = await waitForRows(
      {
        beneficiaryId,
        eventType: 'prior_authorization_approved',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('administrative');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.authorizationId)).toBe(String(a._id));
  });

  it('a pending (non-approved) auth produces NO timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await PriorAuthorization.create(baseAuth({ beneficiaryId, status: 'pending' }));

    await waitForCount({ eventType: 'prior_authorization_approved' }, 0);
  });

  it('re-saving an already-approved auth does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const a = await PriorAuthorization.create(baseAuth({ beneficiaryId, status: 'approved' }));

    const tlRows = await waitForRows(
      {
        beneficiaryId,
        eventType: 'prior_authorization_approved',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    const again = await PriorAuthorization.findById(a._id);
    again.notes = 'Filed with NPHIES.';
    await again.save();
    await waitForCount(
      {
        beneficiaryId,
        eventType: 'prior_authorization_approved',
      },
      1
    );
  });
});

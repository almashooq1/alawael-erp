'use strict';

/**
 * family-visit-approved-core-linkage-wave1079.test.js — W1079.
 *
 * Links the family-engagement milestone (a parent-visit request to
 * observe a session is approved) into the unified core. A
 * FamilyVisitRequest transitioning to status 'approved' emits
 * family-visit.family_visit.approved → CareTimeline 'family_visit_approved'
 * (family; success). requested / declined visits are NOT surfaced.
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let FamilyVisitRequest;
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

function baseRequest(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    parentName: 'Abu Khalid',
    parentNationalId: '1098765432',
    requestedDate: new Date(Date.now() + 86400000),
    slot: 'morning',
    sessionType: 'classroom',
    status: 'requested',
    ...overrides,
  };
}

function approvedFields() {
  return { status: 'approved', approvedByName: 'Center Manager', approvedAt: new Date() };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1079-family-visit' } });
  await mongoose.connect(mongod.getUri());

  FamilyVisitRequest = require('../models/FamilyVisitRequest');
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
  await Promise.all([FamilyVisitRequest.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1079 — approved family visits reach the unified-core timeline', () => {
  it('approving a visit lands a family_visit_approved row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const r = await FamilyVisitRequest.create(baseRequest({ beneficiaryId, ...approvedFields() }));

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'family_visit_approved' });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('family');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.requestId)).toBe(String(r._id));
    expect(tl.metadata.slot).toBe('morning');
  });

  it('a requested (not yet approved) visit does NOT create a timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await FamilyVisitRequest.create(baseRequest({ beneficiaryId }));

    await new Promise(r => setTimeout(r, 250));
    expect(
      await CareTimeline.countDocuments({ beneficiaryId, eventType: 'family_visit_approved' })
    ).toBe(0);
  });

  it('approving a previously-requested visit fires on transition', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const r = await FamilyVisitRequest.create(baseRequest({ beneficiaryId }));
    expect(
      await CareTimeline.countDocuments({ beneficiaryId, eventType: 'family_visit_approved' })
    ).toBe(0);

    r.status = 'approved';
    r.approvedByName = 'Center Manager';
    r.approvedAt = new Date();
    await r.save();

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'family_visit_approved' });
    expect(tl).toBeTruthy();
  });

  it('re-saving an approved visit does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const r = await FamilyVisitRequest.create(baseRequest({ beneficiaryId, ...approvedFields() }));

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'family_visit_approved' });
    expect(tl).toBeTruthy();

    const again = await FamilyVisitRequest.findById(r._id);
    again.staffObservationNotes = 'visit went well';
    await again.save();
    await new Promise(rr => setTimeout(rr, 200));
    expect(
      await CareTimeline.countDocuments({ beneficiaryId, eventType: 'family_visit_approved' })
    ).toBe(1);
  });
});

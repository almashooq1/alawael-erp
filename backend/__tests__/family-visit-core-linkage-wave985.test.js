'use strict';

/**
 * family-visit-core-linkage-wave985.test.js — W985.
 *
 * Wires family engagement onto the unified-core timeline: a completed family
 * visit (positive, success) and a no-show (disengagement, warning). Producer:
 * native FamilyVisitRequest post-save hook (status flip to completed / no_show).
 * RUNTIME end-to-end against a real in-memory Mongo + the real integration bus +
 * real subscribers. Reuses the existing 'family_meeting' CareTimeline eventType.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let FamilyVisit, CareTimeline;

async function waitForTimeline(query, { timeout = 4000, interval = 25 } = {}) {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const row = await CareTimeline.findOne(query);
    if (row) return row;
    if (Date.now() - start > timeout) return null;
    await new Promise(r => setTimeout(r, interval));
  }
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w985-familyvisit' } });
  await mongoose.connect(mongod.getUri());
  FamilyVisit = require('../models/FamilyVisitRequest');
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
  await Promise.all([FamilyVisit.deleteMany({}), CareTimeline.deleteMany({})]);
});

function newVisit(extra = {}) {
  return FamilyVisit.create({
    beneficiaryId: new mongoose.Types.ObjectId(),
    parentName: 'أبو سالم',
    parentNationalId: '1234567890',
    relationship: 'father',
    requestedDate: new Date(),
    slot: 'morning',
    ...extra,
  });
}

describe('W985 — family visits reach the unified-core timeline', () => {
  it('a requested visit produces no timeline row until it completes', async () => {
    const v = await newVisit();
    await new Promise(r => setTimeout(r, 150));
    expect(await CareTimeline.countDocuments({ beneficiaryId: v.beneficiaryId })).toBe(0);

    const loaded = await FamilyVisit.findById(v._id);
    loaded.status = 'completed';
    await loaded.save();

    const tl = await waitForTimeline({ beneficiaryId: v.beneficiaryId, eventType: 'family_meeting' });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('family');
    expect(tl.severity).toBe('success');
  });

  it('a no-show lands a WARNING family_meeting row', async () => {
    const v = await newVisit();
    const loaded = await FamilyVisit.findById(v._id);
    loaded.status = 'no_show';
    await loaded.save();
    const tl = await waitForTimeline({ beneficiaryId: v.beneficiaryId, eventType: 'family_meeting' });
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('warning');
  });

  it('an approved (not completed) visit produces no row', async () => {
    const v = await newVisit();
    const loaded = await FamilyVisit.findById(v._id);
    loaded.status = 'approved';
    loaded.approvedAt = new Date();
    await loaded.save();
    await new Promise(r => setTimeout(r, 200));
    expect(await CareTimeline.countDocuments({ beneficiaryId: v.beneficiaryId })).toBe(0);
  });
});

'use strict';

/**
 * crisis-core-linkage-wave1004.test.js — W1004.
 *
 * Wires acute crisis incidents onto the unified-core timeline: a crisis REPORTED
 * (warning) and RESOLVED/closed (success). CrisisIncident has its own
 * active→resolved/closed lifecycle, distinct from the W977 safety events and the
 * W970 behavior incident. Producer: native CrisisIncident post-save hook (create
 * → reported; status→resolved|closed → resolved). RUNTIME end-to-end against a
 * real in-memory Mongo + the real integration bus + real subscribers. Coexists
 * with the model's existing async `pre('save')` (resolvedAt/closedAt setter).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let CrisisIncident, CareTimeline;

async function waitForTimeline(query, { timeout = 4000, interval = 25 } = {}) {
  const start = Date.now();

  while (true) {
    const row = await CareTimeline.findOne(query);
    if (row) return row;
    if (Date.now() - start > timeout) return null;
    await new Promise(r => setTimeout(r, interval));
  }
}

function newActiveCrisis(extra = {}) {
  return CrisisIncident.create({
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    crisisType: 'behavioral',
    severity: 'urgent',
    occurredAt: new Date(),
    reportedBy: new mongoose.Types.ObjectId(),
    status: 'active',
    ...extra,
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1004-crisis' } });
  await mongoose.connect(mongod.getUri());
  CrisisIncident = require('../models/CrisisIncident');
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
  await Promise.all([CrisisIncident.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1004 — acute crises reach the unified-core timeline', () => {
  it('reporting a crisis lands a WARNING crisis_reported row', async () => {
    const c = await newActiveCrisis();
    const tl = await waitForTimeline({
      beneficiaryId: c.beneficiaryId,
      eventType: 'crisis_reported',
    });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('warning');
    expect(tl.metadata.crisisType).toBe('behavioral');
  });

  it('resolving a crisis lands a SUCCESS crisis_resolved row', async () => {
    const c = await newActiveCrisis();
    await waitForTimeline({ beneficiaryId: c.beneficiaryId, eventType: 'crisis_reported' });
    const loaded = await CrisisIncident.findById(c._id);
    loaded.status = 'resolved';
    await loaded.save();
    const tl = await waitForTimeline({
      beneficiaryId: c.beneficiaryId,
      eventType: 'crisis_resolved',
    });
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('success');
  });

  it('a non-terminal transition (active → escalated) produces no resolved row', async () => {
    const c = await newActiveCrisis();
    await waitForTimeline({ beneficiaryId: c.beneficiaryId, eventType: 'crisis_reported' });
    const loaded = await CrisisIncident.findById(c._id);
    loaded.status = 'escalated';
    await loaded.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId: c.beneficiaryId,
        eventType: 'crisis_resolved',
      })
    ).toBe(0);
  });
});

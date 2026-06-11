'use strict';

/**
 * iep-activation-core-linkage-wave1045.test.js — W1045.
 *
 * Links Individual Education Plan ACTIVATION into the unified core
 * (per-beneficiary CareTimeline). When an IEP/IFSP (W200b) is signed and moves
 * to status 'active' (the education plan is now in effect), the model emits
 * iep.iep.activated → CareTimeline 'iep_activated' (clinical/success).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers):
 * asserts the OBSERVABLE EFFECT (a persisted CareTimeline row).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let IndividualEducationPlan;
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

let yearSeq = 2030;

function baseIep(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    planType: 'IEP',
    planYear: yearSeq++,
    signatures: [{ role: 'parent', name: 'Guardian One' }],
    status: 'signed',
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1045-iep-core' } });
  await mongoose.connect(mongod.getUri());

  IndividualEducationPlan = require('../models/IndividualEducationPlan');
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
  await Promise.all([IndividualEducationPlan.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1045 — IEP activation reaches the unified-core timeline', () => {
  it('activating a signed IEP lands an iep_activated row (clinical/success)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const iep = await IndividualEducationPlan.create(baseIep({ beneficiaryId }));

    iep.status = 'active';
    iep.effectiveStartDate = new Date('2026-04-01');
    await iep.save();

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'iep_activated' });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.iepId)).toBe(String(iep._id));
    expect(tl.metadata.planType).toBe('IEP');
  });

  it('a signed (non-active) IEP produces NO activation timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await IndividualEducationPlan.create(baseIep({ beneficiaryId, status: 'signed' }));

    await new Promise(r => setTimeout(r, 200));
    expect(await CareTimeline.countDocuments({ eventType: 'iep_activated' })).toBe(0);
  });

  it('re-saving an already-active IEP does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const iep = await IndividualEducationPlan.create(baseIep({ beneficiaryId }));
    iep.status = 'active';
    await iep.save();

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'iep_activated' });
    expect(tl).toBeTruthy();

    const again = await IndividualEducationPlan.findById(iep._id);
    again.strengths = 'Strong receptive language; emerging expressive vocabulary.';
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(await CareTimeline.countDocuments({ beneficiaryId, eventType: 'iep_activated' })).toBe(
      1
    );
  });
});

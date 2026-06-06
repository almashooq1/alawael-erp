'use strict';

/**
 * medication-core-linkage-wave981.test.js — W981.
 *
 * Wires medication administration (MAR) into the unified-core timeline:
 *   - status → 'administered'         → medication.administered (info)
 *   - status → refused/missed/held    → medication.not_given (WARNING — a dose
 *     not given is a clinical concern)
 *
 * Producer: native MedicationAdministrationRecord post-save hooks (fire on the
 * status flip away from 'scheduled'). RUNTIME end-to-end against a real
 * in-memory Mongo + the real integration bus + real subscribers.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let MAR, CareTimeline;

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
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w981-mar' } });
  await mongoose.connect(mongod.getUri());
  MAR = require('../models/MedicationAdministrationRecord');
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
  await Promise.all([MAR.deleteMany({}), CareTimeline.deleteMany({})]);
});

function newMar(extra = {}) {
  return MAR.create({
    beneficiaryId: new mongoose.Types.ObjectId(),
    medicationName: 'Paracetamol',
    route: 'oral',
    date: new Date(),
    scheduledTime: new Date(),
    ...extra,
  });
}

describe('W981 — medication administration reaches the unified-core timeline', () => {
  it('scheduled → administered lands a medication_administered row', async () => {
    const m = await newMar();
    await new Promise(r => setTimeout(r, 120));
    expect(await CareTimeline.countDocuments({ beneficiaryId: m.beneficiaryId })).toBe(0);

    const loaded = await MAR.findById(m._id);
    loaded.status = 'administered';
    loaded.actualTime = new Date();
    loaded.administeredByName = 'Nurse Sara';
    await loaded.save();

    const tl = await waitForTimeline({
      beneficiaryId: m.beneficiaryId,
      eventType: 'medication_administered',
    });
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('info');
    expect(tl.metadata.medicationName).toBe('Paracetamol');
  });

  it('scheduled → refused lands a WARNING medication_not_given row', async () => {
    const m = await newMar();
    const loaded = await MAR.findById(m._id);
    loaded.status = 'refused';
    loaded.refusalReason = 'beneficiary declined';
    await loaded.save();

    const tl = await waitForTimeline({
      beneficiaryId: m.beneficiaryId,
      eventType: 'medication_not_given',
    });
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('warning');
    expect(tl.metadata.status).toBe('refused');
  });

  it('scheduled → held lands a medication_not_given row', async () => {
    const m = await newMar();
    const loaded = await MAR.findById(m._id);
    loaded.status = 'held';
    await loaded.save();
    const tl = await waitForTimeline({
      beneficiaryId: m.beneficiaryId,
      eventType: 'medication_not_given',
    });
    expect(tl).toBeTruthy();
  });
});

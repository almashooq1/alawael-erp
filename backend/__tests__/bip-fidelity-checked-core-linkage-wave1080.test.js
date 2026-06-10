'use strict';

/**
 * bip-fidelity-checked-core-linkage-wave1080.test.js — W1080.
 *
 * Links the clinical milestone (a BIP fidelity check is recorded) into the
 * unified core. A new BipFidelityCheck emits
 * bip-fidelity.bip_fidelity.checked → CareTimeline 'bip_fidelity_checked'
 * (clinical; severity reflects the auto-derived banding:
 * failing→error, concerning→warning, passing→success).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let BipFidelityCheck;
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

function baseCheck(score, overrides = {}) {
  return {
    fbaAssessmentId: new mongoose.Types.ObjectId(),
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    checkedBy: new mongoose.Types.ObjectId(),
    checkedAt: new Date(),
    criteria: [{ criterion_ar: 'تطبيق الاستراتيجية', score }],
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1080-bip-fidelity' } });
  await mongoose.connect(mongod.getUri());

  BipFidelityCheck = require('../models/BipFidelityCheck');
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
  await Promise.all([BipFidelityCheck.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1080 — BIP fidelity checks reach the unified-core timeline', () => {
  it('a passing check lands a bip_fidelity_checked row (success)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const c = await BipFidelityCheck.create(baseCheck(90, { beneficiaryId }));

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'bip_fidelity_checked' });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.checkId)).toBe(String(c._id));
    expect(tl.metadata.status).toBe('passing');
    expect(tl.metadata.fidelityPercent).toBe(90);
  });

  it('a failing check is recorded with error severity', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await BipFidelityCheck.create(baseCheck(40, { beneficiaryId }));

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'bip_fidelity_checked' });
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('error');
    expect(tl.metadata.status).toBe('failing');
  });

  it('a concerning check is recorded with warning severity', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await BipFidelityCheck.create(baseCheck(70, { beneficiaryId }));

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'bip_fidelity_checked' });
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('warning');
    expect(tl.metadata.status).toBe('concerning');
  });

  it('editing an existing check does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const c = await BipFidelityCheck.create(baseCheck(90, { beneficiaryId }));

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'bip_fidelity_checked' });
    expect(tl).toBeTruthy();

    const again = await BipFidelityCheck.findById(c._id);
    again.correctiveActions_ar = 'تدريب الفريق';
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({ beneficiaryId, eventType: 'bip_fidelity_checked' })
    ).toBe(1);
  });
});

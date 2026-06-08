'use strict';

/**
 * referrals-core-linkage-wave997.test.js — W997.
 *
 * Wires the 4 fragmented referral subsystems onto ONE shared `referral` event
 * vocabulary on the unified-core timeline: accepted (info) / completed (success)
 * / rejected|declined (warning), with a `referralType` discriminator. Producers:
 * native post-save hooks in TherapyReferral / CommunityReferral / MedicalReferral
 * / Referral (FHIR portal). RUNTIME end-to-end against a real in-memory Mongo +
 * the real integration bus + real subscribers → `referral` CareTimeline rows.
 *
 * Covers both field-name variants (`beneficiary` and `beneficiaryId`) and the
 * coexistence with each model's pre-existing hooks (Medical's async pre-save,
 * Community's pre-find soft-delete).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let TherapyReferral, CommunityReferral, MedicalReferral, Referral, CareTimeline;
let seq = 0;

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
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w997-referrals' } });
  await mongoose.connect(mongod.getUri());
  TherapyReferral = require('../models/TherapyReferral');
  CommunityReferral = require('../models/CommunityReferral');
  ({ MedicalReferral } = require('../models/medicalReferral.model'));
  ({ Referral } = require('../models/Referral'));
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
  await Promise.all([
    TherapyReferral.deleteMany({}),
    CommunityReferral.deleteMany({}),
    MedicalReferral.deleteMany({}),
    Referral.deleteMany({}),
    CareTimeline.deleteMany({}),
  ]);
});

describe('W997 — all 4 referral subsystems reach the unified-core timeline', () => {
  it('TherapyReferral (beneficiary field): declined → WARNING referral row', async () => {
    const ben = new mongoose.Types.ObjectId();
    const r = await TherapyReferral.create({
      referrer: new mongoose.Types.ObjectId(),
      beneficiary: ben,
      reason: 'speech eval',
      status: 'pending',
    });
    const loaded = await TherapyReferral.findById(r._id);
    loaded.status = 'declined';
    await loaded.save();
    const tl = await waitForTimeline({ beneficiaryId: ben, eventType: 'referral' });
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('warning');
    expect(tl.metadata.referralType).toBe('therapy');
  });

  it('CommunityReferral (beneficiaryId field): accepted → INFO referral row', async () => {
    const ben = new mongoose.Types.ObjectId();
    const r = await CommunityReferral.create({
      branchId: new mongoose.Types.ObjectId(),
      beneficiaryId: ben,
      beneficiaryName: 'سالم',
      referralType: 'external',
      referralDate: new Date(),
      reasonForReferral: 'vocational support',
      status: 'pending',
    });
    const loaded = await CommunityReferral.findById(r._id);
    loaded.status = 'accepted';
    await loaded.save();
    const tl = await waitForTimeline({ beneficiaryId: ben, eventType: 'referral' });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('info');
    expect(tl.metadata.referralType).toBe('community');
  });

  it('MedicalReferral (coexists with async pre-save): completed → SUCCESS referral row', async () => {
    const ben = new mongoose.Types.ObjectId();
    const r = await MedicalReferral.create({
      beneficiary: ben,
      referralType: 'consultation',
      status: 'draft',
    });
    const loaded = await MedicalReferral.findById(r._id);
    loaded.status = 'completed';
    await loaded.save();
    const tl = await waitForTimeline({ beneficiaryId: ben, eventType: 'referral' });
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('success');
    expect(tl.metadata.referralType).toBe('medical');
  });

  it('Referral (FHIR portal, optional beneficiary present): rejected → WARNING referral row', async () => {
    const ben = new mongoose.Types.ObjectId();
    seq += 1;
    const r = await Referral.create({
      uuid: `uuid-test-${seq}`,
      branch: new mongoose.Types.ObjectId(),
      patientName: 'Ahmed',
      referringFacility: new mongoose.Types.ObjectId(),
      specialtyRequired: 'neurology',
      referralReason: 'second opinion',
      beneficiary: ben,
      status: 'received',
    });
    const loaded = await Referral.findById(r._id);
    loaded.status = 'rejected';
    await loaded.save();
    const tl = await waitForTimeline({ beneficiaryId: ben, eventType: 'referral' });
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('warning');
    expect(tl.metadata.referralType).toBe('portal');
  });

  it('a non-outcome status change (TherapyReferral → cancelled) produces no row', async () => {
    const ben = new mongoose.Types.ObjectId();
    const r = await TherapyReferral.create({
      referrer: new mongoose.Types.ObjectId(),
      beneficiary: ben,
      reason: 'x',
      status: 'pending',
    });
    const loaded = await TherapyReferral.findById(r._id);
    loaded.status = 'cancelled';
    await loaded.save();
    await new Promise(r2 => setTimeout(r2, 200));
    expect(await CareTimeline.countDocuments({ beneficiaryId: ben })).toBe(0);
  });
});

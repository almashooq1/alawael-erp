'use strict';

/**
 * consent-core-linkage-wave1002.test.js — W1002.
 *
 * Wires consent lifecycle (PDPL/CRPD) onto the unified-core timeline: a consent
 * OBTAINED (granted — care/data processing permitted, success) and a consent
 * REVOKED (withdrawn — access at risk, warning). Producer: native Consent
 * post-save hook. Fills the CareTimeline's long-declared-but-producerless
 * `consent_obtained` enum value + a new `consent_revoked`. RUNTIME end-to-end
 * against a real in-memory Mongo + the real integration bus + real subscribers.
 *
 * The append-only model has no `status` enum: the pre-save captures `isNew` (so a
 * later metadata re-save does NOT re-fire `obtained`) and post-init captures the
 * prior `revokedAt` (so a revoke fires exactly once).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Consent, CareTimeline;

async function waitForTimeline(query, { timeout = 4000, interval = 25 } = {}) {
  const start = Date.now();

  while (true) {
    const row = await CareTimeline.findOne(query);
    if (row) return row;
    if (Date.now() - start > timeout) return null;
    await new Promise(r => setTimeout(r, interval));
  }
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1002-consent' } });
  await mongoose.connect(mongod.getUri());
  ({ Consent } = require('../models/Consent'));
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
  await Promise.all([Consent.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1002 — consent lifecycle reaches the unified-core timeline', () => {
  it('granting consent lands a SUCCESS consent_obtained row', async () => {
    const ben = new mongoose.Types.ObjectId();
    await Consent.create({ beneficiaryId: ben, type: 'treatment' });
    const tl = await waitForTimeline({ beneficiaryId: ben, eventType: 'consent_obtained' });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('administrative');
    expect(tl.severity).toBe('success');
    expect(tl.metadata.consentType).toBe('treatment');
  });

  it('revoking consent lands a WARNING consent_revoked row', async () => {
    const ben = new mongoose.Types.ObjectId();
    const c = await Consent.create({ beneficiaryId: ben, type: 'data_sharing' });
    // wait for the obtained row, then revoke
    await waitForTimeline({ beneficiaryId: ben, eventType: 'consent_obtained' });
    const loaded = await Consent.findById(c._id);
    loaded.revokedAt = new Date();
    loaded.revokedReason = 'guardian withdrew';
    await loaded.save();
    const tl = await waitForTimeline({ beneficiaryId: ben, eventType: 'consent_revoked' });
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('warning');
  });

  it('a metadata-only re-save (no revoke) does NOT re-fire — exactly one row', async () => {
    const ben = new mongoose.Types.ObjectId();
    const c = await Consent.create({ beneficiaryId: ben, type: 'photography' });
    await waitForTimeline({ beneficiaryId: ben, eventType: 'consent_obtained' });
    const loaded = await Consent.findById(c._id);
    loaded.signatureRef = 'sig-abc';
    await loaded.save();
    await new Promise(r => setTimeout(r, 200));
    expect(await CareTimeline.countDocuments({ beneficiaryId: ben })).toBe(1);
  });
});

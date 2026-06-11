'use strict';

/**
 * consent-granted-core-linkage-wave1087.test.js — W1087.
 *
 * Links the governance milestone (a documented consent was granted for a
 * beneficiary) into the unified core. A new non-revoked Consent emits
 * consent-record.consent_record.granted → CareTimeline 'consent_record_granted'
 * (administrative/success). Revoking later, and rows imported already-revoked,
 * don't fire.
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Consent;
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

function consent(beneficiaryId, type, overrides = {}) {
  return {
    beneficiaryId,
    type,
    grantedAt: new Date(),
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1087-consent' } });
  await mongoose.connect(mongod.getUri());

  ({ Consent } = require('../models/Consent'));
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
  await Promise.all([Consent.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1087 — granted consents reach the unified-core timeline', () => {
  it('a new consent grant lands an administrative timeline row (success)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const c = await Consent.create(
      consent(beneficiaryId, 'treatment', {
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      })
    );

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'consent_record_granted' });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('administrative');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.consentId)).toBe(String(c._id));
    expect(tl.metadata.type).toBe('treatment');
    expect(tl.title).toContain('treatment');
    expect(tl.title).toContain('expires');
  });

  it('a consent imported already-revoked does not fire', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await Consent.create(
      consent(beneficiaryId, 'photography', {
        revokedAt: new Date(),
        revokedReason: 'legacy import already withdrawn',
      })
    );

    await new Promise(r => setTimeout(r, 250));
    expect(
      await CareTimeline.countDocuments({ beneficiaryId, eventType: 'consent_record_granted' })
    ).toBe(0);
  });

  it('revoking an existing consent later does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const c = await Consent.create(consent(beneficiaryId, 'data_sharing'));

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'consent_record_granted' });
    expect(tl).toBeTruthy();

    const again = await Consent.findById(c._id);
    again.revokedAt = new Date();
    again.revokedReason = 'guardian withdrew';
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({ beneficiaryId, eventType: 'consent_record_granted' })
    ).toBe(1);
  });

  it('records grants per beneficiary independently', async () => {
    const a = new mongoose.Types.ObjectId();
    const b = new mongoose.Types.ObjectId();
    await Consent.create(consent(a, 'treatment'));
    await Consent.create(consent(b, 'research'));

    const tlA = await waitForTimeline({ beneficiaryId: a, eventType: 'consent_record_granted' });
    const tlB = await waitForTimeline({ beneficiaryId: b, eventType: 'consent_record_granted' });
    expect(tlA).toBeTruthy();
    expect(tlB).toBeTruthy();
    expect(tlB.metadata.type).toBe('research');
  });
});

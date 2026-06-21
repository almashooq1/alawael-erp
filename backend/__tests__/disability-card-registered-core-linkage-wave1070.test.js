'use strict';

/**
 * disability-card-registered-core-linkage-wave1070.test.js — W1070.
 *
 * Links beneficiary disability-card registration ("بطاقة الإعاقة") into the
 * unified core (per-beneficiary CareTimeline). Registering an active card
 * emits disability-card.disability_card.registered → CareTimeline
 * 'disability_card_registered' (administrative; success). The card gates
 * government entitlements/subsidies.
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let BeneficiaryDisabilityCard;
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

async function waitForNoTimeline(query, { timeout = 2000, interval = 25 } = {}) {
  const start = Date.now();

  while (true) {
    const count = await CareTimeline.countDocuments(query);
    if (count === 0 && Date.now() - start > 150) {
      // Give a small grace window after the row is absent to catch late writers.
      return true;
    }
    if (Date.now() - start > timeout) return count === 0;
    await new Promise(r => setTimeout(r, interval));
  }
}

function baseCard(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    nationalId: String(1000000000 + Math.floor(Math.random() * 8999999999)),
    cardNumber: 'DC-0001',
    disabilityLevel: 'moderate',
    disabilityTypes: ['cognitive'],
    issuedDate: new Date(),
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    monthlySubsidySAR: 1500,
    status: 'active',
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1070-disability-card' } });
  await mongoose.connect(mongod.getUri());

  BeneficiaryDisabilityCard = require('../models/BeneficiaryDisabilityCard');
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
  await Promise.all([BeneficiaryDisabilityCard.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1070 — registered disability cards reach the unified-core timeline', () => {
  it('registering an active card lands a disability_card_registered row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const card = await BeneficiaryDisabilityCard.create(baseCard({ beneficiaryId }));

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'disability_card_registered' });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('administrative');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.cardId)).toBe(String(card._id));
    expect(tl.metadata.disabilityLevel).toBe('moderate');
    expect(tl.metadata.monthlySubsidySAR).toBe(1500);
  });

  it('a card carries its expiry + branch through to the timeline', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    await BeneficiaryDisabilityCard.create(baseCard({ beneficiaryId, branchId }));

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'disability_card_registered' });
    expect(tl).toBeTruthy();
    expect(String(tl.branchId)).toBe(String(branchId));
    expect(tl.metadata.expiryDate).toBeTruthy();
  });

  it('an expired card does not create a timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await BeneficiaryDisabilityCard.create(baseCard({ beneficiaryId, status: 'expired' }));

    const absent = await waitForNoTimeline({
      beneficiaryId,
      eventType: 'disability_card_registered',
    });
    expect(absent).toBe(true);
  });

  it('re-saving an existing card does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const card = await BeneficiaryDisabilityCard.create(baseCard({ beneficiaryId }));

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'disability_card_registered' });
    expect(tl).toBeTruthy();

    const again = await BeneficiaryDisabilityCard.findById(card._id);
    again.notes = 'verified';
    await again.save();
    // Allow a short window for any accidental duplicate event to be written.
    await new Promise(r => setTimeout(r, 300));
    expect(
      await CareTimeline.countDocuments({ beneficiaryId, eventType: 'disability_card_registered' })
    ).toBe(1);
  });
});

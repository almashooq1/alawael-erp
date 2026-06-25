'use strict';

/**
 * communication-aid-activation-core-linkage-wave1042.test.js — W1042.
 *
 * Links AAC communication-aid-profile ACTIVATION into the unified core
 * (per-beneficiary CareTimeline). When a CommunicationAidProfile (W358) reaches
 * lifecycleStatus 'active' (the beneficiary now has an active augmentative /
 * alternative communication aid in place), the model emits
 * communication-aid.communication_aid.activated → CareTimeline
 * 'communication_aid_activated' (clinical/success).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers):
 * asserts the OBSERVABLE EFFECT (a persisted CareTimeline row).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let CommunicationAidProfile;
let CareTimeline;
let integrationBus;

function baseProfile(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    vocabularyLevel: 'single_word',
    lifecycleStatus: 'draft',
    ...overrides,
  };
}

async function activate(profile) {
  profile.lifecycleStatus = 'active';
  profile.primaryModality = 'pecs';
  profile.activeModalities = ['pecs'];
  profile.assessedByName = 'Lead SLP';
  profile.assessedByDiscipline = 'SLP';
  profile.assessedAt = new Date();
  await profile.save();
  return profile;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({
    instance: { dbName: 'w1042-communication-aid-core' },
  });
  await mongoose.connect(mongod.getUri());

  CommunicationAidProfile = require('../models/CommunicationAidProfile');
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
  await Promise.all([CommunicationAidProfile.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1042 — AAC communication aid activation reaches the unified-core timeline', () => {
  it('activating an AAC profile lands a communication_aid_activated row (clinical/success)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const profile = await activate(
      await CommunicationAidProfile.create(baseProfile({ beneficiaryId }))
    );

    const tlRows = await waitForRows(
      { beneficiaryId, eventType: 'communication_aid_activated' },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.profileId)).toBe(String(profile._id));
    expect(tl.metadata.primaryModality).toBe('pecs');
  });

  it('a draft AAC profile produces NO activation timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await CommunicationAidProfile.create(baseProfile({ beneficiaryId, lifecycleStatus: 'draft' }));

    await waitForCount({ eventType: 'communication_aid_activated' }, 0);
  });

  it('re-saving an already-active profile does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const profile = await activate(
      await CommunicationAidProfile.create(baseProfile({ beneficiaryId }))
    );

    const tlRows = await waitForRows(
      { beneficiaryId, eventType: 'communication_aid_activated' },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    const again = await CommunicationAidProfile.findById(profile._id);
    again.receptiveLevelDescription = 'Follows 1-step instructions.';
    await again.save();
    await waitForCount({ beneficiaryId, eventType: 'communication_aid_activated' }, 1);
  });
});

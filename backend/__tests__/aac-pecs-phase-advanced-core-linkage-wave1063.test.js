'use strict';

/**
 * aac-pecs-phase-advanced-core-linkage-wave1063.test.js — W1063.
 *
 * Links AAC PECS protocol phase advancement into the unified core
 * (per-beneficiary CareTimeline). Setting/advancing an AAC profile's
 * PECS current phase emits aac-profile.aac_profile.pecs_phase_advanced
 * → CareTimeline 'aac_pecs_phase_advanced' (clinical, success).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let AacProfile;
let CareTimeline;
let integrationBus;

function baseProfile(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    primaryModality: 'low_tech',
    receptiveLanguageLevel: 'concrete_symbols',
    expressiveLanguageLevel: 'concrete_symbols',
    accessMethod: 'direct_selection',
    assessedAt: new Date(),
    assessedBy: new mongoose.Types.ObjectId(),
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1063-aac-pecs' } });
  await mongoose.connect(mongod.getUri());

  AacProfile = require('../models/AacProfile');
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
  await Promise.all([AacProfile.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1063 — AAC PECS phase advancement reaches the unified-core timeline', () => {
  it('setting a PECS current phase lands an aac_pecs_phase_advanced row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const p = await AacProfile.create(baseProfile({ beneficiaryId, pecsPhase: { current: 2 } }));

    const tlRows = await waitForRows(
      {
        beneficiaryId,
        eventType: 'aac_pecs_phase_advanced',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
    expect(tl.metadata.pecsPhase).toBe(2);
    expect(String(tl.metadata.profileId)).toBe(String(p._id));
  });

  it('a profile not on the PECS protocol does not create a timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await AacProfile.create(baseProfile({ beneficiaryId }));

    await waitForCount(
      {
        beneficiaryId,
        eventType: 'aac_pecs_phase_advanced',
      },
      0
    );
  });

  it('re-saving without advancing the phase does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const p = await AacProfile.create(baseProfile({ beneficiaryId, pecsPhase: { current: 1 } }));

    const tlRows = await waitForRows(
      {
        beneficiaryId,
        eventType: 'aac_pecs_phase_advanced',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    const again = await AacProfile.findById(p._id);
    again.currentVocabularySize = 40;
    await again.save();
    await waitForCount(
      {
        beneficiaryId,
        eventType: 'aac_pecs_phase_advanced',
      },
      1
    );
  });
});

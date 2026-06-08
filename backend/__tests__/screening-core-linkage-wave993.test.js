'use strict';

/**
 * screening-core-linkage-wave993.test.js — W993.
 *
 * Links the two sensory-screening ledgers into the unified core
 * (per-beneficiary CareTimeline + dashboards), following the W970/W992 pattern.
 * Pre-W993 these were standalone CRUD logs invisible to the longitudinal
 * beneficiary view:
 *   - VisionScreening   (W720) ┐
 *   - HearingScreening  (W724) ┘→ screenings.screening.completed
 *
 * A finalized sensory screening is a clinical milestone: undetected vision or
 * hearing loss silently undermines every other therapy, so the care team must
 * see it on the beneficiary timeline — not buried in a standalone grid. One
 * contract + one subscriber + one CareTimeline enum value serve BOTH modalities
 * (the `screeningType` payload field distinguishes vision from hearing).
 *
 * W993 adds, atomically, the THREE artifacts doctrine requires per event:
 *   1. SCREENING_EVENTS contract (dddEventContracts),
 *   2. `screening_completed` CareTimeline enum value + the CareTimeline
 *      subscriber,
 *   3. native pre-compile post-save PRODUCER hooks in BOTH model files that
 *      emit on finalize (new-as-finalized OR draft→finalized).
 *
 * RUNTIME end-to-end test (real in-memory Mongo, real integration bus, real
 * subscribers): we assert the OBSERVABLE EFFECT (a persisted CareTimeline row),
 * exercising produce → bus → subscribe → persist — the W349/W970 lesson that
 * static drift guards never run a `.save()` and so miss a missing producer or a
 * CareTimeline enum throw.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let VisionScreening;
let HearingScreening;
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

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w993-screening-core' } });
  await mongoose.connect(mongod.getUri());

  VisionScreening = require('../models/VisionScreening');
  HearingScreening = require('../models/HearingScreening');
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
  await Promise.all([
    VisionScreening.deleteMany({}),
    HearingScreening.deleteMany({}),
    CareTimeline.deleteMany({}),
  ]);
});

describe('W993 — Vision screenings reach the unified-core timeline', () => {
  it('a finalized vision screening lands a screening_completed row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const ev = await VisionScreening.create({
      beneficiaryId,
      date: new Date('2026-06-12T09:00:00.000Z'),
      screeningMethod: 'snellen_chart',
      outcome: 'pass',
      status: 'finalized',
      screenedBy: new mongoose.Types.ObjectId(),
      screenedAt: new Date(),
    });

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'screening_completed' });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('info'); // pass → info
    expect(tl.metadata.screeningType).toBe('vision');
    expect(String(tl.metadata.screeningId)).toBe(String(ev._id));
    expect(tl.metadata.outcome).toBe('pass');
  });

  it('a refer outcome escalates the timeline entry to warning', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await VisionScreening.create({
      beneficiaryId,
      date: new Date(),
      screeningMethod: 'lea_symbols',
      outcome: 'refer',
      referralReason: 'Reduced acuity warranting ophthalmology referral.',
      status: 'finalized',
      screenedBy: new mongoose.Types.ObjectId(),
      screenedAt: new Date(),
    });

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'screening_completed' });
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('warning'); // refer → warning
    expect(tl.metadata.screeningType).toBe('vision');
  });

  it('a draft vision screening produces NO timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await VisionScreening.create({
      beneficiaryId,
      date: new Date(),
      screeningMethod: 'observation_only',
      outcome: 'monitor',
      status: 'draft',
    });

    await new Promise(r => setTimeout(r, 200));
    const count = await CareTimeline.countDocuments({
      beneficiaryId,
      eventType: 'screening_completed',
    });
    expect(count).toBe(0);
  });

  it('finalizing a previously-draft screening fires exactly once', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const ev = await VisionScreening.create({
      beneficiaryId,
      date: new Date(),
      screeningMethod: 'hotv',
      outcome: 'monitor',
      status: 'draft',
    });
    await new Promise(r => setTimeout(r, 100));
    expect(
      await CareTimeline.countDocuments({ beneficiaryId, eventType: 'screening_completed' })
    ).toBe(0);

    const reloaded = await VisionScreening.findById(ev._id);
    reloaded.status = 'finalized';
    reloaded.screenedBy = new mongoose.Types.ObjectId();
    reloaded.screenedAt = new Date();
    await reloaded.save();

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'screening_completed' });
    expect(tl).toBeTruthy();

    // Re-saving a finalized screening must NOT re-fire (status unchanged).
    const again = await VisionScreening.findById(ev._id);
    again.outcome = 'refer';
    again.referralReason = 'Follow-up referral on re-review.';
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({ beneficiaryId, eventType: 'screening_completed' })
    ).toBe(1);
  });
});

describe('W993 — Hearing screenings reach the unified-core timeline', () => {
  it('a finalized hearing screening lands a screening_completed row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const ev = await HearingScreening.create({
      beneficiaryId,
      date: new Date('2026-06-13T10:00:00.000Z'),
      screeningMethod: 'pure_tone_audiometry',
      outcome: 'monitor',
      status: 'finalized',
      screenedBy: new mongoose.Types.ObjectId(),
      screenedAt: new Date(),
    });

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'screening_completed' });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('info'); // monitor → info
    expect(tl.metadata.screeningType).toBe('hearing');
    expect(String(tl.metadata.screeningId)).toBe(String(ev._id));
    expect(tl.metadata.screeningMethod).toBe('pure_tone_audiometry');
  });

  it('a refer outcome escalates the hearing timeline entry to warning', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await HearingScreening.create({
      beneficiaryId,
      date: new Date(),
      screeningMethod: 'oae',
      outcome: 'refer',
      referralReason: 'Absent OAE response warranting audiology referral.',
      status: 'finalized',
      screenedBy: new mongoose.Types.ObjectId(),
      screenedAt: new Date(),
    });

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'screening_completed' });
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('warning');
    expect(tl.metadata.screeningType).toBe('hearing');
  });
});

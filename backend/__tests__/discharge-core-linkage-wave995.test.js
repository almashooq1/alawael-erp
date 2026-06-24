'use strict';

/**
 * discharge-core-linkage-wave995.test.js — W995.
 *
 * Links the DischargePlan (rehab-advanced) into the unified core
 * (per-beneficiary CareTimeline), following the W970/W992/W993/W994 pattern.
 * Completing a discharge plan is a TERMINAL milestone of the episode of care:
 *   - DischargePlan.status === 'completed' → discharge.discharge.completed
 *
 * Pre-W995 a completed discharge was a standalone CRUD record invisible to the
 * longitudinal beneficiary view. W995 adds the three artifacts doctrine
 * requires per event:
 *   1. DISCHARGE_EVENTS contract (dddEventContracts),
 *   2. `discharge_completed` CareTimeline enum value + the subscriber,
 *   3. native pre-compile post-save PRODUCER hooks that emit exactly once when
 *      status reaches 'completed' (new-as-completed OR …→completed).
 *
 * RUNTIME end-to-end test (real in-memory Mongo, real integration bus, real
 * subscribers): asserts the OBSERVABLE EFFECT (a persisted CareTimeline row),
 * exercising produce → bus → subscribe → persist.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let DischargePlan;
let CareTimeline;
let integrationBus;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w995-discharge-core' } });
  await mongoose.connect(mongod.getUri());

  DischargePlan = require('../models/rehab-advanced/DischargePlan.model');
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
  await Promise.all([DischargePlan.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W995 — Discharge completion reaches the unified-core timeline', () => {
  it('a completed discharge plan lands a discharge_completed row (success)', async () => {
    const beneficiary_id = new mongoose.Types.ObjectId();
    const plan = await DischargePlan.create({
      beneficiary_id,
      discharge_info: {
        discharge_type: 'completed_program',
        actual_discharge_date: new Date('2026-06-30T00:00:00.000Z'),
      },
      final_assessment: { overall_progress_rating: 4 },
      status: 'completed',
    });

    const tlRows = await waitForRows(
      {
        beneficiaryId: beneficiary_id,
        eventType: 'discharge_completed',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.dischargePlanId)).toBe(String(plan._id));
    expect(tl.metadata.dischargeType).toBe('completed_program');
    expect(tl.metadata.overallProgressRating).toBe(4);
  });

  it('a planning-stage discharge plan produces NO timeline row', async () => {
    const beneficiary_id = new mongoose.Types.ObjectId();
    await DischargePlan.create({
      beneficiary_id,
      discharge_info: { discharge_type: 'transferred' },
      status: 'planning',
    });

    await waitForCount(
      {
        beneficiaryId: beneficiary_id,
        eventType: 'discharge_completed',
      },
      0
    );
  });

  it('transitioning in_progress→completed fires exactly once', async () => {
    const beneficiary_id = new mongoose.Types.ObjectId();
    const plan = await DischargePlan.create({
      beneficiary_id,
      discharge_info: { discharge_type: 'aging_out' },
      status: 'in_progress',
    });
    await waitForCount(
      {
        beneficiaryId: beneficiary_id,
        eventType: 'discharge_completed',
      },
      0
    );

    const reloaded = await DischargePlan.findById(plan._id);
    reloaded.status = 'completed';
    await reloaded.save();

    const tlRows = await waitForRows(
      {
        beneficiaryId: beneficiary_id,
        eventType: 'discharge_completed',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    // Re-saving without a status change must NOT re-fire.
    const again = await DischargePlan.findById(plan._id);
    again.discharge_info.reason = 'Reached maximum age for the program.';
    await again.save();
    await waitForCount(
      {
        beneficiaryId: beneficiary_id,
        eventType: 'discharge_completed',
      },
      1
    );
  });
});

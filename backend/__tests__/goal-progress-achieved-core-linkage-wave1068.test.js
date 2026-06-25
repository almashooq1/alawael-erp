'use strict';

/**
 * goal-progress-achieved-core-linkage-wave1068.test.js — W1068.
 *
 * Links rehab-goal achievement into the unified core (per-beneficiary
 * CareTimeline). A progress snapshot recording the goal reaching ≥ 100%
 * emits goal-progress.goal_progress.goal_achieved → CareTimeline
 * 'goal_progress_achieved' (clinical/success).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let GoalProgressSnapshot;
let CareTimeline;
let integrationBus;

function baseSnapshot(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    goalName: 'Independent feeding',
    progressPct: 60,
    measuredAt: new Date(),
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1068-goal-progress' } });
  await mongoose.connect(mongod.getUri());

  ({ GoalProgressSnapshot } = require('../models/GoalProgressSnapshot'));
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
  await Promise.all([GoalProgressSnapshot.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1068 — achieved goals reach the unified-core timeline', () => {
  it('a snapshot at 100% lands a goal_progress_achieved row (success)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const s = await GoalProgressSnapshot.create(baseSnapshot({ beneficiaryId, progressPct: 100 }));

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'goal_progress_achieved' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.snapshotId)).toBe(String(s._id));
    expect(tl.metadata.goalName).toBe('Independent feeding');
  });

  it('a snapshot exceeding target (>100%) also fires', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await GoalProgressSnapshot.create(baseSnapshot({ beneficiaryId, progressPct: 110 }));

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'goal_progress_achieved' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.metadata.progressPct).toBe(110);
  });

  it('a below-target snapshot does not create a timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await GoalProgressSnapshot.create(baseSnapshot({ beneficiaryId, progressPct: 80 }));

    await waitForCount({ beneficiaryId, eventType: 'goal_progress_achieved' }, 0);
  });

  it('editing an existing achieved snapshot does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const s = await GoalProgressSnapshot.create(baseSnapshot({ beneficiaryId, progressPct: 100 }));

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'goal_progress_achieved' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    const again = await GoalProgressSnapshot.findById(s._id);
    again.notes = 'verified';
    await again.save();
    await waitForCount({ beneficiaryId, eventType: 'goal_progress_achieved' }, 1);
  });
});

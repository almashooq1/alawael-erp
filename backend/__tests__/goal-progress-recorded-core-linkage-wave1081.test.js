'use strict';

/**
 * goal-progress-recorded-core-linkage-wave1081.test.js — W1081.
 *
 * Links the clinical milestone (a goal progress entry is recorded) into the
 * unified core. A new GoalProgressEntry emits
 * goal-entry.goal_entry.recorded → CareTimeline 'goal_progress_recorded'
 * (clinical / info). Edits don't re-fire.
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let GoalProgressEntry;
let CareTimeline;
let integrationBus;

function baseEntry(overrides = {}) {
  return {
    carePlanId: new mongoose.Types.ObjectId(),
    goalId: new mongoose.Types.ObjectId(),
    beneficiaryId: new mongoose.Types.ObjectId(),
    progressPercent: 40,
    recordedAt: new Date(),
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1081-goal-entry' } });
  await mongoose.connect(mongod.getUri());

  GoalProgressEntry = require('../models/GoalProgressEntry');
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
  await Promise.all([GoalProgressEntry.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1081 — goal progress entries reach the unified-core timeline', () => {
  it('a new progress entry lands a goal_progress_recorded row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const e = await GoalProgressEntry.create(baseEntry({ beneficiaryId, progressPercent: 55 }));

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'goal_progress_recorded' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('info');
    expect(String(tl.metadata.entryId)).toBe(String(e._id));
    expect(tl.metadata.progressPercent).toBe(55);
    expect(String(tl.metadata.goalId)).toBe(String(e.goalId));
  });

  it('the timeline title surfaces the progress percentage', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await GoalProgressEntry.create(baseEntry({ beneficiaryId, progressPercent: 80 }));

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'goal_progress_recorded' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.title).toContain('80%');
  });

  it('carePlanId is carried through to the timeline metadata', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const carePlanId = new mongoose.Types.ObjectId();
    await GoalProgressEntry.create(baseEntry({ beneficiaryId, carePlanId }));

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'goal_progress_recorded' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(String(tl.metadata.carePlanId)).toBe(String(carePlanId));
  });

  it('editing an existing entry does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const e = await GoalProgressEntry.create(baseEntry({ beneficiaryId }));

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'goal_progress_recorded' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    const again = await GoalProgressEntry.findById(e._id);
    again.note = 'updated after the fact';
    await again.save();
    await waitForCount({ beneficiaryId, eventType: 'goal_progress_recorded' }, 1);
  });
});

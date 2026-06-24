'use strict';

/**
 * W1099 — StudentActivity → unified core timeline linkage.
 *
 * Completing a gamified student-portal activity (status → completed)
 * publishes `student-activity.student_activity.completed`, which the DDD
 * cross-module subscriber materialises into a per-beneficiary CareTimeline
 * row (category: clinical, severity: success). Pending / skipped activities
 * stay off the longitudinal record.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const StudentActivity = require('../models/StudentActivity');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');

const { integrationBus } = require('../integration/systemIntegrationBus');
const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: { dbName: 'w1099-student-activity' },
  });
  await mongoose.connect(mongoServer.getUri());
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  await StudentActivity.deleteMany({});
  await CareTimeline.deleteMany({});
});

function activity(beneficiaryId, overrides = {}) {
  return {
    beneficiaryId,
    titleAr: 'تمرين نطق يومي',
    kind: 'SPEECH',
    xpReward: 40,
    dueAt: new Date('2026-05-03T09:00:00.000Z'),
    ...overrides,
  };
}

describe('W1099 — StudentActivity → CareTimeline linkage', () => {
  it('records a clinical timeline row when an activity is completed', async () => {
    const beneficiaryId = String(new mongoose.Types.ObjectId());
    const doc = await StudentActivity.create(activity(beneficiaryId));

    // No row yet — still pending.
    await waitForCount({ beneficiaryId }, 0);

    doc.status = 'completed';
    doc.completedAt = new Date('2026-05-03T09:30:00.000Z');
    await doc.save();

    const rowRows = await waitForRows({ beneficiaryId }, 1);
    const row = rowRows[0];
    expect(row).toBeTruthy();
    expect(row.eventType).toBe('student_activity_completed');
    expect(row.category).toBe('clinical');
    expect(row.severity).toBe('success');
    expect(String(row.metadata.activityId)).toBe(String(doc._id));
    expect(row.metadata.kind).toBe('SPEECH');
    expect(row.metadata.xpReward).toBe(40);
    expect(row.title).toContain('+40 XP');
  });

  it('does NOT fire when an activity is skipped', async () => {
    const beneficiaryId = String(new mongoose.Types.ObjectId());
    const doc = await StudentActivity.create(activity(beneficiaryId));
    doc.status = 'skipped';
    await doc.save();

    await waitForCount({ beneficiaryId }, 0);
  });

  it('does NOT fire merely on activity creation while pending', async () => {
    const beneficiaryId = String(new mongoose.Types.ObjectId());
    await StudentActivity.create(activity(beneficiaryId));

    await waitForCount({ beneficiaryId }, 0);
  });

  it('does not duplicate the timeline row on a subsequent unrelated save', async () => {
    const beneficiaryId = String(new mongoose.Types.ObjectId());
    const doc = await StudentActivity.create(activity(beneficiaryId));
    doc.status = 'completed';
    doc.completedAt = new Date();
    await doc.save();

    await waitForRows({ beneficiaryId }, 1);

    doc.descriptionAr = 'تم التحديث';
    await doc.save();
    await waitForCount({ beneficiaryId }, 1);
  });
});

'use strict';

/**
 * followup-visit-core-linkage-wave992.test.js — W992.
 *
 * Wires post-rehab follow-up *visits* onto the unified-core timeline (companion
 * to the case-level W987): an attended visit (engagement — success) and a missed
 * visit (the family didn't show — warning). Producer: native FollowUpVisit
 * post-save hook (status flip to COMPLETED / MISSED). RUNTIME end-to-end against
 * a real in-memory Mongo + the real integration bus + real subscribers →
 * `followup_visit` CareTimeline rows. eventTypes are visit.attended/visit.missed
 * (the W985 family domain owns visit.completed/no_show — eventTypes are unique).
 *
 * NOTE: the model's beneficiary ref field is `beneficiary` (not `beneficiaryId`).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let FollowUpVisit, CareTimeline;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w992-followupvisit' } });
  await mongoose.connect(mongod.getUri());
  FollowUpVisit = require('../models/post-rehab/FollowUpVisit.model');
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
  await Promise.all([FollowUpVisit.deleteMany({}), CareTimeline.deleteMany({})]);
});

// Create a fresh SCHEDULED visit (required: postRehabCase, beneficiary,
// visitNumber, visitType, scheduledDate, conductedBy).
function newScheduledVisit(extra = {}) {
  return FollowUpVisit.create({
    postRehabCase: new mongoose.Types.ObjectId(),
    beneficiary: new mongoose.Types.ObjectId(),
    visitNumber: 1,
    visitType: 'HOME_VISIT',
    scheduledDate: new Date(),
    conductedBy: new mongoose.Types.ObjectId(),
    status: 'SCHEDULED',
    ...extra,
  });
}

describe('W992 — post-rehab follow-up visits reach the unified-core timeline', () => {
  it('a scheduled visit produces no timeline row until it is attended/missed', async () => {
    const v = await newScheduledVisit();
    await waitForCount({ beneficiaryId: v.beneficiary }, 0);

    const loaded = await FollowUpVisit.findById(v._id);
    loaded.status = 'COMPLETED';
    await loaded.save();

    const tlRows = await waitForRows(
      { beneficiaryId: v.beneficiary, eventType: 'followup_visit' },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
  });

  it('a missed visit lands a WARNING followup_visit row', async () => {
    const v = await newScheduledVisit();
    const loaded = await FollowUpVisit.findById(v._id);
    loaded.status = 'MISSED';
    await loaded.save();
    const tlRows = await waitForRows(
      { beneficiaryId: v.beneficiary, eventType: 'followup_visit' },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('warning');
  });

  it('a non-terminal status change (RESCHEDULED) produces no row', async () => {
    const v = await newScheduledVisit();
    const loaded = await FollowUpVisit.findById(v._id);
    loaded.status = 'RESCHEDULED';
    await loaded.save();
    await waitForCount({ beneficiaryId: v.beneficiary }, 0);
  });
});

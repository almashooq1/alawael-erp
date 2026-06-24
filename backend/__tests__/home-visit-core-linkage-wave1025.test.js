'use strict';

/**
 * home-visit-core-linkage-wave1025.test.js — W1025.
 *
 * Links home-visit COMPLETION into the unified core (per-beneficiary
 * CareTimeline), following the W994…W1024 pattern. HomeVisit is the
 * social/family home-visit record (beneficiaryId optional on the schema, but
 * the producer only emits when present). When a visit reaches 'completed',
 * the longitudinal record must carry it as a family-engagement milestone:
 *   - HomeVisit.status === 'completed'
 *       → home-visits.home_visit.completed
 *
 * RUNTIME end-to-end test (real in-memory Mongo, real integration bus, real
 * subscribers): asserts the OBSERVABLE EFFECT (a persisted CareTimeline row).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let HomeVisit;
let CareTimeline;
let integrationBus;

function baseHomeVisit(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    assignedWorkerId: new mongoose.Types.ObjectId(),
    visitType: 'follow_up',
    scheduledFor: new Date(),
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1025-homevisit-core' } });
  await mongoose.connect(mongod.getUri());

  HomeVisit = require('../models/care/HomeVisit.model');
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
  await Promise.all([HomeVisit.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1025 — Home visit completion reaches the unified-core timeline', () => {
  it('completing a home visit lands a home_visit_completed row (family/info)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const visit = await HomeVisit.create(baseHomeVisit({ beneficiaryId, status: 'in_progress' }));

    visit.status = 'completed';
    visit.completedAt = new Date();
    visit.visitSummary = 'Family briefed; environment safe.';
    await visit.save();

    const tlRows = await waitForRows(
      {
        beneficiaryId,
        eventType: 'home_visit_completed',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('family');
    expect(tl.severity).toBe('info');
    expect(String(tl.metadata.homeVisitId)).toBe(String(visit._id));
    expect(tl.metadata.visitNumber).toBe(visit.visitNumber);
    expect(tl.metadata.visitType).toBe('follow_up');
  });

  it('a scheduled (not completed) home visit produces NO timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await HomeVisit.create(baseHomeVisit({ beneficiaryId, status: 'scheduled' }));

    await waitForCount({ eventType: 'home_visit_completed' }, 0);
  });

  it('re-saving an already-completed home visit does not re-fire', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const visit = await HomeVisit.create(baseHomeVisit({ beneficiaryId, status: 'in_progress' }));
    visit.status = 'completed';
    visit.completedAt = new Date();
    visit.visitSummary = 'Initial summary.';
    await visit.save();

    const tlRows = await waitForRows(
      {
        beneficiaryId,
        eventType: 'home_visit_completed',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    const again = await HomeVisit.findById(visit._id);
    again.visitSummary = 'Summary amended after review.';
    await again.save();
    await waitForCount(
      {
        beneficiaryId,
        eventType: 'home_visit_completed',
      },
      1
    );
  });
});

'use strict';

/**
 * W1108 — SmartScheduler → unified core timeline linkage.
 *
 * When a beneficiary's smart schedule is approved and reaches the `active`
 * status, the model publishes `smart-scheduler.smart_scheduler.activated`,
 * which the DDD cross-module subscriber materialises into one per-beneficiary
 * CareTimeline row (category: administrative, severity: success). The row is
 * never double-counted on a subsequent unrelated save.
 *
 * Doctrine: every milestone for a single beneficiary is linked to the
 * beneficiary + the unified timeline + time.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');
const { integrationBus } = require('../integration/systemIntegrationBus');
const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');

let SmartScheduler;
let mongo;

/** Build a valid SmartScheduler payload (required fields + a plan). */
function scheduler(beneficiaryId, overrides = {}) {
  return {
    beneficiaryId,
    programId: new mongoose.Types.ObjectId(),
    schedulingPlan: { frequency: 'twice-weekly' },
    ...overrides,
  };
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  SmartScheduler = require('../models/smartScheduler').model;
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

afterEach(async () => {
  await CareTimeline.deleteMany({});
  await SmartScheduler.deleteMany({});
});

/** Poll until a timeline row matching `query` exists (CI-load safe). */
async function waitForTimeline(query, { timeout = 4000, interval = 25 } = {}) {
  const start = Date.now();
  while (true) {
    const row = await CareTimeline.findOne(query);
    if (row) return row;
    if (Date.now() - start > timeout) return null;
    await new Promise(r => setTimeout(r, interval));
  }
}

describe('W1108 SmartScheduler → CareTimeline (smart_scheduler.activated)', () => {
  it('records an administrative/success row when a schedule is activated', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();

    // Created in draft → no row yet.
    const doc = await SmartScheduler.create(scheduler(beneficiaryId, { status: 'draft' }));
    await new Promise(r => setTimeout(r, 30));
    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(0);

    doc.status = 'active';
    await doc.save();
    await waitForTimeline({ beneficiaryId });

    const rows = await CareTimeline.find({ beneficiaryId });
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.eventType).toBe('smart_scheduler_activated');
    expect(row.category).toBe('administrative');
    expect(row.severity).toBe('success');
    expect(String(row.metadata.schedulerId)).toBe(String(doc._id));
    expect(row.metadata.frequency).toBe('twice-weekly');
    expect(row.title).toContain('twice-weekly');
  });

  it('fires when a schedule is created already active', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();

    await SmartScheduler.create(scheduler(beneficiaryId, { status: 'active' }));
    await waitForTimeline({ beneficiaryId });

    const rows = await CareTimeline.find({ beneficiaryId });
    expect(rows).toHaveLength(1);
    expect(rows[0].eventType).toBe('smart_scheduler_activated');
  });

  it('does not fire for non-active statuses', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();

    const doc = await SmartScheduler.create(scheduler(beneficiaryId, { status: 'draft' }));
    await new Promise(r => setTimeout(r, 30));

    doc.status = 'pending-review';
    await doc.save();
    await new Promise(r => setTimeout(r, 30));

    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(0);
  });

  it('does not duplicate the row on a later unrelated save', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();

    const doc = await SmartScheduler.create(scheduler(beneficiaryId, { status: 'active' }));
    await waitForTimeline({ beneficiaryId });

    doc.nextReviewDate = new Date();
    await doc.save();
    await new Promise(r => setTimeout(r, 30));

    const rows = await CareTimeline.find({ beneficiaryId });
    expect(rows).toHaveLength(1);
  });
});

'use strict';

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');
const { ProgramEnrollment } = require('../domains/programs/models/ProgramEnrollment');
const { integrationBus } = require('../integration/systemIntegrationBus');
const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');
const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

afterEach(async () => {
  await CareTimeline.deleteMany({});
  await ProgramEnrollment.deleteMany({});
});

/**
 * @param {mongoose.Types.ObjectId} beneficiaryId
 * @param {Record<string, unknown>} [overrides]
 */
function enrollment(beneficiaryId, overrides = {}) {
  return {
    beneficiaryId,
    programId: new mongoose.Types.ObjectId(),
    status: 'pending',
    ...overrides,
  };
}

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

describe('W1111 — ProgramEnrollment activation → unified-core CareTimeline linkage', () => {
  test('records an administrative/success timeline row when an enrollment becomes active', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const programId = new mongoose.Types.ObjectId();
    const doc = await ProgramEnrollment.create(
      enrollment(beneficiaryId, { branchId, programId, status: 'approved' })
    );

    // Approved (not active yet) → no row
    await waitForCount({}, 0);

    doc.status = 'active';
    doc.actualStartDate = new Date();
    await doc.save();
    await waitForTimeline({ beneficiaryId });

    const rows = await CareTimeline.find({ beneficiaryId }).lean();
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.eventType).toBe('program_enrollment_activated');
    expect(row.category).toBe('administrative');
    expect(row.severity).toBe('success');
    expect(String(row.metadata.enrollmentId)).toBe(String(doc._id));
    expect(String(row.metadata.programId)).toBe(String(programId));
    expect(String(row.branchId)).toBe(String(branchId));
  });

  test('fires when an enrollment is created already active', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await ProgramEnrollment.create(enrollment(beneficiaryId, { status: 'active' }));
    await waitForTimeline({ beneficiaryId });

    const rows = await CareTimeline.find({ beneficiaryId }).lean();
    expect(rows).toHaveLength(1);
    expect(rows[0].eventType).toBe('program_enrollment_activated');
  });

  test('does not fire for non-active statuses', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await ProgramEnrollment.create(enrollment(beneficiaryId));

    doc.status = 'on_hold';
    await doc.save();
    await waitForCount({ beneficiaryId }, 0);
  });

  test('does not double-record on a later unrelated save', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await ProgramEnrollment.create(enrollment(beneficiaryId, { status: 'active' }));
    await waitForTimeline({ beneficiaryId });
    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(1);

    doc.expectedEndDate = new Date(Date.now() + 86400000);
    await doc.save();
    await waitForCount({ beneficiaryId }, 1);
  });
});

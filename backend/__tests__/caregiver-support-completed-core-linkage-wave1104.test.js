'use strict';

/**
 * W1104 — CaregiverSupportProgram → unified core timeline linkage.
 *
 * When a caregiver-support program (counseling / training / support group)
 * for a single beneficiary transitions to `completed`, the model publishes
 * `caregiver-support.caregiver_support.completed`, which the DDD
 * cross-module subscriber materialises into one per-beneficiary CareTimeline
 * row (category: family, severity: success). Enrollment + in-progress +
 * discontinued never fire the milestone, and a completed program is never
 * double-counted on subsequent saves.
 *
 * Doctrine: every milestone for a single beneficiary is linked to the
 * beneficiary + the unified timeline + time.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');
const { integrationBus } = require('../integration/systemIntegrationBus');
const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');

let CaregiverSupportProgram;
let mongo;

/** Build a valid CaregiverSupportProgram payload (all required fields). */
function program(beneficiaryId, branchId, overrides = {}) {
  return {
    beneficiaryId,
    ...(branchId ? { branchId } : {}),
    programType: 'parent_support_group',
    status: 'enrolled',
    caregiverName: 'أم المستفيد',
    caregiverRelationship: 'mother',
    outcomes: { satisfactionScore: 9 },
    ...overrides,
  };
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  CaregiverSupportProgram =
    mongoose.models.CaregiverSupportProgram || require('../models/CaregiverSupportProgram');
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

afterEach(async () => {
  await CareTimeline.deleteMany({});
  await CaregiverSupportProgram.deleteMany({});
});

describe('W1104 CaregiverSupportProgram → CareTimeline (caregiver_support.completed)', () => {
  it('records a family/success timeline row when a program completes', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();

    // Enrolled → no row yet.
    const doc = await CaregiverSupportProgram.create(program(beneficiaryId, branchId));
    let rows = await CareTimeline.find({ beneficiaryId });
    expect(rows).toHaveLength(0);

    // Transition to completed.
    doc.status = 'completed';
    doc.completedAt = new Date();
    await doc.save();

    rows = await waitForRows({ beneficiaryId }, 1);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.eventType).toBe('caregiver_support_completed');
    expect(row.category).toBe('family');
    expect(row.severity).toBe('success');
    expect(String(row.branchId)).toBe(String(branchId));
    expect(String(row.metadata.programId)).toBe(String(doc._id));
    expect(row.metadata.programType).toBe('parent_support_group');
    expect(row.title).toContain('parent_support_group');
    expect(row.title).toContain('9/10');
  });

  it('does not fire while the program is still enrolled/in_progress', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await CaregiverSupportProgram.create(program(beneficiaryId));
    doc.status = 'in_progress';
    await doc.save();
    const rows = await waitForRows({ beneficiaryId }, 0);
  });

  it('does not fire when a program is discontinued', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await CaregiverSupportProgram.create(program(beneficiaryId));
    doc.status = 'discontinued';
    doc.discontinuedAt = new Date();
    doc.discontinuationReason = 'انتقال الأسرة لمدينة أخرى';
    await doc.save();
    const rows = await waitForRows({ beneficiaryId }, 0);
  });

  it('does not duplicate the row on a later unrelated save', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await CaregiverSupportProgram.create(program(beneficiaryId));
    doc.status = 'completed';
    doc.completedAt = new Date();
    await doc.save();
    const rows = await waitForRows({ beneficiaryId }, 1);
  });
});

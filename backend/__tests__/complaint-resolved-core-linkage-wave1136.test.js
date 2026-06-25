'use strict';

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');
const Complaint = require('../models/Complaint');
const { integrationBus } = require('../integration/systemIntegrationBus');
const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');

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
  await Complaint.deleteMany({});
});

/**
 * @param {Record<string, unknown>} [overrides]
 */
function complaint(overrides = {}) {
  return {
    type: 'complaint',
    source: 'parent',
    category: 'service',
    subject: 'تأخر متكرر في بدء الجلسات',
    description: 'الجلسات تبدأ متأخرة عن الموعد المحدد بشكل متكرر',
    priority: 'medium',
    status: 'new',
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    ...overrides,
  };
}

describe('W1136 — beneficiary-linked Complaint resolved → unified-core CareTimeline linkage', () => {
  test('records a complaint_resolved row when resolved via doc.save()', async () => {
    const doc = await Complaint.create(complaint({ status: 'in_progress' }));
    await waitForCount({}, 0);

    doc.status = 'resolved';
    doc.advocateInvolved = true; // W465 CRPD Art. 12 invariant requirement
    doc.resolvedAt = new Date();
    await doc.save();
    const rows = await waitForRows({ beneficiaryId: doc.beneficiaryId }, 1);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.eventType).toBe('complaint_resolved');
    expect(row.category).toBe('family');
    expect(row.severity).toBe('success');
    expect(String(row.metadata.complaintId)).toBe(String(doc._id));
    expect(row.metadata.complaintNumber).toMatch(/^CMP-/);
    expect(row.metadata.advocateInvolved).toBe(true);
    expect(String(row.branchId)).toBe(String(doc.branchId));
  });

  test('records a row when resolved via findOneAndUpdate (PUT /:id route path)', async () => {
    const doc = await Complaint.create(complaint({ status: 'under_review' }));

    const resolvedAt = new Date();
    await Complaint.findOneAndUpdate(
      { _id: doc._id },
      { status: 'resolved', resolvedAt, advocateInvolved: true },
      { returnDocument: 'after', runValidators: true }
    );
    const rows = await waitForRows({ beneficiaryId: doc.beneficiaryId }, 1);
    const row = rows[0];
    expect(row).toBeTruthy();
    expect(row.eventType).toBe('complaint_resolved');
    expect(new Date(row.metadata.resolvedAt).getTime()).toBe(resolvedAt.getTime());
  });

  test('does NOT link non-resolved transitions or non-beneficiary complaints', async () => {
    // beneficiary complaint moving through non-terminal states
    const doc = await Complaint.create(complaint());
    doc.status = 'under_review';
    await doc.save();
    await Complaint.findOneAndUpdate({ _id: doc._id }, { status: 'escalated' });

    // employee complaint (no beneficiaryId) resolved — out of scope
    await Complaint.create({
      ...complaint({
        source: 'employee',
        status: 'resolved',
        advocateInvolved: false,
      }),
      beneficiaryId: undefined,
      branchId: undefined,
    });
    await waitForCount({}, 0);
  });

  test('does not double-record on a later non-status save', async () => {
    const doc = await Complaint.create(
      complaint({ status: 'resolved', advocateInvolved: true, resolvedAt: new Date() })
    );
    await waitForCount({ beneficiaryId: doc.beneficiaryId }, 1);

    doc.priority = 'low';
    await doc.save();
    await waitForCount({ beneficiaryId: doc.beneficiaryId }, 1);
  });

  test('W465 invariant still blocks beneficiary resolution without advocate (no orphan rows)', async () => {
    const doc = await Complaint.create(complaint({ status: 'in_progress' }));
    doc.status = 'resolved';
    doc.advocateInvolved = false;
    await expect(doc.save()).rejects.toThrow(/advocateInvolved/);
    await waitForCount({}, 0);
  });
});

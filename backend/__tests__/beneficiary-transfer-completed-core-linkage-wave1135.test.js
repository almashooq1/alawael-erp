'use strict';

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');
const BeneficiaryTransfer = require('../models/BeneficiaryTransfer');
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
  await BeneficiaryTransfer.deleteMany({});
});

/**
 * @param {Record<string, unknown>} [overrides]
 */
function transfer(overrides = {}) {
  return {
    beneficiary: new mongoose.Types.ObjectId(),
    fromBranch: new mongoose.Types.ObjectId(),
    toBranch: new mongoose.Types.ObjectId(),
    requestedBy: new mongoose.Types.ObjectId(),
    reason: 'انتقال الأسرة إلى مدينة أخرى',
    transferDate: new Date(),
    status: 'pending',
    ...overrides,
  };
}

async function settle() {
  await new Promise(r => setTimeout(r, 60));
}

describe('W1135 — BeneficiaryTransfer completed → unified-core CareTimeline linkage', () => {
  test('records a transfer row when completed via doc.save() (BeneficiaryService path)', async () => {
    const doc = await BeneficiaryTransfer.create(transfer({ status: 'approved' }));
    await settle();
    expect(await CareTimeline.countDocuments({})).toBe(0); // approved alone is not the milestone

    doc.status = 'completed';
    doc.completedAt = new Date();
    await doc.save();
    await settle();

    const rows = await CareTimeline.find({ beneficiaryId: doc.beneficiary }).lean();
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.eventType).toBe('transfer');
    expect(row.category).toBe('administrative');
    expect(row.severity).toBe('info');
    expect(String(row.metadata.transferId)).toBe(String(doc._id));
    expect(String(row.metadata.fromBranchId)).toBe(String(doc.fromBranch));
    expect(String(row.metadata.toBranchId)).toBe(String(doc.toBranch));
    // Row lands in the DESTINATION branch scope
    expect(String(row.branchId)).toBe(String(doc.toBranch));
  });

  test('records a transfer row when completed via findByIdAndUpdate (branch-enhanced path)', async () => {
    const doc = await BeneficiaryTransfer.create(transfer({ status: 'approved' }));
    await settle();

    const completedAt = new Date();
    await BeneficiaryTransfer.findByIdAndUpdate(doc._id, {
      status: 'completed',
      completedAt,
    });
    await settle();

    const row = await CareTimeline.findOne({ beneficiaryId: doc.beneficiary }).lean();
    expect(row).toBeTruthy();
    expect(row.eventType).toBe('transfer');
    expect(new Date(row.metadata.completedAt).getTime()).toBe(completedAt.getTime());
    expect(String(row.branchId)).toBe(String(doc.toBranch));
  });

  test('does NOT link pending/approved/rejected transitions', async () => {
    const doc = await BeneficiaryTransfer.create(transfer());
    doc.status = 'approved';
    doc.approvedAt = new Date();
    await doc.save();
    await BeneficiaryTransfer.findByIdAndUpdate(doc._id, {
      status: 'rejected',
      rejectionReason: 'سعة الفرع ممتلئة',
    });
    await settle();

    expect(await CareTimeline.countDocuments({})).toBe(0);
  });

  test('does not double-record on a later non-status save', async () => {
    const doc = await BeneficiaryTransfer.create(transfer({ status: 'approved' }));
    doc.status = 'completed';
    doc.completedAt = new Date();
    await doc.save();
    await settle();
    expect(await CareTimeline.countDocuments({ beneficiaryId: doc.beneficiary })).toBe(1);

    doc.transferNotes = { handover: 'تم تسليم الملف كاملاً' };
    await doc.save();
    await settle();

    expect(await CareTimeline.countDocuments({ beneficiaryId: doc.beneficiary })).toBe(1);
  });

  test('payload carries plan-continuity flags for downstream consumers', async () => {
    const doc = await BeneficiaryTransfer.create(
      transfer({ status: 'approved', continuePlan: false, transferRecords: true })
    );
    doc.status = 'completed';
    doc.completedAt = new Date();
    await doc.save();
    await settle();

    const row = await CareTimeline.findOne({ beneficiaryId: doc.beneficiary }).lean();
    expect(row.metadata.continuePlan).toBe(false);
    expect(row.metadata.transferRecords).toBe(true);
    expect(row.metadata.transferDate).toBeTruthy();
  });
});

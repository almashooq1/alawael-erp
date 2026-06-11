'use strict';

/**
 * W1105 — CouponUsage → unified core timeline linkage.
 *
 * When a beneficiary redeems a discount coupon (a new CouponUsage record is
 * created), the model publishes `coupon-usage.coupon_usage.redeemed`, which
 * the DDD cross-module subscriber materialises into one per-beneficiary
 * CareTimeline row (category: administrative, severity: success). A
 * soft-deleted record never fires the milestone, and the row is never
 * double-counted on subsequent saves of the same usage record.
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

let CouponUsage;
let mongo;

/** Build a valid CouponUsage payload (all required fields). */
function usage(beneficiaryId, branchId, overrides = {}) {
  return {
    branchId,
    couponId: new mongoose.Types.ObjectId(),
    beneficiaryId,
    discountAmount: 50,
    orderAmount: 300,
    ...overrides,
  };
}

/**
 * Wait until the async post-save → bus → subscriber chain materialises the
 * expected number of CareTimeline rows (W1227 deflake: the previous fixed
 * 30 ms sleep lost the race under CI load — deploy-gate red on shard 4 of
 * run 27364124300). Polls every 25 ms up to `timeoutMs`, then returns
 * whatever is there so the assertion still reports a clear diff.
 */
async function waitForRows(filter, expected, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  let rows = [];
  for (;;) {
    rows = await CareTimeline.find(filter).sort({ createdAt: 1 });
    if (rows.length >= expected || Date.now() > deadline) return rows;
    await new Promise(r => setTimeout(r, 25));
  }
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  CouponUsage = mongoose.models.CouponUsage || require('../models/CouponUsage');
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

afterEach(async () => {
  await CareTimeline.deleteMany({});
  await CouponUsage.deleteMany({});
});

describe('W1105 CouponUsage → CareTimeline (coupon_usage.redeemed)', () => {
  it('records an administrative/success timeline row when a coupon is redeemed', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();

    const doc = await CouponUsage.create(usage(beneficiaryId, branchId));

    const rows = await waitForRows({ beneficiaryId }, 1);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.eventType).toBe('coupon_usage_redeemed');
    expect(row.category).toBe('administrative');
    expect(row.severity).toBe('success');
    expect(String(row.branchId)).toBe(String(branchId));
    expect(String(row.metadata.usageId)).toBe(String(doc._id));
    expect(row.metadata.discountAmount).toBe(50);
    expect(row.metadata.orderAmount).toBe(300);
    expect(row.title).toContain('50');
  });

  it('does not fire when the usage record is created soft-deleted', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();

    await CouponUsage.create(usage(beneficiaryId, branchId, { deletedAt: new Date() }));
    await new Promise(r => setTimeout(r, 150));

    const rows = await CareTimeline.find({ beneficiaryId });
    expect(rows).toHaveLength(0);
  });

  it('does not duplicate the row on a later unrelated save', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();

    const doc = await CouponUsage.create(usage(beneficiaryId, branchId));
    await waitForRows({ beneficiaryId }, 1);

    // Unrelated mutation — not a new document.
    doc.orderAmount = 350;
    await doc.save();
    await new Promise(r => setTimeout(r, 150));

    const rows = await CareTimeline.find({ beneficiaryId });
    expect(rows).toHaveLength(1);
  });

  it('emits exactly one row per distinct redemption', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();

    await CouponUsage.create(usage(beneficiaryId, branchId, { discountAmount: 20 }));
    await CouponUsage.create(usage(beneficiaryId, branchId, { discountAmount: 30 }));

    const rows = await waitForRows({ beneficiaryId }, 2);
    expect(rows).toHaveLength(2);
    expect(rows.every(r => r.eventType === 'coupon_usage_redeemed')).toBe(true);
  });
});

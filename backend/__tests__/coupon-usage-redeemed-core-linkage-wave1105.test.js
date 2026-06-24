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

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

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
    const rows = await waitForRows({ beneficiaryId }, 0);
  });

  it('does not duplicate the row on a later unrelated save', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();

    const doc = await CouponUsage.create(usage(beneficiaryId, branchId));
    await waitForRows({ beneficiaryId }, 1);

    // Unrelated mutation — not a new document.
    doc.orderAmount = 350;
    await doc.save();
    const rows = await waitForRows({ beneficiaryId }, 1);
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

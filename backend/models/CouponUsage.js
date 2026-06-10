/**
 * CouponUsage Model — System 39: Digital Wallet
 * سجلات استخدام الكوبونات
 */
const mongoose = require('mongoose');

const couponUsageSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'DiscountCoupon', required: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    walletTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'WalletTransaction' },
    discountAmount: { type: Number, required: true, min: 0 },
    orderAmount: { type: Number, required: true },
    usedAt: { type: Date, default: Date.now },

    // Soft delete
    deletedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'coupon_usages',
  }
);

// unique: كل مستفيد يستخدم الكوبون مرة واحدة
couponUsageSchema.index({ couponId: 1, beneficiaryId: 1 });
couponUsageSchema.index({ beneficiaryId: 1, usedAt: -1 });
couponUsageSchema.index({ deletedAt: 1 });

// ── W1105 core-linkage: emit when a coupon is redeemed by a beneficiary ──
couponUsageSchema.pre('save', function flagCouponRedeemed() {
  this.$__couponRedeemed = this.isNew && !this.deletedAt;
});

couponUsageSchema.post('save', function emitCouponRedeemed(doc) {
  if (!doc.$__couponRedeemed) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.publish('coupon-usage', 'coupon_usage.redeemed', {
      usageId: String(doc._id),
      beneficiaryId: String(doc.beneficiaryId),
      ...(doc.branchId ? { branchId: String(doc.branchId) } : {}),
      ...(doc.couponId ? { couponId: String(doc.couponId) } : {}),
      discountAmount: doc.discountAmount,
      orderAmount: doc.orderAmount,
      usedAt: doc.usedAt || new Date(),
    });
  } catch (_err) {
    /* best-effort: never block the save on bus failure */
  }
});

module.exports = mongoose.models.CouponUsage || mongoose.model('CouponUsage', couponUsageSchema);

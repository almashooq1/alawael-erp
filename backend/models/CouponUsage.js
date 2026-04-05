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

module.exports = mongoose.models.CouponUsage || mongoose.model('CouponUsage', couponUsageSchema);

/**
 * DiscountCoupon Model — System 39: Digital Wallet
 * كوبونات الخصم
 */
const mongoose = require('mongoose');

const discountCouponSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true, required: true },

    code: { type: String, unique: true, required: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },

    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
    },
    value: { type: Number, required: true, min: 0 }, // قيمة الخصم (% أو SAR)
    minAmount: { type: Number, default: 0 }, // الحد الأدنى للطلب
    maxDiscount: { type: Number, default: null }, // الحد الأقصى للخصم

    // حدود الاستخدام
    usageLimit: { type: Number, default: null }, // null = غير محدود
    perUserLimit: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },

    // الصلاحية
    startsAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },

    // الخدمات المطبق عليها
    applicableServices: [{ type: String }], // فارغ = جميع الخدمات

    // Soft delete
    deletedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'discount_coupons',
  }
);

discountCouponSchema.index({ branchId: 1, isActive: 1 });
discountCouponSchema.index({ code: 1 });
discountCouponSchema.index({ expiresAt: 1, isActive: 1 });
discountCouponSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('DiscountCoupon', discountCouponSchema);

/**
 * ===================================================================
 * ACCOUNT MODEL - نموذج الحساب المحاسبي
 * ===================================================================
 */

const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    // معلومات الحساب الأساسية
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameEn: {
      type: String,
      trim: true,
    },

    // نوع الحساب
    type: {
      type: String,
      required: true,
      enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
    },

    // فئة الحساب الفرعية
    category: {
      type: String,
      enum: [
        // أصول
        'current_asset',
        'fixed_asset',
        'intangible_asset',
        // خصوم
        'current_liability',
        'long_term_liability',
        // حقوق ملكية
        'capital',
        'retained_earnings',
        // إيرادات
        'operating_revenue',
        'non_operating_revenue',
        // مصروفات
        'operating_expense',
        'administrative_expense',
        'financial_expense',
      ],
    },

    // الحساب الأب (للحسابات الفرعية)
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },

    // الوصف
    description: String,

    // العملة
    currency: {
      type: String,
      default: 'SAR',
    },

    // الحالة
    isActive: {
      type: Boolean,
      default: true,
    },

    // هل يمكن الترحيل لهذا الحساب
    isPostable: {
      type: Boolean,
      default: true,
    },

    // معدل الضريبة الافتراضي
    defaultTaxRate: {
      type: Number,
      default: 0,
    },

    // إعدادات إضافية
    settings: {
      requireCostCenter: Boolean,
      requireProject: Boolean,
      allowNegativeBalance: Boolean,
    },

    // معلومات التتبع
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// فهرسة
// Note: code already has unique:true (creates automatic index)
accountSchema.index({ type: 1, isActive: 1 });
accountSchema.index({ parentId: 1 });

module.exports = mongoose.model('Account', accountSchema);

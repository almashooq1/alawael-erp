/**
 * BranchSetting Model — إعدادات الفروع (Override)
 * البرومبت 24: نظام الإعدادات المركزي
 *
 * يسمح لكل فرع بتجاوز الإعدادات العامة بقيم خاصة به.
 * منطق الأولوية: إعداد الفرع > الإعداد العام > القيمة الافتراضية
 */

const mongoose = require('mongoose');

// ─── Schema لإعداد عام واحد ────────────────────────────────────────────────
const globalSettingSchema = new mongoose.Schema(
  {
    group: {
      type: String,
      required: true,
      enum: [
        'general', // إعدادات عامة
        'appointments', // المواعيد
        'billing', // الفواتير
        'transport', // النقل
        'notifications', // الإشعارات
        'integrations', // التكاملات
        'hr', // الموارد البشرية
        'security', // الأمان
        'appearance', // المظهر
        'reports', // التقارير
      ],
      index: true,
    },
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    type: {
      type: String,
      enum: ['string', 'integer', 'float', 'boolean', 'json', 'array', 'color', 'image'],
      default: 'string',
    },
    labelAr: { type: String, required: true },
    labelEn: { type: String, required: true },
    descriptionAr: { type: String, default: '' },
    descriptionEn: { type: String, default: '' },
    validationRules: { type: String, default: null }, // e.g. "required|max:100"
    options: { type: mongoose.Schema.Types.Mixed, default: null }, // لقوائم الاختيار
    isPublic: { type: Boolean, default: false }, // يظهر للعميل/ولي الأمر
    isEncrypted: { type: Boolean, default: false }, // مشفر (API keys)
    sortOrder: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: 'global_settings',
  }
);

// ─── Schema لإعداد فرع (Override) ─────────────────────────────────────────
const branchSettingSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    overriddenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    overriddenAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'branch_settings',
  }
);

// فهرس مركب لضمان إعداد واحد لكل فرع
branchSettingSchema.index({ branchId: 1, key: 1 }, { unique: true });

const GlobalSetting =
  mongoose.models.GlobalSetting || mongoose.model('GlobalSetting', globalSettingSchema);

const BranchSetting =
  mongoose.models.BranchSetting || mongoose.model('BranchSetting', branchSettingSchema);

module.exports = { GlobalSetting, BranchSetting };

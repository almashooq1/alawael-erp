/**
 * ExtensionRecord Model — نموذج الوحدات الموسعة
 *
 * نموذج مشترك لجميع وحدات المنصة الموسعة (HR، جودة، مجتمع، إلخ).
 * يستخدم حقل `module` كمفتاح تمييزي بدلاً من إنشاء 32 نموذجاً.
 *
 * @module domains/extensions/models/ExtensionRecord
 */

const mongoose = require('mongoose');

const extensionRecordSchema = new mongoose.Schema(
  {
    /** اسم الوحدة (slug) مثل 'workforce-analytics', 'credential-manager' */
    module: { type: String, required: true, index: true },

    /** بيانات الوحدة (مرنة حسب كل وحدة) */
    data: { type: mongoose.Schema.Types.Mixed, default: {} },

    /** بيانات لوحة التحكم الخاصة بالوحدة */
    dashboard: { type: mongoose.Schema.Types.Mixed, default: {} },

    /** ربط اختياري بالمستفيد */
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      index: true,
      sparse: true,
    },

    /** ربط اختياري بالحلقة العلاجية */
    episodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EpisodeOfCare',
      index: true,
      sparse: true,
    },

    status: { type: String, default: 'active' },
    tags: [String],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'extensionrecords',
  }
);

// Compound index for efficient per-module queries
extensionRecordSchema.index({ module: 1, createdAt: -1 });

const ExtensionRecord =
  mongoose.models.ExtensionRecord || mongoose.model('ExtensionRecord', extensionRecordSchema);

module.exports = { ExtensionRecord, extensionRecordSchema };

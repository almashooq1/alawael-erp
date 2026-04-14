/**
 * AssetDepreciationSchedule Model — جدول الإهلاك الدوري للأصول
 * النظام 34: إدارة الأصول والموارد
 */
const mongoose = require('mongoose');

const assetDepreciationScheduleSchema = new mongoose.Schema(
  {
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
    },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    periodYear: { type: Number, required: true },
    periodMonth: { type: Number, required: true, min: 1, max: 12 },
    depreciationDate: { type: Date, required: true },
    depreciationAmount: { type: Number, required: true, min: 0 },
    accumulatedDepreciation: { type: Number, required: true, min: 0 },
    netBookValue: { type: Number, required: true },
    status: {
      type: String,
      enum: ['scheduled', 'posted', 'reversed'],
      default: 'scheduled',
    },
    journalEntryRef: { type: String, trim: true },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    postedAt: { type: Date },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'asset_depreciation_schedules' }
);

assetDepreciationScheduleSchema.index({ assetId: 1 });
assetDepreciationScheduleSchema.index({ periodYear: 1, periodMonth: 1 });
assetDepreciationScheduleSchema.index({ status: 1 });

module.exports =
  mongoose.models.AssetDepreciationSchedule ||
  mongoose.model('AssetDepreciationSchedule', assetDepreciationScheduleSchema);

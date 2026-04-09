/**
 * KPISnapshot Model — نموذج لقطة مؤشر الأداء
 *
 * يخزن القيم التاريخية لمؤشرات الأداء الرئيسية
 * لتمكين تحليل الاتجاهات والمقارنات الزمنية
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const kpiSnapshotSchema = new Schema(
  {
    kpiId: { type: Schema.Types.ObjectId, ref: 'KPIDefinition', required: true, index: true },
    kpiCode: { type: String, required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },

    // Period
    period: {
      type: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
        required: true,
      },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      label: String,
    },

    // Value
    value: { type: Number, required: true },
    numerator: Number,
    denominator: Number,
    sampleSize: Number,

    // Target comparison
    target: Number,
    variance: Number,
    variancePercentage: Number,
    status: {
      type: String,
      enum: ['exceeds_target', 'on_target', 'warning', 'critical', 'no_data'],
      default: 'no_data',
    },

    // Trend
    previousValue: Number,
    changeFromPrevious: Number,
    changePercentage: Number,
    trend: {
      type: String,
      enum: ['improving', 'stable', 'declining', 'insufficient_data'],
      default: 'insufficient_data',
    },

    // Breakdown
    breakdown: [
      {
        dimension: String,
        label: String,
        value: Number,
        count: Number,
      },
    ],

    // Metadata
    calculatedAt: { type: Date, default: Date.now },
    dataQuality: {
      type: String,
      enum: ['complete', 'partial', 'estimated', 'unavailable'],
      default: 'complete',
    },
    notes: String,
  },
  {
    timestamps: true,
    collection: 'kpi_snapshots',
  }
);

kpiSnapshotSchema.index({ kpiCode: 1, 'period.startDate': -1 });
kpiSnapshotSchema.index({ kpiId: 1, 'period.type': 1, 'period.startDate': -1 });
kpiSnapshotSchema.index({ branchId: 1, 'period.startDate': -1 });
kpiSnapshotSchema.index({ status: 1, calculatedAt: -1 });

module.exports = mongoose.models.KPISnapshot || mongoose.model('KPISnapshot', kpiSnapshotSchema);

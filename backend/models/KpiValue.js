/**
 * KpiValue — قيم KPI المحسوبة لكل فترة
 * النظام 36: لوحة KPIs الذكية
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const kpiValueSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    kpiDefinitionId: {
      type: Schema.Types.ObjectId,
      ref: 'KpiDefinition',
      required: true,
      index: true,
    },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    periodType: {
      type: String,
      required: true,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    },
    periodYear: { type: Number, required: true },
    periodNumber: { type: Number, required: true },
    // الشهر أو الربع أو اليوم
    periodDate: { type: Date, required: true, index: true },
    // تاريخ البداية للفترة
    value: { type: Number, required: true },
    previousValue: { type: Number, default: null },
    targetValue: { type: Number, default: null },
    variance: { type: Number, default: null },
    variancePct: { type: Number, default: null },
    trend: { type: String, default: null, enum: ['up', 'down', 'stable', null] },
    trendPct: { type: Number, default: null },
    status: {
      type: String,
      default: null,
      enum: ['on_track', 'at_risk', 'off_track', 'exceeded', 'no_data', null],
      index: true,
    },
    breakdown: { type: Schema.Types.Mixed, default: null },
    // تفاصيل التحليل
    isCalculated: { type: Boolean, default: false },
    calculatedAt: { type: Date, default: null },
    isOverride: { type: Boolean, default: false },
    // قيمة معدلة يدوياً
    notes: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

kpiValueSchema.index({
  kpiDefinitionId: 1,
  branchId: 1,
  periodType: 1,
  periodYear: 1,
  periodNumber: 1,
});
kpiValueSchema.index({ periodDate: 1 });
kpiValueSchema.index({ status: 1 });

module.exports = mongoose.model('KpiValue', kpiValueSchema);

/**
 * KpiTarget — أهداف KPI لكل فرع وقسم
 * النظام 36: لوحة KPIs الذكية
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const kpiTargetSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    kpiDefinitionId: {
      type: Schema.Types.ObjectId,
      ref: 'KpiDefinition',
      required: true,
      index: true,
    },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    // null = كل الأقسام
    periodType: {
      type: String,
      required: true,
      enum: ['monthly', 'quarterly', 'yearly'],
    },
    periodYear: { type: Number, required: true },
    periodNumber: { type: Number, required: true }, // رقم الشهر/الربع
    targetValue: { type: Number, required: true },
    minimumValue: { type: Number, default: null },
    stretchValue: { type: Number, default: null },
    status: {
      type: String,
      default: 'active',
      enum: ['active', 'achieved', 'missed', 'in_progress'],
    },
    notes: { type: String, default: null },
    setBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

kpiTargetSchema.index({ kpiDefinitionId: 1, periodYear: 1, periodNumber: 1 });
kpiTargetSchema.index(
  {
    kpiDefinitionId: 1,
    branchId: 1,
    departmentId: 1,
    periodType: 1,
    periodYear: 1,
    periodNumber: 1,
  },
  { unique: true, sparse: true }
);

module.exports = mongoose.model('KpiTarget', kpiTargetSchema);

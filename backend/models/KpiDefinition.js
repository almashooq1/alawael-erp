/**
 * KpiDefinition — تعريفات مؤشرات الأداء
 * النظام 36: لوحة KPIs الذكية
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const kpiDefinitionSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'KpiCategory',
      required: true,
      index: true,
    },
    name: { type: String, required: true, maxlength: 150 },
    nameAr: { type: String, required: true, maxlength: 150 },
    code: { type: String, required: true, unique: true, maxlength: 50, index: true },
    unit: { type: String, required: true, maxlength: 20 },
    // %, SAR, days, hours, count, ratio
    calculationType: {
      type: String,
      required: true,
      enum: ['sum', 'avg', 'count', 'ratio', 'rate', 'custom'],
    },
    formula: { type: String, default: null },
    dataSource: { type: String, default: null },
    // appointments, sessions, invoices, staff
    aggregationPeriod: {
      type: String,
      default: 'monthly',
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    },
    benchmarkMin: { type: Number, default: null },
    benchmarkMax: { type: Number, default: null },
    direction: {
      type: String,
      default: 'higher_better',
      enum: ['higher_better', 'lower_better', 'target_based'],
    },
    showOnDashboard: { type: Boolean, default: true, index: true },
    enableAlerts: { type: Boolean, default: true },
    alertThresholdPct: { type: Number, default: 10, min: 1, max: 100 },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    description: { type: String, default: null },
    descriptionAr: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

kpiDefinitionSchema.index({ categoryId: 1, isActive: 1 });
kpiDefinitionSchema.index({ code: 1 });
kpiDefinitionSchema.index({ showOnDashboard: 1 });

module.exports = mongoose.model('KpiDefinition', kpiDefinitionSchema);

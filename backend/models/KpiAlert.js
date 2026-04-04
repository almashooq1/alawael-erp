/**
 * KpiAlert — تنبيهات انحراف مؤشرات الأداء
 * النظام 36: لوحة KPIs الذكية
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const kpiAlertSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    kpiDefinitionId: {
      type: Schema.Types.ObjectId,
      ref: 'KpiDefinition',
      required: true,
      index: true,
    },
    kpiValueId: { type: Schema.Types.ObjectId, ref: 'KpiValue', default: null },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    alertType: {
      type: String,
      required: true,
      enum: ['deviation', 'missed_target', 'new_record_low', 'new_record_high'],
    },
    severity: {
      type: String,
      required: true,
      enum: ['info', 'warning', 'critical'],
      index: true,
    },
    actualValue: { type: Number, required: true },
    thresholdValue: { type: Number, default: null },
    deviationPct: { type: Number, default: null },
    message: { type: String, required: true },
    messageAr: { type: String, required: true },
    periodLabel: { type: String, default: null },
    isRead: { type: Boolean, default: false, index: true },
    acknowledgedAt: { type: Date, default: null },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    status: {
      type: String,
      default: 'active',
      enum: ['active', 'acknowledged', 'dismissed'],
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

kpiAlertSchema.index({ status: 1, severity: 1 });
kpiAlertSchema.index({ branchId: 1, status: 1 });
kpiAlertSchema.index({ isRead: 1 });

module.exports = mongoose.model('KpiAlert', kpiAlertSchema);

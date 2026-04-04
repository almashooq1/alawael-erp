/**
 * KpiReport — تقارير KPI المولدة
 * النظام 36: لوحة KPIs الذكية
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const kpiReportSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    title: { type: String, required: true },
    titleAr: { type: String, required: true },
    reportType: {
      type: String,
      required: true,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annual', 'custom'],
      index: true,
    },
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'generating', 'ready', 'failed'],
      index: true,
    },
    periodFrom: { type: Date, required: true, index: true },
    periodTo: { type: Date, required: true },
    includedKpis: { type: [Schema.Types.ObjectId], default: null },
    includedDepartments: { type: [Schema.Types.ObjectId], default: null },
    filters: { type: Schema.Types.Mixed, default: null },
    filePath: { type: String, default: null },
    format: { type: String, default: 'pdf', enum: ['pdf', 'excel', 'powerpoint'] },
    fileSize: { type: Number, default: null },
    generationTimeMs: { type: Number, default: null },
    generatedAt: { type: Date, default: null },
    downloadCount: { type: Number, default: 0 },
    isAuto: { type: Boolean, default: false },
    recipients: { type: [String], default: null },
    notes: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

kpiReportSchema.index({ reportType: 1, status: 1 });
kpiReportSchema.index({ periodFrom: 1 });
kpiReportSchema.index({ branchId: 1, reportType: 1 });

module.exports = mongoose.model('KpiReport', kpiReportSchema);

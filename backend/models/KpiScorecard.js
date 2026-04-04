/**
 * KpiScorecard — بطاقات الأداء للفروع والأقسام
 * النظام 36: لوحة KPIs الذكية
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const kpiScorecardSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    periodType: {
      type: String,
      required: true,
      enum: ['monthly', 'quarterly', 'yearly'],
    },
    periodYear: { type: Number, required: true },
    periodNumber: { type: Number, required: true },
    periodDate: { type: Date, required: true },
    overallScore: { type: Number, default: 0 },
    // درجة الأداء الكلية %
    clinicalScore: { type: Number, default: null },
    financialScore: { type: Number, default: null },
    operationalScore: { type: Number, default: null },
    qualityScore: { type: Number, default: null },
    hrScore: { type: Number, default: null },
    rating: {
      type: String,
      default: null,
      enum: ['excellent', 'good', 'satisfactory', 'needs_improvement', 'poor', null],
      index: true,
    },
    branchRank: { type: Number, default: null },
    kpiDetails: { type: Schema.Types.Mixed, default: null },
    summary: { type: String, default: null },
    summaryAr: { type: String, default: null },
    generatedAt: { type: Date, default: null },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

kpiScorecardSchema.index({ branchId: 1, periodType: 1, periodYear: 1, periodNumber: 1 });
kpiScorecardSchema.index({ overallScore: 1 });
kpiScorecardSchema.index({ rating: 1 });

module.exports = mongoose.model('KpiScorecard', kpiScorecardSchema);

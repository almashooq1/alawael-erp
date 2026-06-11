/**
 * CdssRiskAssessment Model — نموذج تقييمات المخاطر السريرية
 * البرومبت 32: نظام دعم القرار السريري CDSS
 */
const mongoose = require('mongoose');

const cdssRiskAssessmentSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    assessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assessmentType: {
      type: String,
      enum: ['fall_risk', 'pressure_ulcer', 'malnutrition', 'deterioration'],
      required: true,
    },
    toolUsed: { type: String, maxlength: 100 }, // MorseScale, BradeenScale, MUST, NEWS
    totalScore: { type: Number },
    riskLevel: {
      type: String,
      enum: ['low', 'moderate', 'high', 'very_high'],
      required: true,
    },
    scoreBreakdown: { type: mongoose.Schema.Types.Mixed },
    recommendedInterventions: { type: mongoose.Schema.Types.Mixed },
    assessmentDate: { type: Date, required: true },
    nextAssessmentDate: { type: Date },
    clinicalNotes: { type: String },
    mlAssisted: { type: Boolean, default: false },
    mlConfidenceScore: { type: Number, min: 0, max: 1 },
    mlFeaturesUsed: { type: mongoose.Schema.Types.Mixed },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

cdssRiskAssessmentSchema.index({ branchId: 1, beneficiaryId: 1, assessmentType: 1 });
cdssRiskAssessmentSchema.index({ riskLevel: 1, assessmentDate: -1 });
cdssRiskAssessmentSchema.index({ assessmentDate: -1 });

// W494: callback → async.
cdssRiskAssessmentSchema.pre('save', async function () {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
});

// ── W1082: unified-core producer ───────────────────────────────────
// Emit cdss_risk.assessed when a new CDSS risk assessment is recorded so
// the score lands on the beneficiary's core timeline. Only new rows fire;
// edits don't re-emit. Non-callback hook style (W483).
cdssRiskAssessmentSchema.pre('save', function flagCdssRiskAssessed() {
  this.$__cdssRiskAssessed = this.isNew;
});

cdssRiskAssessmentSchema.post('save', function emitCdssRiskAssessed(doc) {
  if (!doc.$__cdssRiskAssessed) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.publish('cdss-risk', 'cdss_risk.assessed', {
      assessmentId: String(doc._id),
      beneficiaryId: String(doc.beneficiaryId),
      ...(doc.branchId ? { branchId: String(doc.branchId) } : {}),
      assessmentType: doc.assessmentType || null,
      riskLevel: doc.riskLevel || null,
      totalScore: typeof doc.totalScore === 'number' ? doc.totalScore : null,
      assessmentDate: doc.assessmentDate || doc.createdAt || new Date(),
    });
  } catch (_e) {
    /* bus optional in some contexts */
  }
});

module.exports =
  mongoose.models.CdssRiskAssessment ||
  mongoose.model('CdssRiskAssessment', cdssRiskAssessmentSchema);

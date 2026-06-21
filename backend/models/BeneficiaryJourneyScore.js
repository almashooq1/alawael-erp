/**
 * BeneficiaryJourneyScore Model — نموذج درجة جاهزية رحلة المستفيد
 *
 * W0-LifecycleAlign: captures an computed readiness score per beneficiary
 * to support intelligent lifecycle recommendations. Scores are persisted
 * so trend analysis and dashboards can query them efficiently.
 */

'use strict';

const mongoose = require('mongoose');

const beneficiaryJourneyScoreSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
      unique: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
    },
    /** Readiness score 0-100 */
    score: { type: Number, min: 0, max: 100, default: 0 },
    /** Primary lifecycle stage recommendation */
    recommendation: {
      type: String,
      enum: ['continue', 'discharge', 'suspend', 'intensive_support', 'review'],
      default: 'continue',
    },
    /** Confidence 0-1 based on data completeness */
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    /** Number of data dimensions present (0-5) */
    confidenceDimensions: { type: Number, min: 0, max: 5, default: 0 },
    /** Human-readable rationale (Arabic) */
    rationaleAr: { type: String },
    /** Human-readable rationale (English) */
    rationaleEn: { type: String },
    /** Input signals used to compute the score */
    signals: {
      progress: { type: Number, min: 0, max: 100 },
      sessionsCount: { type: Number, min: 0 },
      daysSinceLastAssessment: { type: Number, min: 0 },
      openGoalsCount: { type: Number, min: 0 },
      achievedGoalsCount: { type: Number, min: 0 },
      riskFlagsCount: { type: Number, min: 0 },
      icfScore: { type: Number },
      gasTScore: { type: Number },
      assessmentScore: { type: Number },
      sessionAttendanceRate: { type: Number, min: 0, max: 100 },
    },
    /** When the score was last computed */
    computedAt: { type: Date, default: Date.now, index: true },
    /** Who triggered the computation (system / user id) */
    computedBy: { type: String },
    /** Last auto-requested transition (for damping / flapping protection) */
    lastAutoRequestedAt: { type: Date, default: null },
    lastAutoTransitionId: { type: String, default: null },
  },
  { timestamps: true }
);

beneficiaryJourneyScoreSchema.index({ branchId: 1, score: -1 });

module.exports =
  mongoose.models.BeneficiaryJourneyScore ||
  mongoose.model('BeneficiaryJourneyScore', beneficiaryJourneyScoreSchema);

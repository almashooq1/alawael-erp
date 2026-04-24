'use strict';

/**
 * RetentionAssessment.model.js — Phase 17 Commit 8 (4.0.90).
 *
 * Immutable snapshot — one doc per assessment run. Each
 * re-assessment creates a NEW document; prior assessments remain
 * for trend visualization. Carries the list of detected risk
 * factors, the computed score + band, prior score reference for
 * trend, and the list of auto-triggered interventions.
 *
 * Auto-numbered `RET-YYYY-NNNNN`.
 */

const mongoose = require('mongoose');
const {
  RISK_BAND_CODES,
  RISK_FACTOR_CODES,
  INTERVENTION_TYPES,
  TREND_DIRECTIONS,
} = require('../../config/care/retention.registry');

const factorSchema = new mongoose.Schema(
  {
    code: { type: String, enum: RISK_FACTOR_CODES, required: true },
    weight: { type: Number, required: true },
    detail: { type: String, default: null },
    detectedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const interventionSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: INTERVENTION_TYPES, required: true },
    triggeredAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['pending', 'executed', 'failed', 'skipped'],
      default: 'pending',
    },
    ref: {
      type: { type: String, default: null }, // 'psych_flag' | 'social_case' | 'mdt' | 'home_visit'
      id: { type: String, default: null },
      number: { type: String, default: null },
    },
    notes: { type: String, default: null },
    error: { type: String, default: null },
  },
  { _id: true }
);

const retentionAssessmentSchema = new mongoose.Schema(
  {
    assessmentNumber: { type: String, required: true, unique: true, uppercase: true },

    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },

    computedAt: { type: Date, default: Date.now, index: true },

    // Scores
    riskScore: { type: Number, required: true, min: 0, max: 100, index: true },
    riskBand: { type: String, enum: RISK_BAND_CODES, required: true, index: true },

    // Trend (compared to previous assessment)
    previousRiskScore: { type: Number, default: null },
    trend: { type: String, enum: TREND_DIRECTIONS, default: 'unknown' },

    // Components
    factors: { type: [factorSchema], default: [] },

    // Health score snapshot (from b360 at computation time)
    healthScoreSnapshot: {
      overall: { type: Number, default: null },
      band: { type: String, default: null },
      mentalWellbeing: { type: Number, default: null },
      functionalIndependence: { type: Number, default: null },
      socialIntegration: { type: Number, default: null },
    },

    // Auto-interventions
    interventions: { type: [interventionSchema], default: [] },

    // Acknowledgement by retention manager
    acknowledged: { type: Boolean, default: false, index: true },
    acknowledgedAt: { type: Date, default: null },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    acknowledgementNotes: { type: String, default: null },

    triggeredBy: {
      type: String,
      enum: ['manual', 'scheduler', 'event'],
      default: 'manual',
    },
    triggeredByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'care_retention_assessments' }
);

retentionAssessmentSchema.index({ beneficiaryId: 1, computedAt: -1 });
retentionAssessmentSchema.index({ riskBand: 1, acknowledged: 1, computedAt: -1 });
retentionAssessmentSchema.index({ branchId: 1, riskBand: 1, computedAt: -1 });

retentionAssessmentSchema.pre('validate', async function () {
  if (this.assessmentNumber) return;
  const year = (this.computedAt || new Date()).getUTCFullYear();
  const Model = mongoose.model('RetentionAssessment');
  const count = await Model.countDocuments({
    assessmentNumber: { $regex: `^RET-${year}-` },
  });
  this.assessmentNumber = `RET-${year}-${String(count + 1).padStart(5, '0')}`;
});

retentionAssessmentSchema.virtual('needsAttention').get(function () {
  return !this.acknowledged && ['high', 'imminent'].includes(this.riskBand);
});

retentionAssessmentSchema.set('toJSON', { virtuals: true });
retentionAssessmentSchema.set('toObject', { virtuals: true });

const RetentionAssessment =
  mongoose.models.RetentionAssessment ||
  mongoose.model('RetentionAssessment', retentionAssessmentSchema);

module.exports = RetentionAssessment;

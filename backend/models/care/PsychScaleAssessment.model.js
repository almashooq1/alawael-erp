'use strict';

/**
 * PsychScaleAssessment.model.js — Phase 17 Commit 5 (4.0.87).
 *
 * One document per administered scored instrument (PHQ-9, GAD-7,
 * DASS-21). Stores raw item responses + computed total + band +
 * recommended action + optional link to an auto-generated risk
 * flag when thresholds trigger.
 *
 * Auto-numbered `PSA-YYYY-NNNNN`.
 */

const mongoose = require('mongoose');
const { SCALE_CODES } = require('../../config/care/psych.registry');

const psychScaleAssessmentSchema = new mongoose.Schema(
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
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SocialCase',
      default: null,
      index: true,
    },

    scaleCode: { type: String, enum: SCALE_CODES, required: true, index: true },

    administeredAt: { type: Date, default: Date.now, index: true },
    administeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    administeredByRole: { type: String, default: null },

    // Per-item raw responses (0..3 typically for PHQ-9 / GAD-7 / DASS-21)
    responses: { type: [Number], default: [] },

    // Computed at save time by the service
    totalScore: { type: Number, default: null, index: true },
    band: { type: String, default: null }, // 'minimal' / 'mild' / 'moderate' / ...
    recommendedAction: { type: String, default: null },

    // If scoring triggered a risk flag
    autoFlagTriggered: { type: Boolean, default: false, index: true },
    autoFlagId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PsychRiskFlag',
      default: null,
    },
    autoFlagReason: { type: String, default: null },

    notes: { type: String, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'care_psych_scale_assessments' }
);

psychScaleAssessmentSchema.index({ beneficiaryId: 1, scaleCode: 1, administeredAt: -1 });
psychScaleAssessmentSchema.index({ autoFlagTriggered: 1, administeredAt: -1 });

// ── auto-numbering ──────────────────────────────────────────────────

psychScaleAssessmentSchema.pre('validate', async function () {
  if (this.assessmentNumber) return;
  const year = (this.administeredAt || new Date()).getUTCFullYear();
  const Model = mongoose.model('PsychScaleAssessment');
  const count = await Model.countDocuments({
    assessmentNumber: { $regex: `^PSA-${year}-` },
  });
  this.assessmentNumber = `PSA-${year}-${String(count + 1).padStart(5, '0')}`;
});

psychScaleAssessmentSchema.set('toJSON', { virtuals: true });
psychScaleAssessmentSchema.set('toObject', { virtuals: true });

const PsychScaleAssessment =
  mongoose.models.PsychScaleAssessment ||
  mongoose.model('PsychScaleAssessment', psychScaleAssessmentSchema);

module.exports = PsychScaleAssessment;

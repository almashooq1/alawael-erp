'use strict';

/**
 * SiblingAdjustmentRecord — W468.
 *
 * Periodic SDQ-based adjustment assessment for siblings of beneficiaries.
 * Per Phase C of v3 lifecycle — "Sibling Hub" + Family WBCI integration.
 *
 * Healthy siblings of children with disabilities often suffer in silence;
 * this entity tracks their wellbeing alongside the beneficiary's clinical
 * care so the family is treated as a unit (Family Systems Theory).
 *
 * Records feed siblingAdjustment component of WBCI (W467).
 */

const mongoose = require('mongoose');

const SiblingAdjustmentRecordSchema = new mongoose.Schema(
  {
    // The PRIMARY beneficiary (the disabled sibling) — this is the lens
    // through which the family-systems data is queried.
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },

    // The sibling being assessed (the healthy/typically-developing one)
    siblingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary', // siblings ARE registered as Beneficiary records
      // even though they're not the primary beneficiary of care
      index: true,
    },
    siblingName: { type: String, maxlength: 200 }, // when sibling not registered
    siblingAgeMonths: { type: Number, min: 36, max: 252 }, // SDQ valid 3-17 yr

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },

    assessmentDate: { type: Date, required: true, default: Date.now, index: true },
    assessmentType: {
      type: String,
      enum: ['baseline', 'periodic', 'event_triggered', 'pre_intervention', 'post_intervention'],
      default: 'periodic',
    },

    // SDQ rater perspective (each is a separate-rater validated SDQ form)
    raterType: {
      type: String,
      enum: ['parent', 'teacher', 'self'],
      required: true,
    },
    raterUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // 5 SDQ subscale scores (each 0-10)
    scores: {
      emotional: { type: Number, min: 0, max: 10, required: true },
      conduct: { type: Number, min: 0, max: 10, required: true },
      hyperactivity: { type: Number, min: 0, max: 10, required: true },
      peer: { type: Number, min: 0, max: 10, required: true },
      prosocial: { type: Number, min: 0, max: 10, required: true },
    },

    // Computed in pre-save via sdq-scoring.lib
    totalDifficulties: { type: Number, min: 0, max: 40 },
    totalBand: {
      type: String,
      enum: ['close_to_average', 'slightly_raised', 'high', 'very_high', 'unknown'],
      index: true,
    },
    wellbeing: { type: Number, min: 0, max: 100 }, // feeds WBCI siblingAdjustment

    breakdown: {
      emotional: {
        score: { type: Number },
        band: {
          type: String,
          enum: ['close_to_average', 'slightly_raised', 'high', 'very_high', 'unknown'],
        },
      },
      conduct: {
        score: { type: Number },
        band: {
          type: String,
          enum: ['close_to_average', 'slightly_raised', 'high', 'very_high', 'unknown'],
        },
      },
      hyperactivity: {
        score: { type: Number },
        band: {
          type: String,
          enum: ['close_to_average', 'slightly_raised', 'high', 'very_high', 'unknown'],
        },
      },
      peer: {
        score: { type: Number },
        band: {
          type: String,
          enum: ['close_to_average', 'slightly_raised', 'high', 'very_high', 'unknown'],
        },
      },
      prosocial: {
        score: { type: Number },
        band: {
          type: String,
          enum: ['close_to_average', 'slightly_raised', 'high', 'very_high', 'unknown'],
        },
      },
    },

    // Action follow-up
    referralRecommended: { type: Boolean, default: false },
    referralReason: { type: String, maxlength: 1000 },
    referralCompletedAt: { type: Date },

    notes: { type: String, maxlength: 2000 },
  },
  {
    timestamps: true,
    collection: 'sibling_adjustment_records',
  }
);

SiblingAdjustmentRecordSchema.index({ beneficiaryId: 1, assessmentDate: -1 });
SiblingAdjustmentRecordSchema.index({ branchId: 1, totalBand: 1, assessmentDate: -1 });
SiblingAdjustmentRecordSchema.index({ siblingId: 1, assessmentDate: -1 });

// W468 Wave-18 — recompute SDQ totals via lib
SiblingAdjustmentRecordSchema.pre('save', function (next) {
  const lib = require('../intelligence/sdq-scoring.lib');
  const scoresObj = this.scores ? this.scores.toObject?.() || this.scores : {};
  const result = lib.scoreSDQ({
    emotional: scoresObj.emotional,
    conduct: scoresObj.conduct,
    hyperactivity: scoresObj.hyperactivity,
    peer: scoresObj.peer,
    prosocial: scoresObj.prosocial,
  });

  if (!result.valid) {
    return next(
      new Error(`SiblingAdjustmentRecord: invalid SDQ scores: ${result.errors.join(', ')}`)
    );
  }

  this.totalDifficulties = result.total;
  this.totalBand = result.totalBand;
  this.wellbeing = result.wellbeing;
  this.breakdown = result.breakdown;

  // Auto-flag referralRecommended on very_high
  if (result.totalBand === 'very_high' && !this.referralRecommended) {
    this.referralRecommended = true;
    if (!this.referralReason) {
      this.referralReason = `SDQ Total Difficulties ${result.total} → very_high band — clinical referral indicated`;
    }
  }

  next();
});

module.exports =
  mongoose.models.SiblingAdjustmentRecord ||
  mongoose.model('SiblingAdjustmentRecord', SiblingAdjustmentRecordSchema);

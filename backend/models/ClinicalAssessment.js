/**
 * ClinicalAssessment — lightweight beneficiary assessment record.
 *
 * Distinct from heavier ProgramAssessment (bound to DisabilityProgram).
 * Used for ad-hoc / standardized screening tools (CARS, M-CHAT, VB-MAPP
 * snapshots, Denver-II, Vineland, etc.) with a consistent envelope.
 *
 * Score is canonical 0–100 after normalization. Raw scoreBreakdown per
 * domain is preserved for analytics.
 */

'use strict';

const mongoose = require('mongoose');

const clinicalAssessmentSchema = new mongoose.Schema(
  {
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },

    tool: {
      type: String,
      required: true,
      // Common tools — extend freely; not enum-locked to allow custom ones.
    },
    toolVersion: String,
    category: {
      type: String,
      enum: [
        'autism_screening',
        'adaptive_behavior',
        'cognitive',
        'language',
        'motor',
        'sensory',
        'social_emotional',
        'academic',
        'behavioral',
        'quality_of_life',
        'other',
      ],
      default: 'other',
      index: true,
    },

    assessmentDate: { type: Date, required: true, index: -1 },
    duration: Number, // minutes

    // Canonical normalized score (0–100) — null if tool is non-numeric
    score: { type: Number, min: 0, max: 100 },
    rawScore: Number,
    maxRawScore: Number,

    interpretation: {
      type: String,
      enum: [
        'within_normal',
        'borderline',
        'mild',
        'moderate',
        'severe',
        'profound',
        'not_applicable',
      ],
    },

    // Per-domain sub-scores
    scoreBreakdown: [
      {
        domain: { type: String, required: true },
        score: Number,
        maxScore: Number,
        percentage: Number,
        notes: String,
      },
    ],

    // Compared to previous administration of same tool (auto-computed)
    previousScore: Number,
    scoreChange: Number,
    improvement: Boolean,

    observations: String,
    strengths: [String],
    concerns: [String],
    recommendations: [String],

    status: {
      type: String,
      enum: ['draft', 'completed', 'reviewed', 'archived'],
      default: 'completed',
      index: true,
    },

    attachments: [
      {
        name: String,
        url: String,
        uploadedAt: Date,
      },
    ],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

clinicalAssessmentSchema.index({ beneficiary: 1, assessmentDate: -1 });
clinicalAssessmentSchema.index({ tool: 1, assessmentDate: -1 });
clinicalAssessmentSchema.index({ branchId: 1, status: 1 });

// Auto-link previous administration of same tool for delta calc
clinicalAssessmentSchema.pre('save', async function () {
  if (!this.isNew || this.previousScore != null) return;
  try {
    const Model = this.constructor;
    const prior = await Model.findOne({
      beneficiary: this.beneficiary,
      tool: this.tool,
      _id: { $ne: this._id },
      assessmentDate: { $lt: this.assessmentDate || new Date() },
    })
      .sort({ assessmentDate: -1 })
      .select('score')
      .lean();
    if (prior?.score != null && this.score != null) {
      this.previousScore = prior.score;
      this.scoreChange = this.score - prior.score;
      this.improvement = this.scoreChange > 0;
    }
  } catch {
    // non-fatal — just skip delta
  }
});

module.exports =
  mongoose.models.ClinicalAssessment ||
  mongoose.model('ClinicalAssessment', clinicalAssessmentSchema);

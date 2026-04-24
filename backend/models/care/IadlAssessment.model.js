'use strict';

/**
 * IadlAssessment.model.js — Phase 17 Commit 6 (4.0.88).
 *
 * Lawton IADL 8-domain assessment. Raw per-domain scores 0..3,
 * total 0..24, interpretation band (fully_dependent → structured
 * → coaching → monitor_only).
 *
 * Auto-numbered `IADL-YYYY-NNNNN`.
 */

const mongoose = require('mongoose');
const { IADL_DOMAIN_CODES } = require('../../config/care/independence.registry');

const domainScoreSchema = new mongoose.Schema(
  {
    domain: { type: String, enum: IADL_DOMAIN_CODES, required: true },
    score: { type: Number, min: 0, max: 3, required: true },
    notes: { type: String, default: null },
  },
  { _id: false }
);

const iadlAssessmentSchema = new mongoose.Schema(
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

    assessedAt: { type: Date, default: Date.now, index: true },
    assessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assessedByRole: { type: String, default: null },

    domainScores: { type: [domainScoreSchema], default: [] },

    // Computed at save time
    totalScore: { type: Number, default: null, index: true },
    band: { type: String, default: null },
    recommendedAction: { type: String, default: null },

    notes: { type: String, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'care_iadl_assessments' }
);

iadlAssessmentSchema.index({ beneficiaryId: 1, assessedAt: -1 });
iadlAssessmentSchema.index({ band: 1, assessedAt: -1 });

iadlAssessmentSchema.pre('validate', async function () {
  if (this.assessmentNumber) return;
  const year = (this.assessedAt || new Date()).getUTCFullYear();
  const Model = mongoose.model('IadlAssessment');
  const count = await Model.countDocuments({
    assessmentNumber: { $regex: `^IADL-${year}-` },
  });
  this.assessmentNumber = `IADL-${year}-${String(count + 1).padStart(5, '0')}`;
});

iadlAssessmentSchema.set('toJSON', { virtuals: true });
iadlAssessmentSchema.set('toObject', { virtuals: true });

const IadlAssessment =
  mongoose.models.IadlAssessment || mongoose.model('IadlAssessment', iadlAssessmentSchema);

module.exports = IadlAssessment;

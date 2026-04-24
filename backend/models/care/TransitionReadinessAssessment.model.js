'use strict';

/**
 * TransitionReadinessAssessment.model.js — Phase 17 Commit 6 (4.0.88).
 *
 * Structured multi-domain readiness assessment for beneficiaries
 * transitioning to adult services / independent living / etc.
 *
 * Auto-numbered `TRA-YYYY-NNNNN`.
 */

const mongoose = require('mongoose');
const {
  TRANSITION_TARGETS,
  TRANSITION_DOMAIN_CODES,
  TRANSITION_STATUSES,
  READINESS_TIERS,
} = require('../../config/care/independence.registry');

const domainScoreSchema = new mongoose.Schema(
  {
    domain: { type: String, enum: TRANSITION_DOMAIN_CODES, required: true },
    score: { type: Number, min: 0, max: 3, required: true },
    notes: { type: String, default: null },
    evidence: { type: String, default: null }, // "observed X during home visit Y"
  },
  { _id: false }
);

const goalSchema = new mongoose.Schema(
  {
    domain: { type: String, enum: TRANSITION_DOMAIN_CODES, default: null },
    goal: { type: String, required: true },
    targetDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'achieved', 'cancelled'],
      default: 'pending',
    },
    achievedAt: { type: Date, default: null },
    notes: { type: String, default: null },
  },
  { _id: true }
);

const barrierSchema = new mongoose.Schema(
  {
    domain: { type: String, enum: TRANSITION_DOMAIN_CODES, default: null },
    barrier: { type: String, required: true },
    mitigationPlan: { type: String, default: null },
  },
  { _id: true }
);

const statusHistorySchema = new mongoose.Schema(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    event: { type: String, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    at: { type: Date, required: true, default: Date.now },
    notes: { type: String, default: null },
  },
  { _id: false }
);

const transitionReadinessSchema = new mongoose.Schema(
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

    targetTransition: { type: String, enum: TRANSITION_TARGETS, required: true, index: true },
    plannedDate: { type: Date, default: null },

    status: {
      type: String,
      enum: TRANSITION_STATUSES,
      default: 'draft',
      index: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },

    assessedAt: { type: Date, default: Date.now },
    assessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assessedByRole: { type: String, default: null },

    domainScores: { type: [domainScoreSchema], default: [] },
    overallReadiness: { type: String, enum: [...READINESS_TIERS, null], default: null },

    barriers: { type: [barrierSchema], default: [] },
    goals: { type: [goalSchema], default: [] },

    summary: { type: String, default: null },
    recommendations: { type: String, default: null },

    reassessmentDue: { type: Date, default: null },

    supersededByAssessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransitionReadinessAssessment',
      default: null,
    },

    cancellationReason: { type: String, default: null },

    tags: { type: [String], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'care_transition_readiness' }
);

transitionReadinessSchema.index({ beneficiaryId: 1, status: 1, assessedAt: -1 });
transitionReadinessSchema.index({ branchId: 1, targetTransition: 1 });

transitionReadinessSchema.pre('validate', async function () {
  if (this.assessmentNumber) return;
  const year = (this.assessedAt || new Date()).getUTCFullYear();
  const Model = mongoose.model('TransitionReadinessAssessment');
  const count = await Model.countDocuments({
    assessmentNumber: { $regex: `^TRA-${year}-` },
  });
  this.assessmentNumber = `TRA-${year}-${String(count + 1).padStart(5, '0')}`;
});

transitionReadinessSchema.virtual('openGoalsCount').get(function () {
  return (this.goals || []).filter(g => ['pending', 'in_progress'].includes(g.status)).length;
});

transitionReadinessSchema.set('toJSON', { virtuals: true });
transitionReadinessSchema.set('toObject', { virtuals: true });

const TransitionReadinessAssessment =
  mongoose.models.TransitionReadinessAssessment ||
  mongoose.model('TransitionReadinessAssessment', transitionReadinessSchema);

module.exports = TransitionReadinessAssessment;

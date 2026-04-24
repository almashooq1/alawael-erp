'use strict';

/**
 * SocialCase.model.js — Phase 17 Commit 2 (4.0.84).
 *
 * One document per social-services case. Embeds the assessment and
 * the intervention plan because both are 1:1 with the case and
 * always queried together.
 *
 * Three SLA backlinks:
 *   - `intakeSlaId` — `social.case.intake_to_assessment` (5d)
 *     activated on case open, resolved when assessment completes
 *   - `planSlaId` — `social.case.assessment_to_plan` (3d)
 *     activated on assessment completion, resolved on plan creation
 *   - `highRiskSlaId` — `social.case.high_risk_review` (24h)
 *     activated when riskLevel becomes high/critical, resolved
 *     when downgraded or case is actively reviewed
 *
 * Case ownership is via `assignedWorkerId`. Transfer preserves
 * history and creates an event but doesn't duplicate the case
 * (unlike some CRM patterns that clone on assignment).
 */

const mongoose = require('mongoose');
const {
  CASE_TYPES,
  CASE_STATUSES,
  RISK_LEVELS,
  ASSESSMENT_DOMAIN_CODES,
  DOMAIN_SCORE_MIN,
  DOMAIN_SCORE_MAX,
  INTERVENTION_TYPES,
  CLOSURE_OUTCOMES,
} = require('../../config/care/social.registry');

// ── embedded: status history ────────────────────────────────────────

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

// ── embedded: per-domain score + observation ───────────────────────

const domainScoreSchema = new mongoose.Schema(
  {
    code: { type: String, enum: ASSESSMENT_DOMAIN_CODES, required: true },
    score: {
      type: Number,
      min: DOMAIN_SCORE_MIN,
      max: DOMAIN_SCORE_MAX,
      required: true,
    },
    observation: { type: String, default: null },
  },
  { _id: false }
);

// ── embedded: assessment (filled during `assessment` status) ───────

const assessmentSchema = new mongoose.Schema(
  {
    domainScores: { type: [domainScoreSchema], default: [] },
    strengths: { type: String, default: null }, // free-form
    challenges: { type: String, default: null },
    priorityNeeds: { type: [String], default: [] }, // ordered top needs
    assessmentSummary: { type: String, default: null },
    completedAt: { type: Date, default: null },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // SLA backlink (for easier subject lookup during routing)
  },
  { _id: false }
);

// ── embedded: intervention plan item ───────────────────────────────

const interventionItemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: INTERVENTION_TYPES, required: true },
    title: { type: String, required: true },
    description: { type: String, default: null },
    targetDomain: { type: String, enum: ASSESSMENT_DOMAIN_CODES, default: null },
    startDate: { type: Date, default: null },
    targetCompletionDate: { type: Date, default: null },
    actualCompletionDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed', 'skipped', 'cancelled'],
      default: 'planned',
    },
    outcome: { type: String, default: null }, // narrative on completion
    assignedToWorkerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: String, default: null },
  },
  { _id: true }
);

const interventionPlanSchema = new mongoose.Schema(
  {
    items: { type: [interventionItemSchema], default: [] },
    rationale: { type: String, default: null },
    reviewDueDate: { type: Date, default: null },
    createdAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    lastReviewedAt: { type: Date, default: null },
  },
  { _id: false }
);

// ── main schema ────────────────────────────────────────────────────

const socialCaseSchema = new mongoose.Schema(
  {
    caseNumber: { type: String, required: true, unique: true, uppercase: true },

    // ── identity / subject ─────────────────────────────────────
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian', default: null },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },

    // ── classification ─────────────────────────────────────────
    caseType: { type: String, enum: CASE_TYPES, required: true, default: 'intake' },
    riskLevel: { type: String, enum: RISK_LEVELS, default: 'low', index: true },

    // ── workflow ───────────────────────────────────────────────
    status: {
      type: String,
      enum: CASE_STATUSES,
      default: 'intake',
      index: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },

    // ── ownership ──────────────────────────────────────────────
    assignedWorkerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assignedWorkerNameSnapshot: { type: String, default: null },
    transferredToWorkerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    transferredAt: { type: Date, default: null },
    transferReason: { type: String, default: null },

    // ── assessment (embedded, filled during `assessment` status) ──
    assessment: { type: assessmentSchema, default: () => ({}) },
    assessmentSummary: { type: String, default: null }, // shortcut (also on assessment)

    // ── intervention plan (embedded) ───────────────────────────
    interventionPlan: { type: interventionPlanSchema, default: () => ({}) },

    // ── referrals to external orgs / govt ──────────────────────
    referrals: {
      type: [
        new mongoose.Schema(
          {
            targetOrg: { type: String, required: true },
            targetContact: { type: String, default: null },
            reason: { type: String, default: null },
            sentAt: { type: Date, default: Date.now },
            status: {
              type: String,
              enum: ['pending', 'accepted', 'declined', 'completed', 'cancelled'],
              default: 'pending',
            },
            outcome: { type: String, default: null },
          },
          { _id: true, timestamps: false }
        ),
      ],
      default: [],
    },

    // ── closure ────────────────────────────────────────────────
    closureOutcome: { type: String, enum: [...CLOSURE_OUTCOMES, null], default: null },
    closureSummary: { type: String, default: null },
    closureReason: { type: String, default: null }, // used by cancelled path
    closedAt: { type: Date, default: null },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // ── SLA backlinks ──────────────────────────────────────────
    intakeSlaId: { type: mongoose.Schema.Types.ObjectId, ref: 'SLA', default: null, index: true },
    planSlaId: { type: mongoose.Schema.Types.ObjectId, ref: 'SLA', default: null, index: true },
    highRiskSlaId: { type: mongoose.Schema.Types.ObjectId, ref: 'SLA', default: null },

    // ── misc ───────────────────────────────────────────────────
    tags: { type: [String], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'care_social_cases' }
);

// ── indexes ────────────────────────────────────────────────────────

socialCaseSchema.index({ assignedWorkerId: 1, status: 1 });
socialCaseSchema.index({ branchId: 1, status: 1 });
socialCaseSchema.index({ beneficiaryId: 1, status: 1 });
socialCaseSchema.index({ riskLevel: 1, status: 1 });
socialCaseSchema.index({ status: 1, createdAt: -1 });

// ── auto-numbering SC-YYYY-NNNNN ───────────────────────────────────

socialCaseSchema.pre('validate', async function () {
  if (this.caseNumber) return;
  const year = (this.createdAt || new Date()).getUTCFullYear();
  const Model = mongoose.model('SocialCase');
  const count = await Model.countDocuments({
    caseNumber: { $regex: `^SC-${year}-` },
  });
  this.caseNumber = `SC-${year}-${String(count + 1).padStart(5, '0')}`;
});

// ── virtuals ───────────────────────────────────────────────────────

socialCaseSchema.virtual('ageDays').get(function () {
  return Math.floor((Date.now() - this.createdAt.getTime()) / 86400000);
});

socialCaseSchema.virtual('isTerminal').get(function () {
  return ['closed', 'transferred', 'cancelled'].includes(this.status);
});

socialCaseSchema.virtual('isHighRisk').get(function () {
  return ['high', 'critical'].includes(this.riskLevel);
});

socialCaseSchema.virtual('openInterventions').get(function () {
  return (this.interventionPlan?.items || []).filter(i =>
    ['planned', 'in_progress'].includes(i.status)
  ).length;
});

socialCaseSchema.set('toJSON', { virtuals: true });
socialCaseSchema.set('toObject', { virtuals: true });

const SocialCase = mongoose.models.SocialCase || mongoose.model('SocialCase', socialCaseSchema);

module.exports = SocialCase;

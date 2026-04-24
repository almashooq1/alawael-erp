'use strict';

/**
 * PsychRiskFlag.model.js — Phase 17 Commit 5 (4.0.87).
 *
 * One document per raised mental-health risk flag (suicidal
 * ideation, self-harm, severe depression, psychotic symptoms,
 * etc.). Lifecycle: active → monitoring → resolved / archived,
 * with an escape to escalated for psychiatric emergency.
 *
 * Auto-numbered `RF-YYYY-NNNNN`. Carries an SLA backlink for
 * critical-severity flags (1h response, 24/7).
 */

const mongoose = require('mongoose');
const { FLAG_TYPES, FLAG_SEVERITIES, FLAG_STATUSES } = require('../../config/care/psych.registry');

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

const actionTakenSchema = new mongoose.Schema(
  {
    takenAt: { type: Date, required: true, default: Date.now },
    takenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    kind: { type: String, required: true }, // e.g., 'safety_plan_created', 'mdt_convened', 'family_notified'
    notes: { type: String, default: null },
  },
  { _id: true }
);

const psychRiskFlagSchema = new mongoose.Schema(
  {
    flagNumber: { type: String, required: true, unique: true, uppercase: true },

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

    flagType: { type: String, enum: FLAG_TYPES, required: true, index: true },
    severity: { type: String, enum: FLAG_SEVERITIES, required: true, index: true },

    status: {
      type: String,
      enum: FLAG_STATUSES,
      default: 'active',
      index: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },

    // Who raised it + context
    raisedAt: { type: Date, default: Date.now },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    raisedByRole: { type: String, default: null }, // 'psychologist', 'social_worker', etc.
    source: { type: String, default: null }, // 'manual', 'scale:phq9', 'scale:gad7', 'scale:dass21', 'incident'
    triggerReference: { type: String, default: null }, // free-text pointer to scale id / incident id

    description: { type: String, default: null },

    // Safety plan (required before moving to monitoring)
    safetyPlan: { type: String, default: null },
    safetyPlanReviewDue: { type: Date, default: null },

    // Actions + escalation
    actions: { type: [actionTakenSchema], default: [] },
    escalationReason: { type: String, default: null },
    escalatedToMdtId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MdtMeeting',
      default: null,
    },

    // Resolution
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolutionNotes: { type: String, default: null },
    resolutionOutcome: { type: String, default: null }, // 'stable', 'referred_external', 'no_longer_at_risk'

    // Reopening (after resolved, if flag re-occurs)
    reopenReason: { type: String, default: null },

    // Cancellation (raised in error)
    cancellationReason: { type: String, default: null },

    // SLA back-link (critical flags only)
    slaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SLA',
      default: null,
      index: true,
    },

    assignedToUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    tags: { type: [String], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'care_psych_risk_flags' }
);

psychRiskFlagSchema.index({ beneficiaryId: 1, status: 1, raisedAt: -1 });
psychRiskFlagSchema.index({ branchId: 1, severity: 1, status: 1 });
psychRiskFlagSchema.index({ status: 1, raisedAt: -1 });

// ── auto-numbering ──────────────────────────────────────────────────

psychRiskFlagSchema.pre('validate', async function () {
  if (this.flagNumber) return;
  const year = (this.raisedAt || new Date()).getUTCFullYear();
  const Model = mongoose.model('PsychRiskFlag');
  const count = await Model.countDocuments({
    flagNumber: { $regex: `^RF-${year}-` },
  });
  this.flagNumber = `RF-${year}-${String(count + 1).padStart(5, '0')}`;
});

// ── virtuals ────────────────────────────────────────────────────────

psychRiskFlagSchema.virtual('isOpen').get(function () {
  return !['resolved', 'archived', 'cancelled'].includes(this.status);
});

psychRiskFlagSchema.virtual('ageMinutes').get(function () {
  if (!this.raisedAt) return null;
  return Math.round((Date.now() - this.raisedAt.getTime()) / 60000);
});

psychRiskFlagSchema.set('toJSON', { virtuals: true });
psychRiskFlagSchema.set('toObject', { virtuals: true });

const PsychRiskFlag =
  mongoose.models.PsychRiskFlag || mongoose.model('PsychRiskFlag', psychRiskFlagSchema);

module.exports = PsychRiskFlag;

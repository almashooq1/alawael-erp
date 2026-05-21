'use strict';

/**
 * BranchReassessmentPolicy — Wave 230
 *
 * Per-branch overrides for the W222 lifecycle policy + W225 reminder
 * recipient resolution. One document per branch.
 *
 * The W222 `tick()` and W225 `dispatch()` accept a `policy` /
 * `recipientHints` argument — callers (cron jobs, admin tools) read
 * the persisted policy from this collection via
 * `branchReassessmentPolicy.service.js` and pass it in.
 *
 * Tightening-only invariant:
 *
 *   Branch-overridden timing values MUST be tighter than or equal to
 *   the W222 defaults (DEFAULT_POLICY). A branch CANNOT make its
 *   escalation/breach windows looser — only stricter. This guards
 *   against well-meaning configuration drift that would silently
 *   weaken CBAHI evidence requirements across the org.
 *
 *   Defaults from W222 reassessmentLifecycle.service.js:
 *     dueSoonDays:        7
 *     dueNowDays:         1
 *     overdueDays:        1
 *     escalateAfterDays:  7
 *     breachAfterDays:    14
 *
 *   Branch values must satisfy:
 *     overrideValue <= defaultValue       (for ESCALATE / BREACH)
 *     overrideValue >= defaultValue       (for DUE_SOON window — bigger lookahead)
 *
 *   Caller-side enforcement in the service — the model only enforces
 *   non-negative integers.
 *
 * @module domains/goals/models/BranchReassessmentPolicy
 */

const mongoose = require('mongoose');

const policySchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      unique: true,
      index: true,
    },

    // ── Lifecycle policy (W222 overrides) ─────────────────────────
    // null/undefined for any field means "use W222 default".
    policy: {
      dueSoonDays: { type: Number, min: 0 },
      dueNowDays: { type: Number, min: 0 },
      overdueDays: { type: Number, min: 0 },
      escalateAfterDays: { type: Number, min: 0 },
      breachAfterDays: { type: Number, min: 0 },
    },

    // ── W225 reminder fan-out hints ───────────────────────────────
    // Single branch-level supervisor + QA reviewer. The W225 cascade
    // builds {supervisorByBranchId, qaByBranchId} maps from the
    // active policy docs across all branches before dispatching.
    supervisorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    qaReviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ── Lifecycle ─────────────────────────────────────────────────
    isActive: { type: Boolean, default: true, index: true },
    effectiveFrom: Date,
    effectiveUntil: Date,
    notes: String,

    // ── Audit ─────────────────────────────────────────────────────
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'branch_reassessment_policies',
  }
);

policySchema.index({ isActive: 1, branchId: 1 });

policySchema.pre('validate', function () {
  // effectiveUntil must be after effectiveFrom
  if (this.effectiveFrom && this.effectiveUntil && this.effectiveUntil <= this.effectiveFrom) {
    throw new Error('BranchReassessmentPolicy: effectiveUntil must be after effectiveFrom');
  }
});

const BranchReassessmentPolicy =
  mongoose.models.BranchReassessmentPolicy ||
  mongoose.model('BranchReassessmentPolicy', policySchema);

module.exports = {
  BranchReassessmentPolicy,
  policySchema,
};

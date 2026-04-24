'use strict';

/**
 * HrChangeRequest — Phase 11 Commit 11 (4.0.28).
 *
 * State-machine document for admin patches that require a second
 * signature before they apply. Governance cases (Saudi Labor Law
 * + internal control):
 *
 *   • Salary increases > threshold (default 15%) — WPS + GOSI impact
 *   • Employee termination — Labor-law notice + EOS settlement
 *   • Branch transfer — cost-center + scheduling ripple
 *   • National-id / iqama corrections — identity integrity
 *
 * The existing admin PATCH writes directly to Employee. When a
 * sensitive field is in the patch, the service creates an
 * HrChangeRequest in status `pending`, leaves the Employee record
 * untouched, and returns a request id. A second HR_MANAGER (or
 * higher-tier role depending on rule) reviews + approves, at which
 * point the stored patch is applied and status flips to `applied`.
 *
 * Shape:
 *
 *   employee_id        target Employee
 *   requestor_user_id  who proposed
 *   requestor_role     role at proposal time (immutable)
 *   proposed_changes   Map<path, newValue> — flat
 *   baseline_values    Map<path, oldValue> — frozen at proposal
 *   reason             short string from requestor
 *   rules_triggered    list of rule ids this patch hit
 *   branch_id          snapshotted for scope + analytics
 *
 *   status             pending | approved | rejected | applied | cancelled
 *   approver_user_id   filled on approve/reject
 *   approver_role      role at approval time
 *   approved_at
 *   rejected_at
 *   rejection_reason
 *   applied_at         filled after apply succeeds
 *
 * Design decisions:
 *
 *   1. Every terminal state is immutable — once approved/rejected/
 *      applied/cancelled, status cannot move. The service layer is
 *      the only place that transitions state.
 *
 *   2. baseline_values is snapshotted at proposal time. If the
 *      employee record drifts between proposal and approval (e.g.
 *      someone else already updated salary), the approver sees a
 *      concurrency check via `applyApproved` — rejects with a
 *      `stale_baseline` error instead of silently overwriting.
 *
 *   3. Self-approval is forbidden at the service layer. The Mongoose
 *      model just stores what it's told.
 *
 *   4. Soft-delete via deleted_at (consistent with other HR models).
 */

const mongoose = require('mongoose');

const HR_CHANGE_STATUSES = Object.freeze([
  'pending',
  'approved',
  'rejected',
  'applied',
  'cancelled',
]);

const hrChangeRequestSchema = new mongoose.Schema(
  {
    employee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    branch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
    },

    requestor_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requestor_role: { type: String, required: true },

    proposed_changes: { type: mongoose.Schema.Types.Mixed, required: true },
    baseline_values: { type: mongoose.Schema.Types.Mixed, default: {} },

    reason: { type: String, maxlength: 2000 },
    rules_triggered: { type: [String], default: [] },

    status: {
      type: String,
      enum: HR_CHANGE_STATUSES,
      default: 'pending',
      index: true,
    },

    approver_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approver_role: { type: String, default: null },
    approved_at: { type: Date, default: null },
    rejected_at: { type: Date, default: null },
    rejection_reason: { type: String, default: null },
    applied_at: { type: Date, default: null },
    apply_error: { type: String, default: null },

    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

hrChangeRequestSchema.index({ employee_id: 1, status: 1 });
hrChangeRequestSchema.index({ branch_id: 1, status: 1 });
hrChangeRequestSchema.index({ requestor_user_id: 1, createdAt: -1 });

hrChangeRequestSchema.virtual('is_terminal').get(function () {
  return ['approved', 'rejected', 'applied', 'cancelled'].includes(this.status);
});

module.exports =
  mongoose.models.HrChangeRequest || mongoose.model('HrChangeRequest', hrChangeRequestSchema);

module.exports.HR_CHANGE_STATUSES = HR_CHANGE_STATUSES;

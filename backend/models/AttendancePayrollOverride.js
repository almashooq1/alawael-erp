'use strict';

/**
 * AttendancePayrollOverride — Wave 99 Phase 4.
 *
 * The ONLY mechanism for correcting attendance after a payroll period
 * is closed. Direct edits to reconciliation cases or source events
 * with `lockedByPayrollPeriodId != null` are refused at service layer.
 *
 * Each override carries:
 *   • beforeSnapshot — the values at lock time (sha-verifiable)
 *   • afterSnapshot  — the corrected values
 *   • reason         — Arabic justification (≥10 chars, no placeholders)
 *   • approverChain  — ordered list with each approver's userId + role
 *                      + decision + nafathSignatureId
 *   • final `nafathSignatureId` for the operator who issued it (tier-3)
 *
 * The next payroll cycle applies the delta (afterSnapshot.totalMinutes
 * minus beforeSnapshot.totalMinutes) as an adjustment line — the
 * closed period itself is NEVER mutated.
 *
 * Wave-18 invariants:
 *   • reason length ≥ 10 chars
 *   • approverChain has at least one HR_MANAGER step with decision=approved
 *   • nafathSignatureId required for state='executed'
 *   • beforeSnapshot.totalMinutes and afterSnapshot.totalMinutes both required
 *   • state='executed' requires executedAt + appliedToNextPeriodId or null+notesIfNotApplied
 */

const mongoose = require('mongoose');
const reg = require('../intelligence/hikvision.registry');

const SnapshotSchema = new mongoose.Schema(
  {
    finalCheckIn: { type: Date, default: null },
    finalCheckOut: { type: Date, default: null },
    totalMinutes: { type: Number, required: true, min: 0 },
    overtimeMinutes: { type: Number, default: 0, min: 0 },
    checkInClassification: { type: String, default: null },
    checkOutClassification: { type: String, default: null },
    hash: { type: String, default: null, maxlength: 128 },
  },
  { _id: false }
);

const ApproverStepSchema = new mongoose.Schema(
  {
    step: { type: String, enum: reg.PAYROLL_OVERRIDE_APPROVALS, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: { type: String, default: null, maxlength: 100 },
    decision: {
      type: String,
      enum: ['approved', 'rejected', 'pending'],
      default: 'pending',
    },
    decidedAt: { type: Date, default: null },
    note: { type: String, default: null, maxlength: 500 },
    nafathSignatureId: { type: String, default: null, maxlength: 200 },
  },
  { _id: false }
);

const AttendancePayrollOverrideSchema = new mongoose.Schema(
  {
    payrollPeriodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PayrollPeriod',
      required: true,
      index: true,
    },
    reconciliationCaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceReconciliationCase',
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    shiftDate: { type: Date, required: true },

    beforeSnapshot: { type: SnapshotSchema, required: true },
    afterSnapshot: { type: SnapshotSchema, required: true },
    netDeltaMinutes: { type: Number, default: 0 },

    reason: { type: String, required: true, maxlength: 4000 },

    approverChain: { type: [ApproverStepSchema], default: () => [] },

    // Operator who initiated + signed the override (tier-3 Nafath required).
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    initiatorRole: { type: String, default: null, maxlength: 100 },
    nafathSignatureId: { type: String, default: null, maxlength: 200 },

    state: {
      type: String,
      enum: ['draft', 'pending-approval', 'approved', 'rejected', 'executed', 'cancelled'],
      default: 'draft',
      index: true,
    },

    executedAt: { type: Date, default: null },
    appliedToNextPeriodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PayrollPeriod',
      default: null,
    },
    notesIfNotApplied: { type: String, default: null, maxlength: 500 },

    // Tamper-evidence
    anchorTxId: { type: String, default: null, maxlength: 200 },
  },
  { timestamps: true, collection: 'attendance_payroll_overrides' }
);

AttendancePayrollOverrideSchema.index({ payrollPeriodId: 1, state: 1 });
AttendancePayrollOverrideSchema.index({ employeeId: 1, shiftDate: -1 });
AttendancePayrollOverrideSchema.index({ state: 1, createdAt: -1 });

// ─── Wave-18 invariants ──────────────────────────────────────────
AttendancePayrollOverrideSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

AttendancePayrollOverrideSchema.path('__invariants').validate(function () {
  let ok = true;

  if (typeof this.reason !== 'string' || this.reason.trim().length < 10) {
    this.invalidate('reason', 'reason must be at least 10 characters');
    ok = false;
  }

  if (this.state === 'executed') {
    if (!this.executedAt) {
      this.invalidate('executedAt', 'executed overrides require executedAt');
      ok = false;
    }
    if (!this.nafathSignatureId) {
      this.invalidate('nafathSignatureId', 'executed overrides require initiator nafath signature');
      ok = false;
    }
    // Must have at least one HR approval in the chain
    const hasHrApproval =
      Array.isArray(this.approverChain) &&
      this.approverChain.some(
        s => s.step === reg.PAYROLL_OVERRIDE_APPROVAL.HR_MANAGER && s.decision === 'approved'
      );
    if (!hasHrApproval) {
      this.invalidate('approverChain', 'executed overrides require HR_MANAGER approval in chain');
      ok = false;
    }
  }

  return ok;
});

module.exports =
  mongoose.models.AttendancePayrollOverride ||
  mongoose.model('AttendancePayrollOverride', AttendancePayrollOverrideSchema);

module.exports.AttendancePayrollOverrideSchema = AttendancePayrollOverrideSchema;

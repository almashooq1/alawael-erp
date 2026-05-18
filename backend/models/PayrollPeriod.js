'use strict';

/**
 * PayrollPeriod — Wave 99 Phase 4.
 *
 * Represents one payroll cycle (typically monthly). Lifecycle:
 *
 *   open    — events flow in, reconciliation cases mutable
 *   closing — snapshot computation in progress; new attendance source
 *             events for dates in this period are REFUSED
 *   closed  — period is sealed; any change goes through override ledger
 *
 * Lock-cascade behaviour:
 *   When status flips closing → closed:
 *     1. Compute snapshot hash over all reconciliation cases in [start, end]
 *     2. Set status = closed + closedAt + closedBy
 *     3. Update every reconciliation case in the period:
 *        status = locked, lockedByPayrollPeriodId, lockedAt, lockSnapshotHash
 *     4. Update every attendance source event in the period:
 *        lockedByPayrollPeriodId
 *     5. Write AuditLog entry with the snapshot hash
 *     6. (Optional) Anchor snapshot hash to ledger for tamper-evidence
 *
 * Wave-18 invariants:
 *   • endDate > startDate
 *   • status='closed' requires closedAt + closedBy + closeSnapshotHash
 *   • status='open' must NOT carry closedAt/closedBy/closeSnapshotHash
 *   • non-overlapping with other periods of same branchId (enforced
 *     at service layer because Mongo can't express overlap via index)
 */

const mongoose = require('mongoose');
const reg = require('../intelligence/hikvision.registry');

const PayrollPeriodSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    // Human-readable code: "2026-05" / "2026-Q2" / etc. Unique per branch.
    periodCode: { type: String, required: true, maxlength: 32, trim: true },

    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },

    status: {
      type: String,
      enum: reg.PAYROLL_PERIOD_STATUSES,
      default: reg.PAYROLL_PERIOD_STATUS.OPEN,
      index: true,
    },

    // Close metadata
    closedAt: { type: Date, default: null },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    closedByRole: { type: String, default: null, maxlength: 100 },

    // Snapshot of all reconciled cases at close time. sha256 over
    // sorted (employeeId|shiftDate|totalMinutes|overtimeMinutes) rows.
    // Any later "audit-replay" recomputes this and compares.
    closeSnapshotHash: { type: String, default: null, maxlength: 128 },
    casesCounted: { type: Number, default: 0, min: 0 },

    // Counter for how many overrides have been issued against this
    // period after close. Kept on the period for fast UI rendering.
    overrideCount: { type: Number, default: 0, min: 0 },

    // Optional anchor reference (Wave 17 blockchain ledger)
    anchorTxId: { type: String, default: null, maxlength: 200 },

    notes: { type: String, default: null, maxlength: 1000 },
  },
  { timestamps: true, collection: 'payroll_periods' }
);

// Unique periodCode per branch (or globally when branchId is null)
PayrollPeriodSchema.index({ branchId: 1, periodCode: 1 }, { unique: true });
PayrollPeriodSchema.index({ status: 1, endDate: -1 });

// ─── Wave-18 invariants ──────────────────────────────────────────
PayrollPeriodSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

PayrollPeriodSchema.path('__invariants').validate(function () {
  let ok = true;

  if (
    this.startDate &&
    this.endDate &&
    new Date(this.endDate).getTime() <= new Date(this.startDate).getTime()
  ) {
    this.invalidate('endDate', 'endDate must be > startDate');
    ok = false;
  }

  if (this.status === reg.PAYROLL_PERIOD_STATUS.CLOSED) {
    if (!this.closedAt) {
      this.invalidate('closedAt', 'closed periods require closedAt');
      ok = false;
    }
    if (!this.closedBy) {
      this.invalidate('closedBy', 'closed periods require closedBy');
      ok = false;
    }
    if (!this.closeSnapshotHash) {
      this.invalidate('closeSnapshotHash', 'closed periods require closeSnapshotHash');
      ok = false;
    }
  }

  if (this.status === reg.PAYROLL_PERIOD_STATUS.OPEN) {
    if (this.closedAt || this.closedBy || this.closeSnapshotHash) {
      this.invalidate('closedAt', 'open periods must not carry close metadata');
      ok = false;
    }
  }

  return ok;
});

module.exports =
  mongoose.models.PayrollPeriod || mongoose.model('PayrollPeriod', PayrollPeriodSchema);

module.exports.PayrollPeriodSchema = PayrollPeriodSchema;

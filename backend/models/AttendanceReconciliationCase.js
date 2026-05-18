'use strict';

/**
 * AttendanceReconciliationCase — Wave 99 Phase 4.
 *
 * One case per (employeeId, shiftDate) representing the reconciler's
 * decision about that day. Built from one OR MORE `AttendanceSourceEvent`
 * rows. The case is what payroll sees — not the individual source events.
 *
 * Lifecycle:
 *   open    → reconciler created or updated this case, modifications allowed
 *   resolved → operator resolved a conflict OR reconciler had no conflict
 *   locked  → payroll period closed; subsequent edits must go through override
 *
 * Wave-18 invariants:
 *   • finalCheckIn ≤ finalCheckOut (when both present)
 *   • conflictType=NONE rows must NOT have a resolverNote
 *   • conflictType ∈ {MULTI_SOURCE_DISAGREEMENT, IMPOSSIBLE_TRAVEL, …}
 *     rows REQUIRE resolverId + resolvedAt when state='resolved'
 *   • status='locked' rows MUST have lockedByPayrollPeriodId
 */

const mongoose = require('mongoose');
const reg = require('../intelligence/hikvision.registry');

const SourceRefSchema = new mongoose.Schema(
  {
    sourceEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceSourceEvent',
      required: true,
    },
    source: { type: String, enum: reg.ATTENDANCE_SOURCES, required: true },
    eventTime: { type: Date, required: true },
    trustTier: { type: Number, enum: reg.TRUST_TIERS, required: true },
    used: { type: Boolean, default: true }, // false = de-duped or rejected by merge
  },
  { _id: false }
);

const AttendanceReconciliationCaseSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    shiftDate: { type: Date, required: true, index: true }, // start-of-day in branch tz

    sources: { type: [SourceRefSchema], default: () => [] },

    finalCheckIn: { type: Date, default: null },
    finalCheckOut: { type: Date, default: null },
    totalMinutes: { type: Number, default: null, min: 0 },
    overtimeMinutes: { type: Number, default: 0, min: 0 },

    checkInClassification: { type: String, enum: reg.SHIFT_CLASSIFICATIONS, default: null },
    checkInDeltaMin: { type: Number, default: null },
    checkOutClassification: { type: String, enum: reg.SHIFT_CLASSIFICATIONS, default: null },
    checkOutDeltaMin: { type: Number, default: null },

    conflictType: {
      type: String,
      enum: reg.RECONCILIATION_CONFLICTS,
      default: reg.RECONCILIATION_CONFLICT.NONE,
      index: true,
    },
    conflictDetails: { type: String, default: null, maxlength: 1000 },

    status: {
      type: String,
      enum: ['open', 'resolved', 'locked'],
      default: 'open',
      index: true,
    },

    // Operator resolution (only required for genuine conflicts)
    resolverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolverNote: { type: String, default: null, maxlength: 1000 },
    resolvedAt: { type: Date, default: null },

    // Payroll lock
    lockedByPayrollPeriodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PayrollPeriod',
      default: null,
      index: true,
    },
    lockedAt: { type: Date, default: null },

    // Wave 5 fraud will attach risk flags here
    flags: { type: [{ type: String, maxlength: 80 }], default: () => [] },

    // Snapshot hash of (finalCheckIn|finalCheckOut|totalMinutes|overtimeMinutes)
    // at lock time. Used by override ledger to prove the before-state.
    lockSnapshotHash: { type: String, default: null, maxlength: 128 },
  },
  { timestamps: true, collection: 'attendance_reconciliation_cases' }
);

// One case per (employee, shift_date) — multiple recon runs UPDATE the
// same row instead of inserting duplicates.
AttendanceReconciliationCaseSchema.index({ employeeId: 1, shiftDate: 1 }, { unique: true });
AttendanceReconciliationCaseSchema.index({ branchId: 1, shiftDate: -1 });
AttendanceReconciliationCaseSchema.index({ conflictType: 1, status: 1 });
AttendanceReconciliationCaseSchema.index({ status: 1, lockedByPayrollPeriodId: 1 });

// ─── Wave-18 invariants ──────────────────────────────────────────
AttendanceReconciliationCaseSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

const CONFLICTS_NEEDING_RESOLUTION = new Set([
  reg.RECONCILIATION_CONFLICT.MULTI_SOURCE_DISAGREEMENT,
  reg.RECONCILIATION_CONFLICT.IMPOSSIBLE_TRAVEL,
  reg.RECONCILIATION_CONFLICT.MISSING_CHECKIN,
  reg.RECONCILIATION_CONFLICT.MISSING_CHECKOUT,
  reg.RECONCILIATION_CONFLICT.SHIFT_BRIDGE,
]);

AttendanceReconciliationCaseSchema.path('__invariants').validate(function () {
  let ok = true;

  if (this.finalCheckIn && this.finalCheckOut) {
    if (new Date(this.finalCheckOut).getTime() < new Date(this.finalCheckIn).getTime()) {
      this.invalidate('finalCheckOut', 'finalCheckOut must be >= finalCheckIn');
      ok = false;
    }
  }

  if (
    this.status === 'resolved' &&
    CONFLICTS_NEEDING_RESOLUTION.has(this.conflictType) &&
    (!this.resolverId || !this.resolvedAt)
  ) {
    this.invalidate(
      'resolverId',
      `resolved cases of type ${this.conflictType} need a resolverId + resolvedAt`
    );
    ok = false;
  }

  if (this.status === 'locked' && !this.lockedByPayrollPeriodId) {
    this.invalidate('lockedByPayrollPeriodId', 'locked cases require a payroll period reference');
    ok = false;
  }

  if (this.conflictType === reg.RECONCILIATION_CONFLICT.NONE && this.resolverNote) {
    // NONE shouldn't carry resolver tracking — defends against tooling
    // that auto-writes notes everywhere.
    this.invalidate('resolverNote', 'cases with conflictType=NONE must not carry a resolverNote');
    ok = false;
  }

  return ok;
});

module.exports =
  mongoose.models.AttendanceReconciliationCase ||
  mongoose.model('AttendanceReconciliationCase', AttendanceReconciliationCaseSchema);

module.exports.AttendanceReconciliationCaseSchema = AttendanceReconciliationCaseSchema;

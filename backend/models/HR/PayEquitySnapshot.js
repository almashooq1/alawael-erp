'use strict';

/**
 * PayEquitySnapshot.js — a persisted, branch-scoped pay-equity analysis run (W1193).
 *
 * Stores ONLY aggregate metrics (medians/means/gap-% per demographic group +
 * outlier counts + an equity score) — never individual salaries — so a snapshot
 * is a compliance/trend artifact, not a PII store (no TTL; equity history is the
 * point). The disadvantaged-group medians are still group aggregates over groups
 * of size ≥ MIN_GROUP (the lib refuses to report smaller groups), so they cannot
 * re-identify an individual.
 *
 * branchId here is the analysis SCOPE (which branch's workforce was analysed),
 * set explicitly by the service from the caller's effective branch — NOT derived
 * from an employee, so this model does NOT use hrBranchScope.plugin.
 */

const mongoose = require('mongoose');

const TwoGroupGapSchema = new mongoose.Schema(
  {
    _id: false,
    // generic two-group gap: keys differ per dimension, kept Mixed-free + explicit
    aCount: { type: Number, default: 0, min: 0 },
    bCount: { type: Number, default: 0, min: 0 },
    aMedian: { type: Number, default: null },
    bMedian: { type: Number, default: null },
    aMean: { type: Number, default: null },
    bMean: { type: Number, default: null },
    medianGapPct: { type: Number, default: null },
    meanGapPct: { type: Number, default: null },
    direction: { type: String, default: null }, // disadvantaged label, or 'equal'/null
    reportable: { type: Boolean, default: false }, // false when a group < MIN_GROUP
  },
  { _id: false }
);

const PayEquitySnapshotSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    scope: {
      level: { type: String, enum: ['branch', 'department'], default: 'branch' },
      department: { type: String, default: null },
    },
    computedAt: { type: Date, required: true },
    headcount: { type: Number, required: true, min: 0 },

    // gender gap (a=male, b=female) — labels documented here, generic shape reused
    genderGap: { type: TwoGroupGapSchema, default: () => ({}) },
    // nationality gap (a=saudi, b=nonSaudi)
    nationalityGap: { type: TwoGroupGapSchema, default: () => ({}) },

    cohortOutliers: {
      count: { type: Number, default: 0, min: 0 },
      ratePct: { type: Number, default: 0, min: 0 },
      thresholdPct: { type: Number, default: 20, min: 0 },
      byTitle: { type: Boolean, default: false },
    },

    equityScore: { type: Number, required: true, min: 0, max: 100 },
    flaggedCount: { type: Number, default: 0, min: 0 },
    computedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Wave-18 cross-field invariants
    __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
  },
  { timestamps: true, collection: 'hr_pay_equity_snapshots' }
);

PayEquitySnapshotSchema.index({ branchId: 1, computedAt: -1 });
PayEquitySnapshotSchema.index({ branchId: 1, 'scope.department': 1, computedAt: -1 });

// W1123 lesson: a `select:false` __invariants validator is SKIPPED on update-
// saves unless the path is marked modified — force it so invariants always run.
PayEquitySnapshotSchema.pre('validate', function markInvariants() {
  // sync, no `next` — a declared `next` param makes the global mongoose.plugins
  // shim treat this as callback-style and never passes next (W954 / W1123 lesson).
  this.markModified('__invariants');
});

PayEquitySnapshotSchema.path('__invariants').validate(function validateInvariants() {
  // equityScore within [0,100]
  if (this.equityScore == null || this.equityScore < 0 || this.equityScore > 100) {
    this.invalidate('equityScore', 'equityScore must be within [0,100]');
  }
  // flaggedCount cannot exceed headcount
  if (this.flaggedCount != null && this.headcount != null && this.flaggedCount > this.headcount) {
    this.invalidate('flaggedCount', 'flaggedCount cannot exceed headcount');
  }
  // department scope requires a department name; branch scope must NOT carry one
  if (this.scope) {
    if (this.scope.level === 'department' && !this.scope.department) {
      this.invalidate('scope.department', 'department scope requires scope.department');
    }
    if (this.scope.level === 'branch' && this.scope.department) {
      this.invalidate('scope.department', 'branch scope must not carry a department');
    }
  }
  // a reportable gap must carry a numeric medianGapPct + a direction
  for (const dim of ['genderGap', 'nationalityGap']) {
    const g = this[dim];
    if (g && g.reportable) {
      if (g.medianGapPct == null) this.invalidate(`${dim}.medianGapPct`, 'reportable gap needs medianGapPct');
      if (!g.direction) this.invalidate(`${dim}.direction`, 'reportable gap needs direction');
    }
  }
  return true;
});

module.exports =
  mongoose.models.PayEquitySnapshot ||
  mongoose.model('PayEquitySnapshot', PayEquitySnapshotSchema);

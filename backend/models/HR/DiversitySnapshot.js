'use strict';

/**
 * DiversitySnapshot.js — a persisted, branch-scoped workforce D&I analysis run (W1199).
 *
 * Aggregate-only (counts / %s / indices — never an individual row), so it's a
 * compliance/trend artifact, not PII. branchId is the analysis SCOPE (set by the
 * service from the caller's effective branch), NOT derived from an employee — so
 * this model does not use the hrBranchScope plugin.
 */

const mongoose = require('mongoose');

const DiversitySnapshotSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    scope: {
      level: { type: String, enum: ['branch', 'department'], default: 'branch' },
      department: { type: String, default: null },
    },
    computedAt: { type: Date, required: true },
    headcount: { type: Number, required: true, min: 0 },

    // composition: { counts: {group: n}, pct: {group: %} } — aggregate maps
    gender: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    nationality: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },

    saudizationRatePct: { type: Number, default: null, min: 0, max: 100 },

    diversityIndex: {
      genderBlau: { type: Number, default: null, min: 0, max: 1 },
      nationalityBlau: { type: Number, default: null, min: 0, max: 1 },
      departmentShannon: { type: Number, default: null, min: 0, max: 1 },
    },

    // glass-ceiling: per-group top-tier-minus-bottom-tier representation delta
    seniorityCliff: {
      gender: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
      nationality: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
      reportable: { type: Boolean, default: false },
    },

    computedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
  },
  { timestamps: true, collection: 'hr_diversity_snapshots' }
);

DiversitySnapshotSchema.index({ branchId: 1, computedAt: -1 });
DiversitySnapshotSchema.index({ branchId: 1, 'scope.department': 1, computedAt: -1 });

// W1123 — markModified so the select:false validator runs on update-saves too.
DiversitySnapshotSchema.pre('validate', function markInvariants() {
  this.markModified('__invariants');
});

DiversitySnapshotSchema.path('__invariants').validate(function validateInvariants() {
  if (
    this.saudizationRatePct != null &&
    (this.saudizationRatePct < 0 || this.saudizationRatePct > 100)
  ) {
    this.invalidate('saudizationRatePct', 'saudizationRatePct must be within [0,100]');
  }
  const di = this.diversityIndex || {};
  for (const k of ['genderBlau', 'nationalityBlau', 'departmentShannon']) {
    if (di[k] != null && (di[k] < 0 || di[k] > 1)) {
      this.invalidate(`diversityIndex.${k}`, `${k} must be within [0,1]`);
    }
  }
  if (this.scope) {
    if (this.scope.level === 'department' && !this.scope.department) {
      this.invalidate('scope.department', 'department scope requires scope.department');
    }
    if (this.scope.level === 'branch' && this.scope.department) {
      this.invalidate('scope.department', 'branch scope must not carry a department');
    }
  }
  return true;
});

module.exports =
  mongoose.models.DiversitySnapshot || mongoose.model('DiversitySnapshot', DiversitySnapshotSchema);

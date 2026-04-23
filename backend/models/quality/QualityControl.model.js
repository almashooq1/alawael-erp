'use strict';

/**
 * QualityControl — Phase 13 Commit 4 (4.0.58).
 *
 * Persistent record for a single quality / regulatory control.
 * Distinct from the pre-existing `ComplianceControl` model which
 * is SOX-oriented (financial-reporting categories). This model is
 * purpose-built for CBAHI/JCI/MOH/ISO/PDPL/SFDA healthcare-rehab
 * controls and is seeded from `config/control-library.registry.js`.
 *
 * One QualityControl row = one testable assertion. Test runs are
 * appended to `testRuns[]` as an audit trail; the latest result is
 * mirrored to top-level fields (`lastResult`, `lastTestedAt`,
 * `nextDueAt`) for cheap queries from the health-score aggregator
 * (Phase 13 Commit 9).
 */

const mongoose = require('mongoose');
const {
  CONTROL_CATEGORIES,
  CONTROL_TYPES,
  CONTROL_FREQUENCIES,
  CONTROL_CRITICALITY,
  CONTROL_TEST_METHODS,
  CONTROL_STATUSES,
  TEST_RESULT_OUTCOMES,
} = require('../../config/control-library.registry');

// ── sub-schemas ────────────────────────────────────────────────────

const regulationRefSchema = new mongoose.Schema(
  {
    standard: { type: String, required: true },
    clause: { type: String, required: true },
    version: { type: String, default: null },
  },
  { _id: false }
);

const testRunSchema = new mongoose.Schema(
  {
    outcome: { type: String, enum: TEST_RESULT_OUTCOMES, required: true },
    method: { type: String, enum: CONTROL_TEST_METHODS, required: true },
    score: { type: Number, min: 0, max: 100, default: null },
    testedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    testedAt: { type: Date, required: true, default: Date.now },
    evidenceIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'EvidenceItem' }],
      default: [],
    },
    narrative: { type: String, default: null },
    gaps: { type: [String], default: [] }, // short descriptions of partial-fail items
    autoCheckDetails: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: true }
);

// ── main schema ────────────────────────────────────────────────────

const qualityControlSchema = new mongoose.Schema(
  {
    // Canonical id from the registry (e.g. "cbahi.ps.01"). Unique
    // per tenant so two branches under the same tenant share the
    // same control catalogue.
    controlId: { type: String, required: true, index: true },

    nameAr: { type: String, required: true },
    nameEn: { type: String, required: true },
    description: { type: String, default: null },
    assertion: { type: String, required: true },

    category: { type: String, enum: CONTROL_CATEGORIES, required: true },
    type: { type: String, enum: CONTROL_TYPES, required: true },
    frequency: { type: String, enum: CONTROL_FREQUENCIES, required: true },
    criticality: { type: String, enum: CONTROL_CRITICALITY, required: true },
    testMethod: { type: String, enum: CONTROL_TEST_METHODS, required: true },

    regulationRefs: { type: [regulationRefSchema], default: [] },

    autoTestHint: { type: mongoose.Schema.Types.Mixed, default: null },

    // Lifecycle
    status: { type: String, enum: CONTROL_STATUSES, default: 'active', index: true },
    deprecatedReason: { type: String, default: null },
    notApplicableReason: { type: String, default: null },

    // Ownership (snapshotted; follows org role change)
    ownerRole: { type: String, default: null },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Latest mirror for fast reads
    lastResult: {
      type: String,
      enum: [...TEST_RESULT_OUTCOMES, null],
      default: null,
    },
    lastScore: { type: Number, default: null, min: 0, max: 100 },
    lastTestedAt: { type: Date, default: null },
    nextDueAt: { type: Date, default: null, index: true },

    // Full history
    testRuns: { type: [testRunSchema], default: [] },

    // Scope
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },

    tags: { type: [String], default: [] },

    // Soft-delete (almost never used; controls are deprecated in place)
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

// ── indexes ────────────────────────────────────────────────────────

qualityControlSchema.index(
  { tenantId: 1, branchId: 1, controlId: 1 },
  { unique: true, sparse: true }
);
qualityControlSchema.index({ branchId: 1, status: 1, category: 1 });
qualityControlSchema.index({ branchId: 1, criticality: 1, lastResult: 1 });
qualityControlSchema.index({ 'regulationRefs.standard': 1, 'regulationRefs.clause': 1 });
qualityControlSchema.index({ deleted_at: 1 });

// ── virtuals ───────────────────────────────────────────────────────

qualityControlSchema.virtual('isOverdue').get(function () {
  if (!this.nextDueAt) return false;
  return this.nextDueAt.getTime() < Date.now();
});

qualityControlSchema.virtual('framework').get(function () {
  const ids = this.controlId ? this.controlId.split('.') : [];
  return ids.length ? ids[0] : null;
});

qualityControlSchema.set('toJSON', { virtuals: true });
qualityControlSchema.set('toObject', { virtuals: true });

// ── export ─────────────────────────────────────────────────────────

const QualityControl =
  mongoose.models.QualityControl || mongoose.model('QualityControl', qualityControlSchema);

module.exports = QualityControl;

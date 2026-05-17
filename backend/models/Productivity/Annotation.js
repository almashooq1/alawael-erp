'use strict';

/**
 * Annotation — Wave 27.
 *
 * Per-KPI internal comments. See Wave 25 design at
 * `docs/blueprint/33-premium-productivity-features.md` §3.1.
 *
 * Indexes:
 *   • (kpiId, at DESC) — primary read path: list annotations for a KPI
 *   • (branchId, at DESC) — branch-scoped reads
 *   • byUserId — for user activity reports
 */

const mongoose = require('mongoose');

const AnnotationSchema = new mongoose.Schema(
  {
    kpiId: { type: String, required: true, maxlength: 200, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    byUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    byRole: { type: String, default: null, maxlength: 100 },
    textAr: { type: String, default: null, maxlength: 2000 },
    textEn: { type: String, default: null, maxlength: 2000 },
    visibility: {
      type: String,
      enum: ['authenticated', 'role-restricted'],
      default: 'authenticated',
    },
    visibilityRoles: { type: [String], default: [] },
    at: { type: Date, default: Date.now, required: true },
    resolvedAt: { type: Date, default: null, index: true },
  },
  { timestamps: false, collection: 'productivity_annotations' }
);

// Primary read path: list latest annotations for a KPI
AnnotationSchema.index({ kpiId: 1, at: -1 });
// Branch-scoped: list all annotations on KPIs at a branch
AnnotationSchema.index({ branchId: 1, at: -1 });

// Schema-level cross-field invariant (Wave 18 pattern).
AnnotationSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});
AnnotationSchema.path('__invariants').validate(function () {
  if (!this.textAr && !this.textEn) {
    this.invalidate('textAr', 'Annotation requires textAr or textEn');
    return false;
  }
  return true;
});

// Wave 35 — adopt branchScopePlugin (requireActor: false for back-compat
// with existing callers; the hook still scopes when actor IS passed,
// preventing IDOR. Future wave will flip to requireActor: true once
// every caller has been migrated to pass req.actor via setOptions.)
const branchScopePlugin = require('../../intelligence/branchScopePlugin');
AnnotationSchema.plugin(branchScopePlugin, { requireActor: false });

module.exports =
  mongoose.models.ProductivityAnnotation ||
  mongoose.model('ProductivityAnnotation', AnnotationSchema);

module.exports.AnnotationSchema = AnnotationSchema;

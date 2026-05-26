'use strict';

/**
 * W337 — CapaItem (Corrective Action / Preventive Action) model.
 *
 * Closes the long-standing W325c baseline phantom for 'CapaItem' (4 callers in
 * AuditOccurrence.findings[].linkedCapaId + FmeaWorksheet.linkedCapaId/relatedCapaIds[]
 * + RcaInvestigation.linkedCapaId). Until W337 these callers ref'd a non-existent model;
 * graceful degradation via `tryRequire('../../models/CapaItem')` in predictiveRisk.service
 * + `default: null` on all linkedCapaId fields prevented runtime breakage.
 *
 * Canonical refs (W324+W326+W327+W329 compliant):
 *   - branchId      → 'Branch'    (per W326)
 *   - tenantId      → 'Tenant'
 *   - ownerUserId   → 'User'      (per W327)
 *   - verifierUserId, createdBy, updatedBy, closedBy → 'User'
 *   - source.refId  → polymorphic (intentionally no ref; validated at service layer)
 *
 * Status enum is DYNAMIC from capa-lifecycle.lib.LIFECYCLE_STATES (W332 sync pattern —
 * zero model↔registry desync possible by design).
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
const lib = require('../../intelligence/capa-lifecycle.lib');

const lifecycleHistorySchema = new Schema(
  {
    fromStatus: { type: String, enum: lib.LIFECYCLE_STATES, required: true },
    toStatus: { type: String, enum: lib.LIFECYCLE_STATES, required: true },
    actor: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reasonCode: { type: String, default: null },
    notes: { type: String, default: null },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const capaItemSchema = new Schema(
  {
    capaNumber: { type: String, unique: true, index: true },

    // Type + classification
    type: { type: String, enum: lib.CAPA_TYPES, required: true },
    priority: { type: String, enum: lib.PRIORITIES, default: 'medium', index: true },

    // Core content
    title: { type: String, required: true },
    description: { type: String, required: true },
    rootCause: { type: String, default: null },
    actionPlan: { type: String, default: null },
    verificationCriteria: { type: String, default: null },
    verificationEvidence: { type: String, default: null },

    // Lifecycle
    status: {
      type: String,
      enum: lib.LIFECYCLE_STATES,
      default: 'OPEN',
      index: true,
    },
    lifecycleHistory: { type: [lifecycleHistorySchema], default: [] },

    // Ownership + scoping
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    verifierUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null },

    // Dates
    dueDate: { type: Date, required: true, index: true },
    implementedAt: { type: Date, default: null },
    verifiedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },

    // Polymorphic source backlink (matches EvidenceItem.sourceRef pattern)
    source: {
      module: { type: String, enum: lib.SOURCE_MODULES, required: true },
      refId: { type: Schema.Types.ObjectId, default: null },
      collection: { type: String, default: null },
    },

    // Audit
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    closedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'capa_items' }
);

// Compound indexes for QMS dashboards + sweepers
capaItemSchema.index({ status: 1, dueDate: 1 });
capaItemSchema.index({ branchId: 1, status: 1 });
capaItemSchema.index({ 'source.module': 1, 'source.refId': 1 });

capaItemSchema.pre('validate', async function () {
  if (!this.capaNumber) {
    const year = new Date().getUTCFullYear();
    const Model = mongoose.model('CapaItem');
    const count = await Model.countDocuments({ capaNumber: { $regex: `^CAPA-${year}-` } });
    this.capaNumber = `CAPA-${year}-${String(count + 1).padStart(4, '0')}`;
  }
});

// W340 — defense-in-depth: validate every status change against the lifecycle DAG
// before the doc is persisted. Mirrors W332 care-plan + W334 Pass 2 AiRecommendation
// pre-save hook pattern. Throws a CapaTransitionError on violation; the route layer
// catches and returns the lib's structured {code, message} as 400/403.
capaItemSchema.pre('save', function (next) {
  if (this.isNew) return next();
  if (!this.isModified('status')) return next();
  const from = this.$__.priorDoc ? this.$__.priorDoc.status : (this._original?.status ?? null);
  const to = this.status;
  if (from == null || from === to) return next();
  // Caller is expected to attach { actor, reasonCode, notes, mfaTier } via
  // this.$locals.transition (Mongoose convention) before .save(). When absent
  // (e.g. seeders), we skip the MFA + reason guards but still enforce the DAG.
  const ctx = this.$locals?.transition || {};
  const result = lib.validateTransition({
    from,
    to,
    actor: ctx.actor,
    reasonCode: ctx.reasonCode,
    notes: ctx.notes,
    // Only enforce MFA tier if caller supplied one (otherwise treat as system call).
    mfaTier: ctx.mfaTier != null ? ctx.mfaTier : Number.MAX_SAFE_INTEGER,
  });
  if (!result.ok) {
    const err = new Error(result.message);
    err.code = result.code;
    err.name = 'CapaTransitionError';
    return next(err);
  }
  // Append the audit entry — frozen object; safe to push.
  this.lifecycleHistory.push(result.entry);
  return next();
});

// W429: optimistic concurrency. Same race-class as W428 on
// AiRecommendationBundle. Pre-save hook runs validateTransition +
// appends to lifecycleHistory[]. Without OCC, two concurrent
// transitionCapa() calls (UI double-tap on the "Verify" button, retry
// loop, supervisor + auditor simultaneously transitioning) would both
// see the same `from` status, both pass validateTransition, both push
// a lifecycleHistory entry — silent duplicate audit trail + double-
// emit on the quality.capa.* event bus.
//
// Atomic findOneAndUpdate would bypass the pre-save hook (same
// reason W428 chose OCC over atomic flip). With OCC the second
// concurrent save throws VersionError, surfaces as a 500/409, and
// the second user sees "someone else just modified this — please
// refresh".
capaItemSchema.set('optimisticConcurrency', true);

module.exports = mongoose.models.CapaItem || mongoose.model('CapaItem', capaItemSchema);

'use strict';

/**
 * MeasureRevision — سجل تدقيق التغييرات على مكتبة المقاييس (Wave 210)
 *
 * Append-only audit collection that records every governance-relevant
 * change to a Measure: publish/deprecate/retire transitions, edits to
 * scoring/MCID/cadence/sensitivity, and version bumps.
 *
 * Why a separate collection (not just timestamps on Measure):
 *   • Cross-time queries — "who changed GMFM-66 MCID in the last year?"
 *   • Defensible audit trail for CBAHI/MOHRSD measure-version reviews
 *   • Frozen historical record even when the Measure itself is retired
 *   • Decoupled from Measure save flow — write failures don't break
 *     the primary mutation (hook is wrapped in try/catch in Measure.js)
 *
 * Designed to be light — the diff payload is optional. Callers either
 * pass the changed paths (cheap) or a full JSON diff (when worth it).
 *
 * @module domains/goals/models/MeasureRevision
 */

const mongoose = require('mongoose');

const measureRevisionSchema = new mongoose.Schema(
  {
    measureCode: { type: String, required: true, index: true },
    fromVersion: String, // SemVer of previous head, if any
    toVersion: String, // SemVer after this change

    changeType: {
      type: String,
      required: true,
      enum: [
        'create',
        'edit',
        'publish', // draft/preview/under_review → active
        'deprecate', // active → deprecated
        'retire', // deprecated/draft → retired
        'translation_fix',
        'mcid_update',
        'scoring_fix',
        'band_revision',
        'cadence_update',
        'sensitivity_change',
      ],
      index: true,
    },

    // What changed — caller's choice between cheap (changedPaths) or
    // verbose (diff payload). Both optional.
    changedPaths: [String],
    diff: mongoose.Schema.Types.Mixed,

    changeSummary: String,
    changeSummary_ar: String,

    revisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    revisedAt: { type: Date, required: true, default: Date.now, index: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,

    cbahiReReviewRequired: { type: Boolean, default: false },

    // Free-form context (e.g. PR link, sprint ID, incident ref)
    context: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
    collection: 'measure_revisions',
  }
);

measureRevisionSchema.index({ measureCode: 1, revisedAt: -1 });
measureRevisionSchema.index({ changeType: 1, revisedAt: -1 });

// Immutable — once written, never edited. Updates are denied at the
// model layer to keep this audit trail trustworthy.
function denyUpdate() {
  throw new Error('MeasureRevision is append-only — no updates allowed');
}
measureRevisionSchema.pre('findOneAndUpdate', denyUpdate);
measureRevisionSchema.pre('updateOne', denyUpdate);
measureRevisionSchema.pre('updateMany', denyUpdate);

const MeasureRevision =
  mongoose.models.MeasureRevision || mongoose.model('MeasureRevision', measureRevisionSchema);

module.exports = { MeasureRevision, measureRevisionSchema };

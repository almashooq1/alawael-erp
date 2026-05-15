'use strict';

/**
 * FmeaWorksheet.model.js — World-Class QMS Phase 29 Commit 1.
 *
 * Persists Failure Mode and Effects Analysis worksheets for both
 * AIAG-VDA industrial FMEA (S/O/D on 1-10) and VA NCPS Healthcare
 * FMEA (severity × probability on 4×5 hazard matrix).
 *
 * Shape design choices:
 *   • One worksheet = one process / product / system under analysis.
 *   • `rows[]` is a flexible array — each row is one Function →
 *     Failure Mode → Effect → Cause(s) → Control(s) → Ratings →
 *     Recommended Actions chain. Rows are independent so two
 *     facilitators can work in parallel on different rows.
 *   • Ratings are stored on the row, with a top-level `scale`
 *     pinned on the worksheet (aiag_10 / hfmea_5) so cross-row
 *     validation is consistent.
 *   • Auto-numbered as `FMEA-YYYY-NNNN` via pre-save hook + the
 *     atomic `Counter` model.
 *   • Each row carries pre-action ratings AND post-action ratings,
 *     enabling Step 8 (verify the effectiveness of the action).
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { FMEA_STATUSES, HFMEA_DECISION_TREE } = require('../../config/fmea.registry');

// ── Decision-tree sub-document (HFMEA Step 4) ──────────────────────

const decisionTreeSchema = new Schema(
  {
    singlePointWeakness: { type: Boolean, default: null },
    existingControl: { type: Boolean, default: null },
    detectability: { type: Boolean, default: null },
    proceedToAction: { type: Boolean, default: null },
    rationale: { type: String, default: null },
  },
  { _id: false }
);

// ── Recommended action sub-document ────────────────────────────────

const actionSchema = new Schema(
  {
    type: { type: String, enum: ['eliminate', 'control', 'accept'], required: true },
    description: { type: String, required: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'completed', 'overdue', 'cancelled'],
      default: 'open',
    },
    completedAt: { type: Date, default: null },
    completionNotes: { type: String, default: null },
    // Cross-link into the CAPA system if the team chose to mirror this
    // FMEA action there.
    linkedCapaId: { type: Schema.Types.ObjectId, ref: 'CapaItem', default: null },
    evidenceItemIds: [{ type: Schema.Types.ObjectId, ref: 'EvidenceItem' }],
  },
  { timestamps: true }
);

// ── One row of the FMEA worksheet ──────────────────────────────────

const fmeaRowSchema = new Schema(
  {
    rowNumber: { type: Number, required: true },

    // The process step / component being analysed.
    functionAr: { type: String, required: true },
    functionEn: { type: String, default: null },

    // Failure mode = HOW the function can fail.
    failureMode: { type: String, required: true },

    // Failure EFFECT — impact on the patient / customer / next process.
    failureEffect: { type: String, required: true },

    // Failure CAUSES — what mechanism produces the failure mode.
    failureCauses: { type: [String], default: [] },

    // CONTROLS already in place. AIAG splits these into prevention vs
    // detection; we keep both.
    preventionControls: { type: [String], default: [] },
    detectionControls: { type: [String], default: [] },

    // Pre-action ratings.
    severity: { type: Number, min: 1, max: 10, required: true },
    occurrence: { type: Number, min: 1, max: 10, default: null }, // AIAG only
    detection: { type: Number, min: 1, max: 10, default: null }, // AIAG only
    probability: { type: Number, min: 1, max: 4, default: null }, // HFMEA only

    // Derived / computed.
    rpn: { type: Number, default: null }, // S × O × D for AIAG
    hazardScore: { type: Number, default: null }, // S × P for HFMEA
    actionPriority: { type: String, enum: ['high', 'medium', 'low', null], default: null },

    // HFMEA Step-4 decision tree (only meaningful when scale = hfmea_5).
    decisionTree: { type: decisionTreeSchema, default: () => ({}) },

    // Recommended actions for THIS row.
    actions: { type: [actionSchema], default: [] },

    // Post-action re-rating (Step 8 — verify effectiveness).
    revisedSeverity: { type: Number, min: 1, max: 10, default: null },
    revisedOccurrence: { type: Number, min: 1, max: 10, default: null },
    revisedDetection: { type: Number, min: 1, max: 10, default: null },
    revisedProbability: { type: Number, min: 1, max: 4, default: null },
    revisedRpn: { type: Number, default: null },
    revisedHazardScore: { type: Number, default: null },
    revisedAt: { type: Date, default: null },
    revisedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    // Free-text notes (justifications, references to literature, etc.).
    notes: { type: String, default: null },
  },
  { _id: true, timestamps: true }
);

// ── Top-level FMEA worksheet ───────────────────────────────────────

const fmeaWorksheetSchema = new Schema(
  {
    fmeaNumber: { type: String, unique: true, index: true }, // FMEA-YYYY-NNNN
    type: {
      type: String,
      enum: ['hfmea', 'pfmea', 'dfmea', 'sfmea', 'efmea', 'ufmea'],
      required: true,
    },
    scale: { type: String, enum: ['aiag_10', 'hfmea_5'], required: true },
    title: { type: String, required: true },
    description: { type: String, default: null },

    // Scope — what process / product / system is under analysis.
    scope: { type: String, required: true },
    processFlow: { type: String, default: null }, // markdown or text
    boundaries: { type: String, default: null }, // explicit out-of-scope

    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null, index: true },

    // Multi-disciplinary team (VA NCPS Step 1).
    facilitatorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    team: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        nameSnapshot: String,
        role: String,
        present: { type: Boolean, default: true },
        signedAt: { type: Date, default: null },
        signatureHash: { type: String, default: null },
      },
    ],

    // Lifecycle.
    status: {
      type: String,
      enum: FMEA_STATUSES,
      default: 'draft',
      index: true,
    },
    submittedAt: { type: Date, default: null },
    signedAt: { type: Date, default: null },
    verifiedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
    cancelledReason: { type: String, default: null },

    // Cross-references.
    relatedIncidentIds: [{ type: Schema.Types.ObjectId, ref: 'Incident' }],
    relatedRiskIds: [{ type: Schema.Types.ObjectId, ref: 'Risk' }],
    relatedCapaIds: [{ type: Schema.Types.ObjectId, ref: 'CapaItem' }],
    supersedesId: { type: Schema.Types.ObjectId, ref: 'FmeaWorksheet', default: null },
    supersededById: { type: Schema.Types.ObjectId, ref: 'FmeaWorksheet', default: null },

    // The worksheet rows.
    rows: { type: [fmeaRowSchema], default: [] },

    // Audit fields.
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'fmea_worksheets' }
);

// ── Indexes ────────────────────────────────────────────────────────

fmeaWorksheetSchema.index({ branchId: 1, status: 1, type: 1 });
fmeaWorksheetSchema.index({ status: 1, updatedAt: -1 });
fmeaWorksheetSchema.index({ 'rows.actionPriority': 1, status: 1 });

// ── Virtuals ───────────────────────────────────────────────────────

fmeaWorksheetSchema.virtual('openActionsCount').get(function () {
  let n = 0;
  for (const row of this.rows || []) {
    for (const a of row.actions || []) {
      if (['open', 'in_progress', 'overdue'].includes(a.status)) n++;
    }
  }
  return n;
});

fmeaWorksheetSchema.virtual('highestRpn').get(function () {
  let max = 0;
  for (const row of this.rows || []) {
    const v = Number(row.rpn || row.hazardScore || 0);
    if (v > max) max = v;
  }
  return max;
});

fmeaWorksheetSchema.virtual('actionablesRemaining').get(function () {
  return (this.rows || []).filter(
    r => r.actionPriority === 'high' && (r.actions || []).every(a => a.status !== 'completed')
  ).length;
});

// ── Hooks ──────────────────────────────────────────────────────────

fmeaWorksheetSchema.pre('validate', async function () {
  if (!this.fmeaNumber) {
    const year = new Date().getUTCFullYear();
    const Model = mongoose.model('FmeaWorksheet');
    const count = await Model.countDocuments({
      fmeaNumber: { $regex: `^FMEA-${year}-` },
    });
    this.fmeaNumber = `FMEA-${year}-${String(count + 1).padStart(4, '0')}`;
  }
});

fmeaWorksheetSchema.pre('save', function () {
  // Compute derived ratings on every save (runs synchronously).
  for (const row of this.rows || []) {
    if (this.scale === 'aiag_10') {
      if (row.severity && row.occurrence && row.detection) {
        row.rpn = row.severity * row.occurrence * row.detection;
      }
      if (row.revisedSeverity && row.revisedOccurrence && row.revisedDetection) {
        row.revisedRpn = row.revisedSeverity * row.revisedOccurrence * row.revisedDetection;
      }
    } else if (this.scale === 'hfmea_5') {
      if (row.severity && row.probability) {
        row.hazardScore = row.severity * row.probability;
      }
      if (row.revisedSeverity && row.revisedProbability) {
        row.revisedHazardScore = row.revisedSeverity * row.revisedProbability;
      }
    }
  }
});

// Stable export pattern used across the quality models.
module.exports =
  mongoose.models.FmeaWorksheet || mongoose.model('FmeaWorksheet', fmeaWorksheetSchema);

// Expose the decision-tree registry so the UI can render help text
// without a second HTTP call.
module.exports.HFMEA_DECISION_TREE = HFMEA_DECISION_TREE;

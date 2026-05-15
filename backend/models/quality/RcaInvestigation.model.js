'use strict';

/**
 * RcaInvestigation.model.js — World-Class QMS Phase 29 Commit 2.
 *
 * One investigation combines both methods:
 *   • fiveWhys[]      — ordered cause→cause chain.
 *   • ishikawa{}      — keyed by category code; values are cause lists.
 *
 * Root causes can be promoted from either source and turned into
 * actions on the worksheet (or linked to a CAPA item).
 *
 * Auto-numbered: RCA-YYYY-NNNN.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { RCA_STATUSES } = require('../../config/rca.registry');

const ishikawaCauseSchema = new Schema(
  {
    text: { type: String, required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now },
    isRootCause: { type: Boolean, default: false },
  },
  { _id: true }
);

const fiveWhysSchema = new Schema(
  {
    level: { type: Number, required: true, min: 1, max: 7 },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    evidence: { type: String, default: null }, // optional reference / quote
    isRootCause: { type: Boolean, default: false },
  },
  { _id: true }
);

const rootCauseSchema = new Schema(
  {
    text: { type: String, required: true },
    source: { type: String, enum: ['five_whys', 'ishikawa', 'manual'], required: true },
    sourceRefId: { type: Schema.Types.ObjectId, default: null }, // points to a fiveWhys or ishikawa node
    category: { type: String, default: null }, // ishikawa category if applicable
    severity: { type: Number, min: 1, max: 6, default: 3 },
    addressed: { type: Boolean, default: false },
    linkedCapaId: { type: Schema.Types.ObjectId, ref: 'CapaItem', default: null },
  },
  { _id: true }
);

const actionSchema = new Schema(
  {
    description: { type: String, required: true },
    rootCauseId: { type: Schema.Types.ObjectId, default: null },
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dueDate: { type: Date, required: true },
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'completed', 'overdue', 'cancelled'],
      default: 'open',
    },
    completedAt: { type: Date, default: null },
    effectivenessVerified: { type: Boolean, default: false },
    effectivenessNotes: { type: String, default: null },
  },
  { timestamps: true }
);

const rcaSchema = new Schema(
  {
    rcaNumber: { type: String, unique: true, index: true },

    title: { type: String, required: true },
    eventDate: { type: Date, required: true },
    eventDescription: { type: String, required: true },

    severity: { type: Number, min: 1, max: 6, required: true },

    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null, index: true },

    // Source linkage.
    incidentId: { type: Schema.Types.ObjectId, ref: 'Incident', default: null, index: true },
    complaintId: { type: Schema.Types.ObjectId, ref: 'Complaint', default: null, index: true },

    // Team.
    facilitatorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    team: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        nameSnapshot: String,
        role: String,
      },
    ],

    // Ishikawa.
    ishikawaVariant: { type: String, enum: ['6m', 'healthcare'], default: 'healthcare' },
    ishikawa: {
      // Stored as a Map so categories can be added/removed dynamically.
      type: Map,
      of: [ishikawaCauseSchema],
      default: () => new Map(),
    },

    // 5 Whys.
    fiveWhys: { type: [fiveWhysSchema], default: [] },

    // Identified root causes.
    rootCauses: { type: [rootCauseSchema], default: [] },

    // Actions.
    actions: { type: [actionSchema], default: [] },

    // Evidence references.
    evidenceItemIds: [{ type: Schema.Types.ObjectId, ref: 'EvidenceItem' }],

    // Lifecycle.
    status: { type: String, enum: RCA_STATUSES, default: 'draft', index: true },
    cancelledReason: { type: String, default: null },
    verifiedAt: { type: Date, default: null },

    // Lessons learned (short narrative, shared across the org).
    lessonsLearned: { type: String, default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'rca_investigations' }
);

rcaSchema.index({ branchId: 1, status: 1 });
rcaSchema.index({ severity: -1, status: 1 });

rcaSchema.virtual('openActionsCount').get(function () {
  return (this.actions || []).filter(a => ['open', 'in_progress', 'overdue'].includes(a.status))
    .length;
});

rcaSchema.virtual('rootCauseCount').get(function () {
  return (this.rootCauses || []).length;
});

rcaSchema.pre('validate', async function () {
  if (!this.rcaNumber) {
    const year = (this.eventDate || new Date()).getUTCFullYear();
    const Model = mongoose.model('RcaInvestigation');
    const count = await Model.countDocuments({
      rcaNumber: { $regex: `^RCA-${year}-` },
    });
    this.rcaNumber = `RCA-${year}-${String(count + 1).padStart(4, '0')}`;
  }
});

module.exports = mongoose.models.RcaInvestigation || mongoose.model('RcaInvestigation', rcaSchema);

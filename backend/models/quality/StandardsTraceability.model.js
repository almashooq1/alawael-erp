'use strict';

/**
 * StandardsTraceability.model.js — World-Class QMS Phase 29 Commit 5.
 *
 * One record per (standardCode, clauseCode, branchId) tuple. Holds the
 * current status against that clause, attached evidence, owner, and
 * review history.
 *
 * Generic enough to host any structured standard (ISO 9001, JCI,
 * CBAHI, ISO 13485, etc.) — the standard-specific intent / labels
 * live in the per-standard registries under `backend/config/standards/`.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const reviewSchema = new Schema(
  {
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedAt: { type: Date, default: Date.now },
    note: { type: String, default: null },
    statusFrom: { type: String, default: null },
    statusTo: { type: String, default: null },
  },
  { _id: true }
);

const traceSchema = new Schema(
  {
    standardCode: { type: String, required: true, index: true },
    clauseCode: { type: String, required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null },

    status: {
      type: String,
      enum: [
        'not_started',
        'in_progress',
        'evidence_attached',
        'audit_passed',
        'lapsed',
        'not_applicable',
      ],
      default: 'not_started',
      index: true,
    },

    evidenceItemIds: [{ type: Schema.Types.ObjectId, ref: 'EvidenceItem' }],

    // Free-form pointer to whatever holds the evidence within the
    // platform (incident, audit, training record, SOP, etc.).
    evidenceLinks: [
      {
        kind: {
          type: String,
          enum: [
            'sop',
            'policy',
            'procedure',
            'work_instruction',
            'record',
            'training_record',
            'internal_audit',
            'management_review',
            'capa',
            'risk_assessment',
            'measurement',
            'kpi',
            'meeting_minutes',
            'job_description',
            'objective_evidence',
            'fmea',
            'rca',
          ],
        },
        refId: { type: Schema.Types.ObjectId, default: null },
        url: { type: String, default: null },
        title: { type: String, default: null },
        addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        addedAt: { type: Date, default: Date.now },
      },
    ],

    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    notApplicableReason: { type: String, default: null },
    lastReviewedAt: { type: Date, default: null },
    nextReviewDue: { type: Date, default: null },
    reviewHistory: { type: [reviewSchema], default: [] },

    notes: { type: String, default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'standards_traceability' }
);

// Compound unique key: one record per (standard, clause, branch).
traceSchema.index(
  { standardCode: 1, clauseCode: 1, branchId: 1 },
  { unique: true, partialFilterExpression: { deleted_at: null } }
);
traceSchema.index({ standardCode: 1, status: 1 });

module.exports =
  mongoose.models.StandardsTraceability || mongoose.model('StandardsTraceability', traceSchema);

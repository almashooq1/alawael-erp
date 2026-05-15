'use strict';

/**
 * A3Report.model.js — World-Class QMS Phase 29 Commit 4.
 *
 * Toyota / Lean A3 problem-solving template. Sections are stored as a
 * `Map<sectionCode, body>` so unfilled sections don't bloat the doc.
 *
 * Auto-numbered: A3-YYYY-NNNN.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { A3_STATUSES } = require('../../config/pareto-a3.registry');

const actionRowSchema = new Schema(
  {
    description: { type: String, required: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'completed', 'overdue', 'cancelled'],
      default: 'open',
    },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const a3Schema = new Schema(
  {
    reportNumber: { type: String, unique: true, index: true },
    title: { type: String, required: true },
    problemStatement: { type: String, required: true },

    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null, index: true },

    // Cross-references.
    incidentId: { type: Schema.Types.ObjectId, ref: 'Incident', default: null },
    rcaId: { type: Schema.Types.ObjectId, ref: 'RcaInvestigation', default: null },
    fmeaId: { type: Schema.Types.ObjectId, ref: 'FmeaWorksheet', default: null },

    // Sections body — Map<code, narrative text>.
    sections: { type: Map, of: String, default: () => new Map() },

    actions: { type: [actionRowSchema], default: [] },

    sponsorUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    facilitatorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    status: { type: String, enum: A3_STATUSES, default: 'draft', index: true },
    cancelledReason: { type: String, default: null },
    approvedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'a3_reports' }
);

a3Schema.index({ branchId: 1, status: 1 });

a3Schema.pre('validate', async function () {
  if (!this.reportNumber) {
    const year = new Date().getUTCFullYear();
    const Model = mongoose.model('A3Report');
    const count = await Model.countDocuments({
      reportNumber: { $regex: `^A3-${year}-` },
    });
    this.reportNumber = `A3-${year}-${String(count + 1).padStart(4, '0')}`;
  }
});

module.exports = mongoose.models.A3Report || mongoose.model('A3Report', a3Schema);

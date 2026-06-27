/**
 * Compliance Audit Model — نموذج تدقيق الامتثال والاعتماد
 * ══════════════════════════════════════════════════════════
 * Tracks adherence to accreditation standards (CBAHI, ISO 9001, JCI, etc.)
 * for rehabilitation centers. Supports evidence attachments, corrective
 * actions, review scheduling, and immutable audit trail.
 *
 * Standards: CBAHI | ISO_9001 | JCI | NPHIES | SCHS | OTHER
 */

'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

/* ─── Helpers ─────────────────────────────────────────── */

/**
 * Generate audit number: AUD-YYYY-NNNN
 */
function generateAuditNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `AUD-${year}-${random}`;
}

/* ─── Corrective Action Sub-Schema ───────────────────── */

const CorrectiveActionSchema = new Schema(
  {
    action: { type: String, required: true },
    dueDate: { type: Date },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    responsible: { type: ObjectId, ref: 'User' },
  },
  { _id: true }
);

/* ─── Evidence Sub-Schema ─────────────────────────────── */

const EvidenceSchema = new Schema(
  {
    documentId: { type: ObjectId, ref: 'Document' },
    fileName: { type: String },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

/* ─── Audit Trail Entry (immutable snapshot) ──────────── */

const AuditTrailEntrySchema = new Schema(
  {
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: ObjectId, ref: 'User' },
    field: { type: String },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    note: { type: String },
  },
  { _id: true }
);

/* ─── Main Compliance Audit Schema ────────────────────── */

const ComplianceAuditSchema = new Schema(
  {
    // ── Identity ──
    auditNumber: {
      type: String,
      required: true,
      unique: true,
      default: generateAuditNumber,
      index: true,
    },

    // ── Standard & Category ──
    standard: {
      type: String,
      enum: ['CBAHI', 'ISO_9001', 'JCI', 'NPHIES', 'SCHS', 'OTHER'],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['clinical', 'administrative', 'technical', 'financial', 'safety'],
      required: true,
      index: true,
    },
    criteria: { type: String, required: true }, // بند المعيار
    description: { type: String, required: true },

    // ── Status ──
    status: {
      type: String,
      enum: ['compliant', 'partially_compliant', 'non_compliant', 'not_applicable', 'pending'],
      default: 'pending',
      index: true,
    },

    // ── Evidence ──
    evidence: [EvidenceSchema],

    // ── Responsibility ──
    responsiblePerson: { type: ObjectId, ref: 'User', index: true },

    // ── Review Schedule ──
    reviewDate: { type: Date },
    nextReviewDate: { type: Date, index: true },

    // ── Findings & Actions ──
    findings: { type: String },
    correctiveActions: [CorrectiveActionSchema],

    // ── Scoring ──
    score: { type: Number, min: 0, max: 100 },

    // ── Branch ──
    branchId: { type: ObjectId, ref: 'Branch', index: true },

    // ── Immutable Audit Trail ──
    auditTrail: [AuditTrailEntrySchema],
  },
  { timestamps: true }
);

/* ─── Compound Indexes ────────────────────────────────── */

ComplianceAuditSchema.index({ branchId: 1, standard: 1, status: 1 });
ComplianceAuditSchema.index({ standard: 1, category: 1, status: 1 });
ComplianceAuditSchema.index({ nextReviewDate: 1, status: 1 });
ComplianceAuditSchema.index({ 'correctiveActions.completed': 1, status: 1 });

/* ─── Pre-save Middleware ─────────────────────────────── */

ComplianceAuditSchema.pre('save', function (next) {
  if (this.isNew && !this.auditNumber) {
    this.auditNumber = generateAuditNumber();
  }
  next();
});

/* ─── Methods ─────────────────────────────────────────── */

/**
 * Add an immutable audit trail entry.
 */
ComplianceAuditSchema.methods.addAuditTrailEntry = function (entry) {
  this.auditTrail.push({
    changedAt: entry.changedAt || new Date(),
    changedBy: entry.changedBy,
    field: entry.field,
    oldValue: entry.oldValue,
    newValue: entry.newValue,
    note: entry.note,
  });
  return this;
};

/**
 * Add a corrective action.
 */
ComplianceAuditSchema.methods.addCorrectiveAction = function (actionData) {
  this.correctiveActions.push(actionData);
  return this;
};

/**
 * Mark a corrective action as completed.
 */
ComplianceAuditSchema.methods.completeCorrectiveAction = function (actionId, completedBy) {
  const action = this.correctiveActions.id(actionId);
  if (action) {
    action.completed = true;
    action.completedAt = new Date();
    this.addAuditTrailEntry({
      changedBy: completedBy,
      field: 'correctiveActions.completed',
      oldValue: false,
      newValue: true,
      note: `Completed corrective action: ${action.action}`,
    });
  }
  return this;
};

/**
 * Add evidence document.
 */
ComplianceAuditSchema.methods.addEvidence = function (documentId, fileName) {
  this.evidence.push({
    documentId,
    fileName,
    uploadedAt: new Date(),
  });
  return this;
};

/* ─── Statics ─────────────────────────────────────────── */

/**
 * Get dashboard overview for a branch/standard.
 */
ComplianceAuditSchema.statics.getDashboardStats = async function (filters = {}) {
  const match = {};
  if (filters.branchId) match.branchId = filters.branchId;
  if (filters.standard) match.standard = filters.standard;

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        compliant: { $sum: { $cond: [{ $eq: ['$status', 'compliant'] }, 1, 0] } },
        partiallyCompliant: { $sum: { $cond: [{ $eq: ['$status', 'partially_compliant'] }, 1, 0] } },
        nonCompliant: { $sum: { $cond: [{ $eq: ['$status', 'non_compliant'] }, 1, 0] } },
        notApplicable: { $sum: { $cond: [{ $eq: ['$status', 'not_applicable'] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        avgScore: { $avg: '$score' },
      },
    },
  ]);

  return stats[0] || {
    total: 0, compliant: 0, partiallyCompliant: 0, nonCompliant: 0,
    notApplicable: 0, pending: 0, avgScore: 0,
  };
};

/**
 * Get pending corrective actions across audits.
 */
ComplianceAuditSchema.statics.getPendingActions = async function (branchId) {
  const match = { 'correctiveActions.completed': false };
  if (branchId) match.branchId = branchId;

  return this.find(match)
    .select('auditNumber standard criteria status correctiveActions branchId')
    .populate('correctiveActions.responsible', 'fullName email')
    .lean();
};

/**
 * Get upcoming reviews within N days.
 */
ComplianceAuditSchema.statics.getUpcomingReviews = async function (branchId, days = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  const query = {
    nextReviewDate: { $lte: cutoff, $gte: new Date() },
    status: { $in: ['compliant', 'partially_compliant', 'pending'] },
  };
  if (branchId) query.branchId = branchId;

  return this.find(query)
    .select('auditNumber standard criteria nextReviewDate status score')
    .populate('responsiblePerson', 'fullName email')
    .sort({ nextReviewDate: 1 })
    .lean();
};

/* ─── Export ──────────────────────────────────────────── */

module.exports = mongoose.model('ComplianceAudit', ComplianceAuditSchema);

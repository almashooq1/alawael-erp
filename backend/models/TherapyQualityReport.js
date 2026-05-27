/**
 * TherapyQualityReport — therapist-portal scope quality reports.
 * Used by `routes/therapistElite.routes.js` `/quality-reports`.
 *
 * Distinct from the broader `services/quality/*` audit/CAPA flow:
 * this is the therapist-facing "I observed something during my
 * shift" workflow — peer reviews, near-misses, satisfaction
 * snapshots. Findings are append-only via `addFinding`.
 *
 * The `models/quality/*` directory hosts the formal CBAHI/JCI
 * quality records (Audits, NCRs, ManagementReviews). This is the
 * lighter therapist-side log.
 */

'use strict';

const mongoose = require('mongoose');

if (mongoose.models.TherapyQualityReport) {
  module.exports = mongoose.models.TherapyQualityReport;
} else {
  const findingSchema = new mongoose.Schema(
    {
      raisedAt: { type: Date, default: Date.now },
      category: {
        type: String,
        enum: [
          'safety',
          'clinical_quality',
          'patient_experience',
          'documentation',
          'equipment',
          'process',
          'other',
        ],
        default: 'other',
      },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low',
      },
      description: { type: String, required: true },
      recommendation: { type: String, default: null },
      raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    },
    { _id: false }
  );

  const therapyQualityReportSchema = new mongoose.Schema(
    {
      reportNumber: { type: String, unique: true, sparse: true },
      type: {
        type: String,
        enum: [
          'clinical_audit',
          'peer_review',
          'patient_satisfaction',
          'near_miss',
          'process_review',
          'other',
        ],
        default: 'peer_review',
      },
      status: {
        type: String,
        enum: ['draft', 'in_review', 'finalized', 'archived'],
        default: 'draft',
      },
      title: { type: String, required: true, trim: true },
      scope: { type: String, default: null },
      author: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
      branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
      reviewedAt: { type: Date, default: null },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
      findings: { type: [findingSchema], default: [] },
      summary: { type: String, default: null },
      deletedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: 'therapyqualityreports' }
  );

  therapyQualityReportSchema.index({ branch: 1, status: 1 });
  therapyQualityReportSchema.index({ author: 1, createdAt: -1 });

  module.exports =
    mongoose.models.TherapyQualityReport || mongoose.model('TherapyQualityReport', therapyQualityReportSchema);
}

'use strict';

/**
 * EquityDisparityAlert — W485 (Phase G: Equity Engine).
 *
 * Persistent alert when the W484 disparity-detection lib flags a
 * moderate or major gap on a protected-group dimension. Drives the
 * Branch Equity Dashboard + National Equity Watch + supervisor
 * triage queue.
 *
 * Each alert is one (branch × dimension × metricKind × period)
 * record. Idempotent via signature hash.
 *
 * Per v3 §6 Innovation 8. Wave-18 invariants.
 */

const mongoose = require('mongoose');

const EquityDisparityAlertSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },

    // What was measured
    dimension: {
      type: String,
      enum: [
        'gender',
        'age_band',
        'disability_type',
        'region',
        'primary_language',
        'insurance_band',
        'nationality_band',
      ],
      required: true,
      index: true,
    },
    metricKind: {
      type: String,
      enum: [
        'gas_avg_tscore',
        'icf_avg_qualifier',
        'session_attendance_rate',
        'goal_achievement_rate',
        'wait_time_days',
        'complaint_rate',
        'wbci_avg',
      ],
      required: true,
      index: true,
    },

    // Period the audit covered
    periodStart: { type: Date, required: true, index: true },
    periodEnd: { type: Date, required: true, index: true },
    periodKind: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual', 'ad-hoc'],
      default: 'quarterly',
    },

    // Findings — pairwise cohort comparisons from auditDimension
    findings: [
      {
        cohort: { type: String, required: true, maxlength: 200 },
        n: { type: Number, min: 0, required: true },
        mean: { type: Number },
        rate: { type: Number, min: 0, max: 1 },
        vsReference: {
          referenceKey: { type: String, maxlength: 200 },
          referenceMean: { type: Number },
          referenceRate: { type: Number, min: 0, max: 1 },
          effectSize: { type: Number },
          riskRatio: { type: Number, min: 0 },
          severity: {
            type: String,
            enum: ['none', 'minor', 'moderate', 'major', 'insufficient_n'],
            required: true,
          },
          flagged: { type: Boolean, default: false },
        },
      },
    ],
    overallSeverity: {
      type: String,
      enum: ['none', 'minor', 'moderate', 'major'],
      required: true,
      index: true,
    },
    flaggedCount: { type: Number, min: 0, default: 0 },

    // Idempotency
    signatureHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
      maxlength: 100,
    },

    // Triage lifecycle
    status: {
      type: String,
      enum: [
        'open',
        'acknowledged',
        'investigating',
        'remediation_in_progress',
        'resolved',
        'monitoring',
        'dismissed',
      ],
      default: 'open',
      index: true,
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date },
    resolvedAt: { type: Date },
    dismissedAt: { type: Date },
    dismissalReason: { type: String, maxlength: 1000 },

    // Action linkage — equity issues feed into CAPA
    capaItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'CapaItem' },

    // Investigation notes
    rootCauseHypothesis: { type: String, maxlength: 2000 },
    notes: { type: String, maxlength: 5000 },

    // Generation metadata
    generatedBy: {
      type: String,
      enum: ['equity_engine_cron', 'manual_audit', 'ad_hoc_query'],
      default: 'equity_engine_cron',
    },
    detectedAt: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
    collection: 'equity_disparity_alerts',
  }
);

EquityDisparityAlertSchema.index({ branchId: 1, dimension: 1, periodStart: -1 });
EquityDisparityAlertSchema.index({ branchId: 1, status: 1, overallSeverity: 1 });

// Wave-18 invariants
EquityDisparityAlertSchema.pre('save', function (next) {
  if (this.periodStart && this.periodEnd && this.periodStart >= this.periodEnd) {
    return next(new Error('EquityDisparityAlert: periodStart must be before periodEnd'));
  }
  // Resolved + dismissed require terminal timestamp
  if (this.status === 'resolved' && !this.resolvedAt) this.resolvedAt = new Date();
  if (this.status === 'dismissed' && !this.dismissedAt) this.dismissedAt = new Date();
  if (this.status === 'acknowledged' && !this.acknowledgedAt) this.acknowledgedAt = new Date();
  // Dismissed requires reason >=5 chars
  if (this.status === 'dismissed' && (!this.dismissalReason || this.dismissalReason.length < 5)) {
    return next(
      new Error('EquityDisparityAlert: dismissed status requires dismissalReason >=5 chars')
    );
  }
  // Only major/moderate get persisted as alerts (none/minor filtered upstream)
  if (this.overallSeverity === 'none') {
    return next(new Error('EquityDisparityAlert: overallSeverity=none should not be persisted'));
  }
  next();
});

module.exports =
  mongoose.models.EquityDisparityAlert ||
  mongoose.model('EquityDisparityAlert', EquityDisparityAlertSchema);

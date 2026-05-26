'use strict';

/**
 * MeasureAlert — Wave 220
 *
 * Persistent clinical signal raised by the Alert Engine when a
 * measure-driven rule fires for a beneficiary. Examples:
 *
 *   - REGRESSION_DETECTED  — W219 trend.classification='regression'
 *   - PLATEAU_DETECTED     — trend='plateau' over ≥90-day span
 *   - MCID_NOT_MET         — ≥3 admins since baseline, no MCID achievement
 *   - FORECAST_OFF_TRACK   — W429 Phase B forecaster: projection at goal
 *                            target date misses goal.targetValue (predictive
 *                            counterpart to PLATEAU_DETECTED/REGRESSION_DETECTED)
 *
 * Decoupled from the global `Alert` collection in `backend/alerts/`
 * to keep the measure domain self-contained — the global alerts
 * machine has its own dispatcher, rule registry, role-based
 * ownership chain, and the coupling cost outweighs reuse benefit at
 * this stage. A future wave can bridge by emitting global alerts
 * from this model's post-save hook if cross-domain triage is needed.
 *
 * Idempotency contract (partial unique index):
 *   At any moment AT MOST ONE open alert exists per
 *   (beneficiaryId, measureId, alertType). Re-scan ticks update
 *   `lastEvaluatedAt` + `evidence` rather than create duplicates.
 *
 * Status flow:
 *   open → acknowledged → resolved | dismissed
 *
 * @module domains/goals/models/MeasureAlert
 */

const mongoose = require('mongoose');

const ALERT_TYPES = [
  'REGRESSION_DETECTED',
  'PLATEAU_DETECTED',
  'MCID_NOT_MET',
  'FORECAST_OFF_TRACK', // W429 Phase B Outcome Forecasting
];

const ALERT_STATUSES = ['open', 'acknowledged', 'resolved', 'dismissed'];

const ALERT_SEVERITIES = ['low', 'medium', 'high', 'critical'];

const measureAlertSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    measureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Measure',
      required: true,
      index: true,
    },
    measureCode: { type: String, required: true },

    alertType: { type: String, enum: ALERT_TYPES, required: true, index: true },
    severity: { type: String, enum: ALERT_SEVERITIES, default: 'medium' },

    status: {
      type: String,
      enum: ALERT_STATUSES,
      default: 'open',
      index: true,
    },

    // Evidence snapshot — frozen at first emission. Re-scan updates
    // refreshable counters (n, lastEvaluatedAt) but never overwrites
    // historical context (firstSeenAt, baseline summary).
    evidence: {
      n: Number, // admin count behind the call
      spanDays: Number,
      firstScore: Number,
      lastScore: Number,
      slopePerMonth: Number,
      r2: Number,
      classification: String,
      mcidValue: Number,
      mcidStatus: String,
      bestAchievedDelta: Number, // for MCID_NOT_MET
      message_ar: String,
    },

    // Lifecycle timestamps
    firstSeenAt: { type: Date, default: Date.now },
    lastEvaluatedAt: { type: Date, default: Date.now },
    acknowledgedAt: Date,
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolutionMode: { type: String, enum: ['manual', 'auto'] },
    dismissedAt: Date,
    dismissedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dismissalReason: String,

    // Assignment
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },

    notes: String,
  },
  {
    timestamps: true,
    collection: 'measure_alerts',
  }
);

// ─── Indexes ───────────────────────────────────────────────────────

// Idempotency: at most one open alert per (beneficiary, measure, type).
measureAlertSchema.index(
  { beneficiaryId: 1, measureId: 1, alertType: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'open' } }
);
measureAlertSchema.index({ branchId: 1, status: 1, severity: 1, firstSeenAt: -1 });
measureAlertSchema.index({ status: 1, alertType: 1, lastEvaluatedAt: -1 });

// ─── Wave-18 invariants ───────────────────────────────────────────

measureAlertSchema.pre('validate', function () {
  if (this.status === 'resolved' && !this.resolvedAt) {
    throw new Error('MeasureAlert: resolvedAt required when status=resolved');
  }
  if (this.status === 'dismissed') {
    if (!this.dismissedAt) {
      throw new Error('MeasureAlert: dismissedAt required when status=dismissed');
    }
    if (!this.dismissalReason || !String(this.dismissalReason).trim()) {
      throw new Error('MeasureAlert: dismissalReason required when status=dismissed');
    }
  }
  if (this.status === 'acknowledged' && !this.acknowledgedAt) {
    throw new Error('MeasureAlert: acknowledgedAt required when status=acknowledged');
  }
});

// ─── Statics ───────────────────────────────────────────────────────

measureAlertSchema.statics.findOpen = function (beneficiaryId, measureId, alertType) {
  return this.findOne({
    beneficiaryId,
    measureId,
    alertType,
    status: 'open',
  });
};

measureAlertSchema.statics.listOpenFor = function (filter = {}) {
  const q = { status: 'open' };
  if (filter.beneficiaryId) q.beneficiaryId = filter.beneficiaryId;
  if (filter.assigneeId) q.assigneeId = filter.assigneeId;
  if (filter.branchId) q.branchId = filter.branchId;
  if (filter.alertType) q.alertType = filter.alertType;
  if (filter.severityIn) q.severity = { $in: filter.severityIn };
  return this.find(q).sort({ severity: -1, firstSeenAt: -1 }).lean();
};

const MeasureAlert =
  mongoose.models.MeasureAlert || mongoose.model('MeasureAlert', measureAlertSchema);

module.exports = {
  MeasureAlert,
  measureAlertSchema,
  ALERT_TYPES,
  ALERT_STATUSES,
  ALERT_SEVERITIES,
};

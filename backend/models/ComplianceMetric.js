/* eslint-disable no-unused-vars */
/**
 * ComplianceMetric Model
 * ظ…ط¤ط´ط±ط§طھ ط§ظ„ط§ظ…طھط«ط§ظ„ ظˆط§ظ„ظ‚ظˆط§ظ†ظٹظ†
 */

const mongoose = require('mongoose');

const complianceMetricSchema = new mongoose.Schema(
  {
    metricId: { type: String, required: true, unique: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Organization',
      index: true,
    },

    name: { type: String, required: true },

    metricType: {
      type: String,
      enum: [
        'compliance_rate',
        'violation_count',
        'critical_violations',
        'remediation_time',
        'audit_score',
      ],
      required: true,
      index: true,
    },

    currentValue: { type: Number, required: true },
    targetValue: { type: Number, required: true },
    threshold: { type: Number, required: true },

    status: {
      type: String,
      enum: ['compliant', 'warning', 'non_compliant'],
      default: 'compliant',
    },

    period: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },

    violations: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Violation',
    },

    criticalViolations: { type: Number, default: 0 },
    highViolations: { type: Number, default: 0 },
    mediumViolations: { type: Number, default: 0 },
    lowViolations: { type: Number, default: 0 },

    remediationStatus: {
      pending: { type: Number, default: 0 },
      inProgress: { type: Number, default: 0 },
      resolved: { type: Number, default: 0 },
      escalated: { type: Number, default: 0 },
    },

    averageRemediationDays: Number,

    auditScore: { type: Number, min: 0, max: 100 },
    auditDate: Date,
    auditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    trend: [
      {
        month: Number,
        year: Number,
        value: Number,
      },
    ],

    notes: String,
    recommendations: [String],

    isReviewed: { type: Boolean, default: false },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewDate: Date,
  },
  { timestamps: true, collection: 'compliance_metrics' }
);

complianceMetricSchema.index({ organizationId: 1, 'period.endDate': -1 });
complianceMetricSchema.index({ status: 1 });

complianceMetricSchema.virtual('compliancePercentage').get(function () {
  if (this.targetValue === 0) return 0;
  return (this.currentValue / this.targetValue) * 100;
});

complianceMetricSchema.pre('save', function (next) {
  if (this.currentValue < this.threshold) {
    this.status = 'non_compliant';
  } else if (this.currentValue < this.targetValue) {
    this.status = 'warning';
  } else {
    this.status = 'compliant';
  }
  next();
});

complianceMetricSchema.statics.getLatestMetrics = function (organizationId) {
  return this.find({ organizationId }).sort({ 'period.endDate': -1 }).limit(12);
};

module.exports = mongoose.model('ComplianceMetric', complianceMetricSchema);

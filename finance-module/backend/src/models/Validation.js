/**
 * Financial Validation Model
 * Tracks compliance violations and audit findings
 */

const mongoose = require('mongoose');

const ValidatingRuleSchema = new mongoose.Schema({
  ruleName: {
    type: String,
    required: true,
    enum: [
      'balance_sheet_equation',
      'double_entry',
      'reconciliation',
      'cutoff',
      'completeness',
      'existence',
      'rights_obligations',
      'valuation'
    ]
  },
  description: String,
  severity: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium'
  },
  threshold: Number,
  isActive: { type: Boolean, default: true }
});

const ViolationSchema = new mongoose.Schema({
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true
  },
  ruleId: String,
  violationType: {
    type: String,
    enum: ['amount_mismatch', 'missing_entry', 'incorrect_account', 'invalid_date', 'duplicate', 'unauthorized'],
    required: true
  },
  severity: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium'
  },
  description: String,
  amount: Number,
  expectedValue: Number,
  actualValue: Number,
  detectionDate: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['detected', 'investigating', 'resolved', 'waived'],
    default: 'detected'
  },
  resolution: {
    resolvedBy: mongoose.Schema.Types.ObjectId,
    resolvedAt: Date,
    resolution_notes: String,
    correctionAmount: Number
  },
  relatedTransactions: [mongoose.Schema.Types.ObjectId],
  evidenceDocuments: [String],
  auditTrail: [{
    action: String,
    timestamp: { type: Date, default: Date.now },
    performedBy: mongoose.Schema.Types.ObjectId,
    notes: String
  }]
}, { timestamps: true });

const ValidationReportSchema = new mongoose.Schema({
  reportPeriod: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
  },
  generatedAt: { type: Date, default: Date.now },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  violationCountByType: {
    amount_mismatch: { type: Number, default: 0 },
    missing_entry: { type: Number, default: 0 },
    incorrect_account: { type: Number, default: 0 },
    invalid_date: { type: Number, default: 0 },
    duplicate: { type: Number, default: 0 },
    unauthorized: { type: Number, default: 0 }
  },

  violationsCount: {
    critical: { type: Number, default: 0 },
    high: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    low: { type: Number, default: 0 }
  },

  complianceMetrics: {
    totalTransactions: Number,
    violatedTransactions: Number,
    complianceRate: Number, // percentage
    resolvedViolations: Number,
    outstandingViolations: Number,
    waivedViolations: Number,
    resolutionRate: Number // percentage
  },

  summary: {
    overallRating: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      default: 'fair'
    },
    keyFindings: [String],
    recommendations: [String],
    riskAssessment: {
      financialLoss: Number,
      fraudRisk: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      },
      operationalRisk: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      }
    }
  },

  trends: {
    violationTrendPercentage: Number, // month-over-month
    improvementArea: String,
    concernArea: String
  },

  status: {
    type: String,
    enum: ['draft', 'pending_review', 'approved', 'archived'],
    default: 'draft'
  },

  approvals: [{
    approvedBy: mongoose.Schema.Types.ObjectId,
    approvedAt: Date,
    comments: String,
    level: { type: String, enum: ['supervisor', 'manager', 'director', 'cfo'] }
  }]
}, { timestamps: true });

// Indexes
ViolationSchema.index({ transactionId: 1, status: 1 });
ViolationSchema.index({ severity: 1, detectionDate: -1 });
ViolationSchema.index({ violationType: 1, status: 1 });

ValidationReportSchema.index({ reportPeriod: 1, generatedAt: -1 });
ValidationReportSchema.index({ status: 1, generatedAt: -1 });

module.exports = {
  ValidatingRule: mongoose.model('ValidatingRule', ValidatingRuleSchema),
  Violation: mongoose.model('Violation', ViolationSchema),
  ValidationReport: mongoose.model('ValidationReport', ValidationReportSchema)
};

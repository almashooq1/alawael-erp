/**
 * Enterprise Risk Management Models — نظام إدارة المخاطر المؤسسية
 * Comprehensive risk register, assessments, and mitigation tracking
 */
const mongoose = require('mongoose');

/* ── Enterprise Risk ──────────────────────────────────────── */
const enterpriseRiskSchema = new mongoose.Schema(
  {
    riskCode: { type: String, required: true, unique: true },
    titleAr: { type: String, required: true },
    titleEn: { type: String },
    category: {
      type: String,
      enum: ['strategic', 'operational', 'financial', 'compliance', 'reputational', 'technology', 'environmental', 'safety', 'legal', 'other'],
      default: 'operational',
    },
    description: String,
    source: String,
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    department: String,
    probability: { type: String, enum: ['very_low', 'low', 'medium', 'high', 'very_high'], default: 'medium' },
    impact: { type: String, enum: ['very_low', 'low', 'medium', 'high', 'very_high'], default: 'medium' },
    riskScore: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['identified', 'assessed', 'mitigating', 'monitoring', 'resolved', 'accepted', 'closed'],
      default: 'identified',
    },
    priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
    identifiedDate: { type: Date, default: Date.now },
    reviewDate: Date,
    mitigations: [
      {
        action: String,
        responsible: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        dueDate: Date,
        status: { type: String, enum: ['planned', 'in_progress', 'completed', 'cancelled'], default: 'planned' },
        effectiveness: { type: String, enum: ['not_started', 'partial', 'effective', 'ineffective'], default: 'not_started' },
        notes: String,
      },
    ],
    indicators: [{ name: String, threshold: String, currentValue: String }],
    attachments: [{ name: String, url: String }],
    history: [{ date: { type: Date, default: Date.now }, action: String, user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, notes: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

enterpriseRiskSchema.pre('save', function () {
  const probMap = { very_low: 1, low: 2, medium: 3, high: 4, very_high: 5 };
  const impMap = { very_low: 1, low: 2, medium: 3, high: 4, very_high: 5 };
  this.riskScore = (probMap[this.probability] || 3) * (impMap[this.impact] || 3);
});

/* ── Risk Assessment ──────────────────────────────────────── */
const riskAssessmentSchema = new mongoose.Schema(
  {
    assessmentCode: { type: String, required: true, unique: true },
    titleAr: { type: String, required: true },
    scope: String,
    department: String,
    assessmentDate: { type: Date, default: Date.now },
    assessor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    risks: [
      {
        risk: { type: mongoose.Schema.Types.ObjectId, ref: 'EnterpriseRisk' },
        probabilityScore: { type: Number, min: 1, max: 5 },
        impactScore: { type: Number, min: 1, max: 5 },
        riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
        recommendations: String,
      },
    ],
    overallRiskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    findings: String,
    recommendations: String,
    status: { type: String, enum: ['draft', 'in_progress', 'completed', 'reviewed'], default: 'draft' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const EnterpriseRisk = mongoose.models.EnterpriseRisk || mongoose.model('EnterpriseRisk', enterpriseRiskSchema);
const RiskAssessment = mongoose.models.RiskAssessment || mongoose.model('RiskAssessment', riskAssessmentSchema);

module.exports = { EnterpriseRisk, RiskAssessment };

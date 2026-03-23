/**
 * Financial Risk Management Models
 * إدارة المخاطر المالية - Risk Register, Assessment & Mitigation
 * Market, Credit, Operational, Liquidity risk tracking
 */
const mongoose = require('mongoose');

const riskRegisterSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    riskNumber: { type: String, unique: true },
    riskTitle: { type: String, required: true },
    riskTitleEn: { type: String },
    description: { type: String },
    riskCategory: {
      type: String,
      enum: [
        'market',
        'credit',
        'operational',
        'liquidity',
        'compliance',
        'strategic',
        'reputational',
        'currency',
        'interest_rate',
      ],
      required: true,
    },
    riskSubCategory: { type: String },
    status: {
      type: String,
      enum: ['identified', 'assessed', 'mitigating', 'accepted', 'closed', 'escalated'],
      default: 'identified',
    },
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low', 'negligible'],
      default: 'medium',
    },
    likelihood: {
      type: String,
      enum: ['almost_certain', 'likely', 'possible', 'unlikely', 'rare'],
      default: 'possible',
    },
    impact: {
      financial: { type: Number, default: 0 },
      operational: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
      reputational: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'low' },
    },
    riskScore: { type: Number, default: 0 },
    valueAtRisk: { type: Number, default: 0 },
    confidenceLevel: { type: Number, default: 95 },
    exposureAmount: { type: Number, default: 0 },
    riskOwner: { type: String },
    department: { type: String },
    mitigationPlan: [
      {
        action: { type: String },
        responsible: { type: String },
        deadline: { type: Date },
        status: {
          type: String,
          enum: ['planned', 'in_progress', 'completed', 'overdue'],
          default: 'planned',
        },
        cost: { type: Number, default: 0 },
        effectiveness: {
          type: String,
          enum: ['high', 'medium', 'low', 'not_evaluated'],
          default: 'not_evaluated',
        },
      },
    ],
    keyRiskIndicators: [
      {
        name: { type: String },
        threshold: { type: Number },
        currentValue: { type: Number },
        trend: { type: String, enum: ['improving', 'stable', 'deteriorating'], default: 'stable' },
        breached: { type: Boolean, default: false },
      },
    ],
    controls: [
      {
        controlRef: { type: String },
        controlName: { type: String },
        effectiveness: {
          type: String,
          enum: ['effective', 'partially_effective', 'ineffective'],
          default: 'effective',
        },
      },
    ],
    regulatoryFramework: { type: String },
    reviewFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annually'],
      default: 'quarterly',
    },
    lastReviewDate: { type: Date },
    nextReviewDate: { type: Date },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

riskRegisterSchema.pre('save', async function () {
  if (!this.riskNumber) {
    const count = await this.constructor.countDocuments();
    this.riskNumber = `RSK-${String(count + 1).padStart(5, '0')}`;
  }
  // Auto-calculate risk score
  const likelihoodScore = { almost_certain: 5, likely: 4, possible: 3, unlikely: 2, rare: 1 };
  const severityScore = { critical: 5, high: 4, medium: 3, low: 2, negligible: 1 };
  this.riskScore = (likelihoodScore[this.likelihood] || 3) * (severityScore[this.severity] || 3);
});

module.exports = mongoose.models.RiskRegister || mongoose.model('RiskRegister', riskRegisterSchema);

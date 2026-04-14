'use strict';

const mongoose = require('mongoose');

// correctiveActionSchema is reused here (same shape as in Incident.model.js)
const correctiveActionSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    responsible: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deadline: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'overdue'],
      default: 'pending',
    },
    completedAt: { type: Date, default: null },
    notes: { type: String, default: null },
  },
  { _id: false }
);

const riskSchema = new mongoose.Schema(
  {
    riskNumber: { type: String, unique: true, required: true }, // RSK-2024-0001
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    category: {
      type: String,
      enum: ['clinical', 'operational', 'financial', 'legal', 'reputational', 'safety', 'it'],
      required: true,
    },
    titleAr: { type: String, required: true },
    description: { type: String, required: true },
    source: { type: String, default: null },
    likelihood: { type: Number, min: 1, max: 5, required: true }, // 1=نادر, 5=شبه مؤكد
    impact: { type: Number, min: 1, max: 5, required: true }, // 1=ضئيل, 5=كارثي
    riskScore: { type: Number }, // likelihood * impact
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
    },
    existingControls: { type: [String], default: [] },
    residualLikelihood: { type: Number, default: null },
    residualImpact: { type: Number, default: null },
    residualRiskScore: { type: Number, default: null },
    mitigationActions: { type: [correctiveActionSchema], default: [] },
    treatmentStrategy: {
      type: String,
      enum: ['avoid', 'reduce', 'transfer', 'accept', null],
      default: null,
    },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ['open', 'mitigating', 'monitoring', 'closed', 'accepted'],
      default: 'open',
    },
  },
  { timestamps: true }
);

// حساب درجة المخاطرة تلقائياً
riskSchema.pre('save', function (next) {
  this.riskScore = this.likelihood * this.impact;
  const score = this.riskScore;
  if (score >= 17) this.riskLevel = 'critical';
  else if (score >= 10) this.riskLevel = 'high';
  else if (score >= 5) this.riskLevel = 'medium';
  else this.riskLevel = 'low';

  if (this.residualLikelihood && this.residualImpact) {
    this.residualRiskScore = this.residualLikelihood * this.residualImpact;
  }
  next();
});

riskSchema.index({ branchId: 1, riskLevel: 1, status: 1 });

const Risk = mongoose.models.Risk || mongoose.model('Risk', riskSchema);

module.exports = Risk;

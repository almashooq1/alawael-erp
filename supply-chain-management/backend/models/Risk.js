const mongoose = require('mongoose');

const riskSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => `RIS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['operational', 'financial', 'compliance', 'strategic', 'reputational'],
      required: true,
    },
    owner: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['identified', 'assessed', 'mitigated', 'accepted', 'resolved'],
      default: 'identified',
    },
    likelihood: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    impact: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    riskScore: {
      type: Number,
      default: null,
    },
    riskLevel: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low', 'minimal'],
      default: 'medium',
    },
    mitigation: {
      strategy: String,
      owner: String,
      targetDate: Date,
      status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed'],
        default: 'not_started',
      },
    },
    monitoring: {
      frequency: {
        type: String,
        enum: ['monthly', 'quarterly', 'annually'],
        default: 'monthly',
      },
      lastReview: Date,
      nextReview: Date,
      reviewOwner: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    closedAt: Date,
    history: [
      {
        action: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
        changedBy: String,
        changedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

riskSchema.index({ category: 1, status: 1 });
riskSchema.index({ riskScore: -1 });
riskSchema.index({ owner: 1 });

module.exports = mongoose.model('Risk', riskSchema);

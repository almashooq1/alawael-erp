'use strict';

const mongoose = require('mongoose');

const improvementProjectSchema = new mongoose.Schema(
  {
    projectNumber: { type: String, unique: true, required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    titleAr: { type: String, required: true },
    titleEn: { type: String, default: null },
    problemStatement: { type: String, required: true }, // Plan
    objective: { type: String, required: true },
    planPhase: { type: mongoose.Schema.Types.Mixed, default: null },
    doPhase: { type: mongoose.Schema.Types.Mixed, default: null },
    checkPhase: { type: mongoose.Schema.Types.Mixed, default: null },
    actPhase: { type: mongoose.Schema.Types.Mixed, default: null },
    currentPhase: {
      type: String,
      enum: ['plan', 'do', 'check', 'act', 'closed'],
      default: 'plan',
    },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    teamMembers: { type: [mongoose.Schema.Types.Mixed], default: [] },
    startDate: { type: Date, required: true },
    targetEndDate: { type: Date, required: true },
    actualEndDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ['active', 'on_hold', 'completed', 'cancelled'],
      default: 'active',
    },
  },
  { timestamps: true }
);

improvementProjectSchema.index({ branchId: 1, status: 1 });

const ImprovementProject =
  mongoose.models.ImprovementProject ||
  mongoose.model('ImprovementProject', improvementProjectSchema);

module.exports = ImprovementProject;

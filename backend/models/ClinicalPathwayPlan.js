'use strict';

const mongoose = require('mongoose');

const pathwayStageSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, maxlength: 60 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    order: { type: Number, required: true, min: 1 },
    targetDays: { type: Number, min: 0, default: 14 },
    status: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'],
      default: 'NOT_STARTED',
      index: true,
    },
    completedAt: Date,
    notes: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: true }
);

const clinicalPathwayPlanSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    pathwayType: {
      type: String,
      enum: [
        'AUTISM_EARLY_INTERVENTION',
        'CP_MOTOR_REHAB',
        'SPEECH_LANGUAGE',
        'BEHAVIOR_SUPPORT',
        'GENERIC_REHAB',
      ],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'],
      default: 'DRAFT',
      index: true,
    },
    startDate: { type: Date, required: true },
    targetEndDate: Date,
    currentStageCode: { type: String, trim: true, maxlength: 60 },
    stages: {
      type: [pathwayStageSchema],
      validate: {
        validator: v => Array.isArray(v) && v.length > 0,
        message: 'stages must include at least one stage',
      },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'clinical_pathway_plans',
  }
);

clinicalPathwayPlanSchema.index({ branchId: 1, status: 1, createdAt: -1 });
clinicalPathwayPlanSchema.index({ beneficiaryId: 1, pathwayType: 1, status: 1 });

clinicalPathwayPlanSchema.pre('validate', function validateInvariants() {
  if (this.targetEndDate && this.startDate && this.targetEndDate < this.startDate) {
    this.invalidate('targetEndDate', 'targetEndDate must be greater than or equal to startDate');
  }
});

// ── W1062: unified-core linkage ───────────────────────────────────────
// Completing the pathway plan is the milestone. Publish
// clinical_pathway.completed → CareTimeline. NON-callback save hooks only
// (the pre('validate') above stays callback-style — different event).
clinicalPathwayPlanSchema.pre('save', function () {
  this.$__pathwayCompletedNow =
    this.status === 'COMPLETED' && (this.isNew || this.isModified('status'));
});

function emitClinicalPathwayCompleted(doc) {
  if (!doc || !doc.$__pathwayCompletedNow) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.publish('clinical-pathway', 'clinical_pathway.completed', {
      planId: String(doc._id),
      beneficiaryId: doc.beneficiaryId ? String(doc.beneficiaryId) : null,
      ...(doc.branchId ? { branchId: String(doc.branchId) } : {}),
      pathwayType: doc.pathwayType,
      completedAt: doc.targetEndDate || doc.updatedAt || new Date(),
    });
  } catch (_err) {
    /* bus optional — never block the write */
  }
}

clinicalPathwayPlanSchema.post('save', emitClinicalPathwayCompleted);

module.exports =
  mongoose.models.ClinicalPathwayPlan ||
  mongoose.model('ClinicalPathwayPlan', clinicalPathwayPlanSchema);

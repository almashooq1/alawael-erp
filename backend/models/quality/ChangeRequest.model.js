'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { CHANGE_STATUSES, IMPACT_AREAS } = require('../../config/change-control.registry');

const cabVoteSchema = new Schema(
  {
    voterUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, default: null },
    vote: { type: String, enum: ['approve', 'reject', 'abstain'], required: true },
    rationale: { type: String, default: null },
    votedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const implementationStepSchema = new Schema(
  {
    description: { type: String, required: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'completed', 'cancelled'],
      default: 'open',
    },
    completedAt: { type: Date, default: null },
  },
  { _id: true }
);

const changeSchema = new Schema(
  {
    crNumber: { type: String, unique: true, index: true }, // CR-YYYY-NNNN
    title: { type: String, required: true },
    rationale: { type: String, required: true },
    type: { type: String, required: true },

    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    impactAreas: { type: [String], enum: IMPACT_AREAS, default: [] },
    impactAssessment: { type: String, default: null },
    rollbackPlan: { type: String, default: null },
    testingPlan: { type: String, default: null },

    cabVotes: { type: [cabVoteSchema], default: [] },
    cabDecisionAt: { type: Date, default: null },
    cabRequired: { type: Boolean, default: true },

    plannedStart: { type: Date, default: null },
    plannedEnd: { type: Date, default: null },
    actualStart: { type: Date, default: null },
    actualEnd: { type: Date, default: null },
    implementationSteps: { type: [implementationStepSchema], default: [] },

    verificationOutcome: {
      type: String,
      enum: ['successful', 'unsuccessful', null],
      default: null,
    },
    verificationNotes: { type: String, default: null },

    linkedDocumentIds: [{ type: Schema.Types.ObjectId, ref: 'ControlledDocument' }],
    linkedFmeaId: { type: Schema.Types.ObjectId, ref: 'FmeaWorksheet', default: null },

    status: { type: String, enum: CHANGE_STATUSES, default: 'draft', index: true },
    rejectedReason: { type: String, default: null },
    cancelledReason: { type: String, default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'change_requests' }
);

changeSchema.index({ branchId: 1, status: 1 });
changeSchema.index({ riskLevel: 1, status: 1 });

changeSchema.pre('validate', async function () {
  if (!this.crNumber) {
    const year = new Date().getUTCFullYear();
    const Model = mongoose.model('ChangeRequest');
    const count = await Model.countDocuments({ crNumber: { $regex: `^CR-${year}-` } });
    this.crNumber = `CR-${year}-${String(count + 1).padStart(4, '0')}`;
  }
});

module.exports = mongoose.models.ChangeRequest || mongoose.model('ChangeRequest', changeSchema);

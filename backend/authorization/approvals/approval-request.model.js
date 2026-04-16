/**
 * ApprovalRequest — persistent state of an approval-chain instance.
 *
 * One ApprovalRequest per (resourceType, resourceId, chainId). Open
 * requests are unique per resource so duplicate submissions are
 * rejected at the DB level.
 */

'use strict';

const mongoose = require('mongoose');
const { TENANT_FIELD } = require('../../config/constants');
const { STATUSES } = require('./engine');

const DecisionSchema = new mongoose.Schema(
  {
    step: { type: Number, required: true },
    role: { type: String },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    decision: { type: String, enum: ['approve', 'reject', 'cancel', 'escalate'], required: true },
    note: { type: String },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const StepSchema = new mongoose.Schema(
  {
    role: { type: String, required: true },
    branchScope: {
      type: String,
      enum: ['branch', 'region', 'group', 'external', 'receiving_branch', 'sending_branch'],
    },
    dueHours: { type: Number },
    canDelegate: { type: Boolean, default: false },
    condition: { type: String },
  },
  { _id: false }
);

const ApprovalRequestSchema = new mongoose.Schema(
  {
    chainId: { type: String, required: true, index: true },
    resourceType: { type: String, required: true, index: true },
    resourceId: { type: mongoose.Schema.Types.Mixed, required: true, index: true },

    initiatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    [TENANT_FIELD]: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },

    status: {
      type: String,
      enum: STATUSES,
      required: true,
      default: 'pending_approval',
      index: true,
    },
    currentStep: { type: Number, default: 0 },
    steps: { type: [StepSchema], required: true },
    decisions: { type: [DecisionSchema], default: [] },

    openedAt: { type: Date, default: Date.now },
    slaDeadline: { type: Date, default: null, index: true },
    finalizedAt: { type: Date, default: null },

    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: 'approval_requests' }
);

// Each active request per resource is unique.
ApprovalRequestSchema.index(
  { resourceType: 1, resourceId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending_approval' } }
);

ApprovalRequestSchema.methods.currentApproverRole = function () {
  if (this.status !== 'pending_approval') return null;
  const step = this.steps[this.currentStep];
  return step ? step.role : null;
};

ApprovalRequestSchema.methods.isBreached = function (now = new Date()) {
  if (this.status !== 'pending_approval' || !this.slaDeadline) return false;
  return this.slaDeadline.getTime() < now.getTime();
};

module.exports = {
  ApprovalRequestSchema,
  get model() {
    return (
      mongoose.models.ApprovalRequest || mongoose.model('ApprovalRequest', ApprovalRequestSchema)
    );
  },
};

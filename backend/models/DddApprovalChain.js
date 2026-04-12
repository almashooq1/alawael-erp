'use strict';
/**
 * DddApprovalChain Model
 * Auto-extracted from services/dddApprovalChain.js
 * Schemas, constants, and Mongoose model registrations.
 */
const mongoose = require('mongoose');

const APPROVAL_TYPES = [
  'treatment_plan',
  'discharge',
  'equipment_purchase',
  'leave_request',
  'budget_allocation',
  'policy_change',
  'referral',
  'document_review',
  'incident_report',
  'custom',
];

const APPROVAL_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'delegated',
  'escalated',
  'expired',
  'cancelled',
  'returned',
];

const ESCALATION_TRIGGERS = [
  'timeout',
  'manual',
  'policy_violation',
  'high_value',
  'repeat_rejection',
];

const DELEGATION_TYPES = ['temporary', 'permanent', 'out_of_office', 'role_based'];

const BUILTIN_APPROVAL_POLICIES = [
  {
    code: 'POL-TREAT-PLAN',
    name: 'Treatment Plan Approval',
    nameAr: 'موافقة على خطة العلاج',
    type: 'treatment_plan',
    levels: 2,
    autoEscalateHours: 48,
  },
  {
    code: 'POL-DISCHARGE',
    name: 'Discharge Approval',
    nameAr: 'موافقة على الخروج',
    type: 'discharge',
    levels: 2,
    autoEscalateHours: 24,
  },
  {
    code: 'POL-EQUIP-LOW',
    name: 'Equipment Purchase (Low)',
    nameAr: 'شراء معدات (منخفض)',
    type: 'equipment_purchase',
    levels: 1,
    autoEscalateHours: 72,
  },
  {
    code: 'POL-EQUIP-HIGH',
    name: 'Equipment Purchase (High)',
    nameAr: 'شراء معدات (مرتفع)',
    type: 'equipment_purchase',
    levels: 3,
    autoEscalateHours: 48,
  },
  {
    code: 'POL-LEAVE',
    name: 'Leave Request',
    nameAr: 'طلب إجازة',
    type: 'leave_request',
    levels: 1,
    autoEscalateHours: 48,
  },
  {
    code: 'POL-BUDGET',
    name: 'Budget Allocation',
    nameAr: 'تخصيص الميزانية',
    type: 'budget_allocation',
    levels: 3,
    autoEscalateHours: 72,
  },
  {
    code: 'POL-REFERRAL',
    name: 'External Referral',
    nameAr: 'إحالة خارجية',
    type: 'referral',
    levels: 2,
    autoEscalateHours: 24,
  },
  {
    code: 'POL-DOC-REVIEW',
    name: 'Document Review',
    nameAr: 'مراجعة مستند',
    type: 'document_review',
    levels: 1,
    autoEscalateHours: 72,
  },
];

/* ══════════════════════════════════════════════════════════════
   2) SCHEMAS
   ══════════════════════════════════════════════════════════════ */

/* ── Approval Policy Schema ── */

const approvalPolicySchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    nameAr: String,
    type: { type: String, enum: APPROVAL_TYPES, required: true, index: true },
    description: String,

    /* Levels */
    levels: [
      {
        levelNumber: { type: Number, required: true },
        name: String,
        nameAr: String,
        approverRole: String,
        approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        requiredApprovals: { type: Number, default: 1 },
        autoApproveCondition: String, // JS expression
        autoEscalateHours: Number,
        escalateToRole: String,
      },
    ],

    /* Rules */
    rules: {
      allowDelegation: { type: Boolean, default: true },
      allowReturn: { type: Boolean, default: true },
      requireComment: { type: Boolean, default: false },
      requireAttachment: { type: Boolean, default: false },
      parallelLevels: { type: Boolean, default: false },
      minAmountForLevel: [{ level: Number, minAmount: Number }],
    },

    isActive: { type: Boolean, default: true, index: true },
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

const DDDApprovalPolicy =
  mongoose.models.DDDApprovalPolicy || mongoose.model('DDDApprovalPolicy', approvalPolicySchema);

/* ── Approval Request Schema ── */
const approvalRequestSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, sparse: true, index: true },
    policyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DDDApprovalPolicy',
      required: true,
      index: true,
    },
    type: { type: String, enum: APPROVAL_TYPES, required: true, index: true },
    status: { type: String, enum: APPROVAL_STATUSES, default: 'pending', index: true },

    /* Subject */
    title: { type: String, required: true },
    titleAr: String,
    description: String,
    amount: Number,
    currency: { type: String, default: 'SAR' },

    /* Context */
    entityType: String,
    entityId: { type: mongoose.Schema.Types.ObjectId },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
    workflowInstanceId: { type: mongoose.Schema.Types.ObjectId },

    /* Approval Progress */
    currentLevel: { type: Number, default: 1 },
    decisions: [
      {
        level: { type: Number, required: true },
        approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        decision: { type: String, enum: ['approved', 'rejected', 'returned', 'delegated'] },
        comment: String,
        attachments: [String],
        decidedAt: { type: Date, default: Date.now },
        delegatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    /* Timing */
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    requestedAt: { type: Date, default: Date.now, index: true },
    dueAt: Date,
    completedAt: Date,
    escalatedAt: Date,

    attachments: [String],
    metadata: mongoose.Schema.Types.Mixed,
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

approvalRequestSchema.index({ status: 1, currentLevel: 1 });

const DDDApprovalRequest =
  mongoose.models.DDDApprovalRequest || mongoose.model('DDDApprovalRequest', approvalRequestSchema);

/* ── Delegation Schema ── */
const delegationSchema = new mongoose.Schema(
  {
    delegatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    delegateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: DELEGATION_TYPES, required: true },
    approvalType: { type: String, enum: [...APPROVAL_TYPES, 'all'] },
    startDate: { type: Date, required: true },
    endDate: Date,
    reason: String,
    isActive: { type: Boolean, default: true, index: true },
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

const DDDDelegation = mongoose.models.DDDDelegation || mongoose.model('DDDDelegation', delegationSchema);

/* ══════════════════════════════════════════════════════════════
   3) DOMAIN SERVICE
   ══════════════════════════════════════════════════════════════ */

module.exports = {
  APPROVAL_TYPES,
  APPROVAL_STATUSES,
  ESCALATION_TRIGGERS,
  DELEGATION_TYPES,
  BUILTIN_APPROVAL_POLICIES,
};

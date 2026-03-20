/**
 * Financial Workflow Models
 * سير العمل المالي - Approval Chains, Escalation, SLA
 * Workflow templates, delegation, auto-routing
 */
const mongoose = require('mongoose');

const financialWorkflowSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    workflowNumber: { type: String, unique: true },
    name: { type: String, required: true },
    nameEn: { type: String },
    description: { type: String },
    workflowType: {
      type: String,
      enum: [
        'approval',
        'review',
        'payment',
        'budget',
        'expense',
        'journal',
        'procurement',
        'invoice',
        'custom',
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'suspended', 'archived'],
      default: 'draft',
    },
    triggerConditions: {
      documentType: { type: String },
      amountThreshold: { type: Number },
      department: { type: String },
      costCenter: { type: String },
      autoTrigger: { type: Boolean, default: false },
      conditions: [
        {
          field: { type: String },
          operator: {
            type: String,
            enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in'],
          },
          value: { type: mongoose.Schema.Types.Mixed },
        },
      ],
    },
    approvalChain: [
      {
        stepNumber: { type: Number },
        stepName: { type: String },
        approverType: {
          type: String,
          enum: ['user', 'role', 'department_head', 'manager', 'cfo', 'ceo', 'board', 'auto'],
        },
        approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        approverRole: { type: String },
        requiredApprovals: { type: Number, default: 1 },
        approvalType: { type: String, enum: ['any', 'all', 'majority'], default: 'any' },
        canDelegate: { type: Boolean, default: true },
        delegateTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        amountLimit: { type: Number },
        sla: {
          hours: { type: Number, default: 24 },
          escalateAfter: { type: Number, default: 48 },
          autoApproveAfter: { type: Number },
        },
        actions: {
          canApprove: { type: Boolean, default: true },
          canReject: { type: Boolean, default: true },
          canReturn: { type: Boolean, default: true },
          canAddComment: { type: Boolean, default: true },
          canRequestInfo: { type: Boolean, default: true },
        },
      },
    ],
    escalationRules: [
      {
        triggerAfterHours: { type: Number },
        escalateTo: { type: String, enum: ['next_level', 'specific_user', 'role'] },
        escalateUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        escalateRole: { type: String },
        notifyOriginal: { type: Boolean, default: true },
        maxEscalations: { type: Number, default: 3 },
      },
    ],
    notifications: {
      onSubmit: { type: Boolean, default: true },
      onApproval: { type: Boolean, default: true },
      onRejection: { type: Boolean, default: true },
      onEscalation: { type: Boolean, default: true },
      onCompletion: { type: Boolean, default: true },
      channels: [{ type: String, enum: ['email', 'sms', 'push', 'in_app', 'whatsapp'] }],
    },
    parallelProcessing: {
      enabled: { type: Boolean, default: false },
      parallelSteps: [[{ type: Number }]],
    },
    version: { type: Number, default: 1 },
    effectiveFrom: { type: Date },
    effectiveTo: { type: Date },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const workflowInstanceSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    instanceNumber: { type: String, unique: true },
    workflow: { type: mongoose.Schema.Types.ObjectId, ref: 'FinancialWorkflow', required: true },
    documentType: { type: String },
    documentId: { type: mongoose.Schema.Types.ObjectId },
    documentRef: { type: String },
    status: {
      type: String,
      enum: [
        'pending',
        'in_progress',
        'approved',
        'rejected',
        'returned',
        'cancelled',
        'escalated',
        'expired',
      ],
      default: 'pending',
    },
    currentStep: { type: Number, default: 1 },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    submittedDate: { type: Date, default: Date.now },
    completedDate: { type: Date },
    totalAmount: { type: Number },
    currency: { type: String, default: 'SAR' },
    stepHistory: [
      {
        stepNumber: { type: Number },
        stepName: { type: String },
        action: {
          type: String,
          enum: ['approved', 'rejected', 'returned', 'escalated', 'delegated', 'auto_approved'],
        },
        actionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        actionDate: { type: Date, default: Date.now },
        comments: { type: String },
        slaBreached: { type: Boolean, default: false },
        durationHours: { type: Number },
      },
    ],
    priority: {
      type: String,
      enum: ['critical', 'high', 'normal', 'low'],
      default: 'normal',
    },
    dueDate: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

workflowInstanceSchema.pre('save', async function () {
  if (!this.instanceNumber) {
    const count = await this.constructor.countDocuments();
    this.instanceNumber = `WFI-${String(count + 1).padStart(6, '0')}`;
  }
});

financialWorkflowSchema.pre('save', async function () {
  if (!this.workflowNumber) {
    const count = await this.constructor.countDocuments();
    this.workflowNumber = `WFL-${String(count + 1).padStart(5, '0')}`;
  }
});

const FinancialWorkflow =
  mongoose.models.FinancialWorkflow || mongoose.model('FinancialWorkflow', financialWorkflowSchema);
const FinancialWorkflowInstance =
  mongoose.models.FinancialWorkflowInstance ||
  mongoose.model('FinancialWorkflowInstance', workflowInstanceSchema);

module.exports = { FinancialWorkflow, WorkflowInstance: FinancialWorkflowInstance };

/**
 * Approval Workflow Model - سير عمل الاعتمادات المالية
 * Centralized multi-level financial approvals engine
 */
const mongoose = require('mongoose');

/* ── Approval Workflow Template ── */
const approvalRuleSchema = new mongoose.Schema({
  stepOrder: { type: Number, required: true },
  stepName: { type: String, required: true },
  condition: {
    field: { type: String },
    operator: { type: String, enum: ['gt', 'gte', 'lt', 'lte', 'eq', 'ne', 'in', 'any'] },
    value: { type: mongoose.Schema.Types.Mixed },
  },
  approvers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  approverRoles: [{ type: String }],
  requiredCount: { type: Number, default: 1 },
  slaHours: { type: Number, default: 24 },
  autoApproveIfNoResponse: { type: Boolean, default: false },
  canDelegate: { type: Boolean, default: true },
});

const approvalWorkflowSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    name: { type: String, required: true, trim: true },
    nameEn: { type: String, trim: true },
    documentType: {
      type: String,
      enum: [
        'journal_entry',
        'payment',
        'expense',
        'purchase_order',
        'budget',
        'loan',
        'petty_cash',
        'bank_transfer',
        'credit_note',
        'write_off',
        'other',
      ],
      required: true,
    },
    description: { type: String },
    rules: [approvalRuleSchema],
    escalationPolicy: {
      type: String,
      enum: ['none', 'notify_manager', 'auto_escalate', 'auto_reject'],
      default: 'notify_manager',
    },
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

approvalWorkflowSchema.index({ organization: 1, documentType: 1, isActive: 1 });

/* ── Approval Request (instance of a workflow run) ── */
const approvalStepSchema = new mongoose.Schema({
  stepOrder: { type: Number, required: true },
  stepName: { type: String },
  approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'delegated', 'skipped', 'timed_out'],
    default: 'pending',
  },
  decidedAt: { type: Date },
  comment: { type: String },
  delegatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  delegatedAt: { type: Date },
  slaDeadline: { type: Date },
  isSlaBreached: { type: Boolean, default: false },
});

const financialApprovalSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    requestNumber: { type: String, unique: true, sparse: true },
    workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApprovalWorkflow', required: true },
    documentType: { type: String, required: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    documentRef: { type: String },
    documentAmount: { type: Number, default: 0 },
    description: { type: String },
    currentStep: { type: Number, default: 1 },
    totalSteps: { type: Number, default: 1 },
    steps: [approvalStepSchema],
    overallStatus: {
      type: String,
      enum: ['pending', 'in_progress', 'approved', 'rejected', 'cancelled', 'timed_out'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    finalDecisionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    finalDecisionAt: { type: Date },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

financialApprovalSchema.pre('save', function (next) {
  if (!this.requestNumber && this.isNew) {
    this.requestNumber = `APR-${Date.now().toString(36).toUpperCase()}`;
  }
  next();
});

financialApprovalSchema.index({ organization: 1, overallStatus: 1 });
financialApprovalSchema.index({ 'steps.approver': 1, 'steps.status': 1 });
financialApprovalSchema.index({ documentType: 1, documentId: 1 });

const ApprovalWorkflow = mongoose.models.ApprovalWorkflow || mongoose.model('ApprovalWorkflow', approvalWorkflowSchema);
const FinancialApproval = mongoose.models.FinancialApproval || mongoose.model('FinancialApproval', financialApprovalSchema);

module.exports = { ApprovalWorkflow, FinancialApproval };

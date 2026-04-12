'use strict';
/**
 * DddWorkflowEngine Model
 * Auto-extracted from services/dddWorkflowEngine.js
 * Schemas, constants, and Mongoose model registrations.
 */
const mongoose = require('mongoose');

const WORKFLOW_TYPES = [
  'clinical_pathway',
  'intake_process',
  'discharge_process',
  'assessment_flow',
  'referral_pipeline',
  'complaint_handling',
  'equipment_request',
  'leave_approval',
  'report_submission',
  'quality_review',
  'billing_cycle',
  'custom',
];

const WORKFLOW_STATUSES = ['draft', 'active', 'paused', 'completed', 'cancelled', 'archived'];

const TRIGGER_TYPES = [
  'manual',
  'event',
  'schedule',
  'condition',
  'webhook',
  'timer',
  'escalation',
];

const ACTION_TYPES = [
  'assign_task',
  'send_notification',
  'update_record',
  'create_appointment',
  'request_approval',
  'generate_document',
  'call_api',
  'run_script',
  'send_email',
  'escalate',
  'wait',
  'branch',
];

const SLA_PRIORITIES = [
  { code: 'critical', maxHours: 4, escalateAfterHours: 2 },
  { code: 'high', maxHours: 24, escalateAfterHours: 12 },
  { code: 'medium', maxHours: 72, escalateAfterHours: 48 },
  { code: 'low', maxHours: 168, escalateAfterHours: 120 },
];

const BUILTIN_WORKFLOWS = [
  {
    code: 'WF-INTAKE',
    name: 'New Beneficiary Intake',
    nameAr: 'استقبال مستفيد جديد',
    type: 'intake_process',
    stepsCount: 8,
  },
  {
    code: 'WF-ASSESS',
    name: 'Comprehensive Assessment',
    nameAr: 'التقييم الشامل',
    type: 'assessment_flow',
    stepsCount: 6,
  },
  {
    code: 'WF-DISCHARGE',
    name: 'Discharge Process',
    nameAr: 'عملية الخروج',
    type: 'discharge_process',
    stepsCount: 7,
  },
  {
    code: 'WF-REFERRAL',
    name: 'External Referral',
    nameAr: 'الإحالة الخارجية',
    type: 'referral_pipeline',
    stepsCount: 5,
  },
  {
    code: 'WF-COMPLAINT',
    name: 'Complaint Resolution',
    nameAr: 'حل الشكاوى',
    type: 'complaint_handling',
    stepsCount: 6,
  },
  {
    code: 'WF-EQUIP-REQ',
    name: 'Equipment Request',
    nameAr: 'طلب معدات',
    type: 'equipment_request',
    stepsCount: 4,
  },
  {
    code: 'WF-QUALITY',
    name: 'Quality Review Cycle',
    nameAr: 'دورة مراجعة الجودة',
    type: 'quality_review',
    stepsCount: 5,
  },
  {
    code: 'WF-REPORT',
    name: 'Monthly Report Submission',
    nameAr: 'تقديم التقرير الشهري',
    type: 'report_submission',
    stepsCount: 4,
  },
  {
    code: 'WF-CLINICAL',
    name: 'Clinical Pathway',
    nameAr: 'المسار السريري',
    type: 'clinical_pathway',
    stepsCount: 10,
  },
  {
    code: 'WF-BILLING',
    name: 'Billing Cycle',
    nameAr: 'دورة الفوترة',
    type: 'billing_cycle',
    stepsCount: 6,
  },
];

/* ══════════════════════════════════════════════════════════════
   2) SCHEMAS
   ══════════════════════════════════════════════════════════════ */

/* ── Workflow Definition Schema ── */

const workflowDefinitionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    nameAr: String,
    description: String,
    type: { type: String, enum: WORKFLOW_TYPES, required: true, index: true },
    version: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['draft', 'published', 'deprecated'],
      default: 'draft',
      index: true,
    },

    /* Steps definition */
    steps: [
      {
        stepId: { type: String, required: true },
        name: { type: String, required: true },
        nameAr: String,
        order: { type: Number, required: true },
        type: {
          type: String,
          enum: ['start', 'task', 'decision', 'parallel', 'wait', 'end'],
          required: true,
        },
        assigneeRole: String,
        assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        actions: [
          { type: { type: String, enum: ACTION_TYPES }, config: mongoose.Schema.Types.Mixed },
        ],
        transitions: [
          {
            targetStepId: String,
            condition: String, // JS expression
            label: String,
          },
        ],
        sla: {
          maxHours: Number,
          escalateToRole: String,
          escalateAfterHours: Number,
        },
        formId: String, // link to DDDFormTemplate
        metadata: mongoose.Schema.Types.Mixed,
      },
    ],

    triggers: [
      {
        type: { type: String, enum: TRIGGER_TYPES },
        event: String,
        config: mongoose.Schema.Types.Mixed,
      },
    ],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tags: [String],
    isActive: { type: Boolean, default: true, index: true },
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

const DDDWorkflowDefinition =
  mongoose.models.DDDWorkflowDefinition || mongoose.model('DDDWorkflowDefinition', workflowDefinitionSchema);

/* ── Workflow Instance Schema ── */
const workflowInstanceSchema = new mongoose.Schema(
  {
    definitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DDDWorkflowDefinition',
      required: true,
      index: true,
    },
    code: { type: String, unique: true, sparse: true, index: true },
    status: { type: String, enum: WORKFLOW_STATUSES, default: 'active', index: true },
    currentStepId: String,

    /* Context */
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', index: true },
    episodeId: { type: mongoose.Schema.Types.ObjectId },
    entityType: String,
    entityId: { type: mongoose.Schema.Types.ObjectId },

    /* Progress */
    stepHistory: [
      {
        stepId: String,
        enteredAt: { type: Date, default: Date.now },
        completedAt: Date,
        completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        outcome: String,
        data: mongoose.Schema.Types.Mixed,
        durationMinutes: Number,
      },
    ],

    /* SLA */
    startedAt: { type: Date, default: Date.now, index: true },
    dueAt: Date,
    completedAt: Date,
    slaBreached: { type: Boolean, default: false },
    priority: { type: String, enum: SLA_PRIORITIES.map(s => s.code), default: 'medium' },

    variables: { type: Map, of: mongoose.Schema.Types.Mixed },
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String,
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

workflowInstanceSchema.index({ status: 1, currentStepId: 1 });

const DDDWorkflowInstance =
  mongoose.models.DDDWorkflowInstance || mongoose.model('DDDWorkflowInstance', workflowInstanceSchema);

/* ── Task Schema ── */
const workflowTaskSchema = new mongoose.Schema(
  {
    instanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DDDWorkflowInstance',
      required: true,
      index: true,
    },
    stepId: { type: String, required: true },
    title: { type: String, required: true },
    titleAr: String,
    description: String,
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    assigneeRole: String,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'skipped', 'escalated', 'cancelled'],
      default: 'pending',
      index: true,
    },
    priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
    dueAt: { type: Date, index: true },
    completedAt: Date,
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    outcome: String,
    formData: mongoose.Schema.Types.Mixed,
    escalatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    escalatedAt: Date,
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

const DDDWorkflowTask =
  mongoose.models.DDDWorkflowTask || mongoose.model('DDDWorkflowTask', workflowTaskSchema);

/* ══════════════════════════════════════════════════════════════
   3) DOMAIN SERVICE
   ══════════════════════════════════════════════════════════════ */

module.exports = {
  WORKFLOW_TYPES,
  WORKFLOW_STATUSES,
  TRIGGER_TYPES,
  ACTION_TYPES,
  SLA_PRIORITIES,
  BUILTIN_WORKFLOWS,
};

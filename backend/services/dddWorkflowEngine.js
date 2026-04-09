'use strict';
/**
 * ═══════════════════════════════════════════════════════════════
 *  DDD Workflow Engine — Phase 15 (1/4)
 *  State machines, triggers, automatic transitions, SLA tracking
 * ═══════════════════════════════════════════════════════════════
 */
const mongoose = require('mongoose');
const { Router } = require('express');

/* ── helpers ── */
const model = name => {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
};
const oid = v => {
  try {
    return new mongoose.Types.ObjectId(String(v));
  } catch {
    return v;
  }
};
const safe = fn => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (e) {
    next(e);
  }
};

/* ══════════════════════════════════════════════════════════════
   1) CONSTANTS
   ══════════════════════════════════════════════════════════════ */

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
  model('DDDWorkflowDefinition') ||
  mongoose.model('DDDWorkflowDefinition', workflowDefinitionSchema);

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
  model('DDDWorkflowInstance') || mongoose.model('DDDWorkflowInstance', workflowInstanceSchema);

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
  model('DDDWorkflowTask') || mongoose.model('DDDWorkflowTask', workflowTaskSchema);

/* ══════════════════════════════════════════════════════════════
   3) DOMAIN SERVICE
   ══════════════════════════════════════════════════════════════ */

class WorkflowEngineService {
  /* ── Definitions CRUD ── */
  async listDefinitions(filter = {}) {
    const q = { isActive: true };
    if (filter.type) q.type = filter.type;
    if (filter.status) q.status = filter.status;
    if (filter.tenant) q.tenant = filter.tenant;
    if (filter.search) {
      q.$or = [
        { name: new RegExp(filter.search, 'i') },
        { nameAr: new RegExp(filter.search, 'i') },
        { code: new RegExp(filter.search, 'i') },
      ];
    }
    const page = Math.max(1, parseInt(filter.page) || 1);
    const limit = Math.min(100, parseInt(filter.limit) || 25);
    const [docs, total] = await Promise.all([
      DDDWorkflowDefinition.find(q)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DDDWorkflowDefinition.countDocuments(q),
    ]);
    return { data: docs, total, page, pages: Math.ceil(total / limit) };
  }

  async getDefinition(id) {
    return DDDWorkflowDefinition.findById(oid(id)).lean();
  }

  async createDefinition(data) {
    return DDDWorkflowDefinition.create(data);
  }

  async updateDefinition(id, data) {
    return DDDWorkflowDefinition.findByIdAndUpdate(
      oid(id),
      { $set: data },
      { new: true, runValidators: true }
    ).lean();
  }

  async publishDefinition(id) {
    return DDDWorkflowDefinition.findByIdAndUpdate(
      oid(id),
      { $set: { status: 'published' }, $inc: { version: 1 } },
      { new: true }
    ).lean();
  }

  /* ── Instance Lifecycle ── */
  async startWorkflow(definitionId, context = {}) {
    const def = await DDDWorkflowDefinition.findById(oid(definitionId)).lean();
    if (!def) throw new Error('Workflow definition not found');
    if (def.status !== 'published') throw new Error('Workflow must be published to start');

    const startStep = def.steps.find(s => s.type === 'start') || def.steps[0];
    const count = await DDDWorkflowInstance.countDocuments();
    const slaCfg = SLA_PRIORITIES.find(s => s.code === (context.priority || 'medium'));
    const dueAt = slaCfg ? new Date(Date.now() + slaCfg.maxHours * 3600000) : undefined;

    const instance = await DDDWorkflowInstance.create({
      definitionId: oid(definitionId),
      code: `WFI-${Date.now().toString(36).toUpperCase()}-${(count + 1).toString().padStart(5, '0')}`,
      currentStepId: startStep.stepId,
      beneficiaryId: context.beneficiaryId ? oid(context.beneficiaryId) : undefined,
      episodeId: context.episodeId ? oid(context.episodeId) : undefined,
      entityType: context.entityType,
      entityId: context.entityId ? oid(context.entityId) : undefined,
      priority: context.priority || 'medium',
      dueAt,
      initiatedBy: context.initiatedBy ? oid(context.initiatedBy) : undefined,
      variables: context.variables || {},
      stepHistory: [{ stepId: startStep.stepId, enteredAt: new Date() }],
      tenant: context.tenant || 'default',
    });

    // Create first task
    if (startStep.type === 'task' || startStep.type === 'start') {
      await DDDWorkflowTask.create({
        instanceId: instance._id,
        stepId: startStep.stepId,
        title: startStep.name,
        titleAr: startStep.nameAr,
        assigneeRole: startStep.assigneeRole,
        assigneeId: startStep.assigneeId,
        priority: context.priority || 'medium',
        dueAt: startStep.sla?.maxHours
          ? new Date(Date.now() + startStep.sla.maxHours * 3600000)
          : dueAt,
        tenant: context.tenant || 'default',
      });
    }

    return instance;
  }

  async advanceWorkflow(instanceId, stepOutcome, completedBy, formData) {
    const instance = await DDDWorkflowInstance.findById(oid(instanceId));
    if (!instance || instance.status !== 'active') throw new Error('Workflow not active');

    const def = await DDDWorkflowDefinition.findById(instance.definitionId).lean();
    if (!def) throw new Error('Definition not found');

    const currentStep = def.steps.find(s => s.stepId === instance.currentStepId);
    if (!currentStep) throw new Error('Current step not found');

    // Complete current step in history
    const historyEntry = instance.stepHistory.find(
      h => h.stepId === instance.currentStepId && !h.completedAt
    );
    if (historyEntry) {
      historyEntry.completedAt = new Date();
      historyEntry.completedBy = completedBy ? oid(completedBy) : undefined;
      historyEntry.outcome = stepOutcome;
      historyEntry.data = formData;
      historyEntry.durationMinutes = Math.round((new Date() - historyEntry.enteredAt) / 60000);
    }

    // Complete current task
    await DDDWorkflowTask.updateMany(
      {
        instanceId: instance._id,
        stepId: instance.currentStepId,
        status: { $in: ['pending', 'in_progress'] },
      },
      {
        $set: {
          status: 'completed',
          completedAt: new Date(),
          completedBy: completedBy ? oid(completedBy) : undefined,
          outcome: stepOutcome,
          formData,
        },
      }
    );

    // Find next step
    const transition = currentStep.transitions?.find(t => {
      if (!t.condition) return true;
      try {
        return new Function('outcome', 'data', `return ${t.condition}`)(stepOutcome, formData);
      } catch {
        return false;
      }
    });

    if (!transition) {
      // No valid transition — complete workflow
      instance.status = 'completed';
      instance.completedAt = new Date();
      await instance.save();
      return { instance: instance.toObject(), completed: true };
    }

    const nextStep = def.steps.find(s => s.stepId === transition.targetStepId);
    if (!nextStep || nextStep.type === 'end') {
      instance.status = 'completed';
      instance.completedAt = new Date();
      instance.currentStepId = nextStep?.stepId || 'end';
      await instance.save();
      return { instance: instance.toObject(), completed: true };
    }

    // Move to next step
    instance.currentStepId = nextStep.stepId;
    instance.stepHistory.push({ stepId: nextStep.stepId, enteredAt: new Date() });
    await instance.save();

    // Create task for next step
    if (nextStep.type === 'task') {
      await DDDWorkflowTask.create({
        instanceId: instance._id,
        stepId: nextStep.stepId,
        title: nextStep.name,
        titleAr: nextStep.nameAr,
        assigneeRole: nextStep.assigneeRole,
        assigneeId: nextStep.assigneeId,
        priority: instance.priority,
        dueAt: nextStep.sla?.maxHours
          ? new Date(Date.now() + nextStep.sla.maxHours * 3600000)
          : instance.dueAt,
        tenant: instance.tenant,
      });
    }

    return { instance: instance.toObject(), completed: false, nextStep: nextStep.stepId };
  }

  async cancelWorkflow(instanceId, reason, cancelledBy) {
    const inst = await DDDWorkflowInstance.findByIdAndUpdate(
      oid(instanceId),
      {
        $set: { status: 'cancelled', completedAt: new Date(), notes: reason },
      },
      { new: true }
    ).lean();
    await DDDWorkflowTask.updateMany(
      { instanceId: oid(instanceId), status: { $in: ['pending', 'in_progress'] } },
      { $set: { status: 'cancelled' } }
    );
    return inst;
  }

  /* ── Instances Query ── */
  async listInstances(filter = {}) {
    const q = {};
    if (filter.status) q.status = filter.status;
    if (filter.definitionId) q.definitionId = oid(filter.definitionId);
    if (filter.beneficiaryId) q.beneficiaryId = oid(filter.beneficiaryId);
    if (filter.priority) q.priority = filter.priority;
    if (filter.tenant) q.tenant = filter.tenant;
    const page = Math.max(1, parseInt(filter.page) || 1);
    const limit = Math.min(100, parseInt(filter.limit) || 25);
    const [docs, total] = await Promise.all([
      DDDWorkflowInstance.find(q)
        .sort({ startedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('definitionId', 'name code type')
        .lean(),
      DDDWorkflowInstance.countDocuments(q),
    ]);
    return { data: docs, total, page, pages: Math.ceil(total / limit) };
  }

  async getInstance(id) {
    return DDDWorkflowInstance.findById(oid(id))
      .populate('definitionId', 'name code type steps')
      .populate('initiatedBy', 'name email')
      .lean();
  }

  /* ── Tasks ── */
  async listTasks(filter = {}) {
    const q = {};
    if (filter.assigneeId) q.assigneeId = oid(filter.assigneeId);
    if (filter.assigneeRole) q.assigneeRole = filter.assigneeRole;
    if (filter.status) q.status = filter.status;
    if (filter.priority) q.priority = filter.priority;
    if (filter.tenant) q.tenant = filter.tenant;
    const page = Math.max(1, parseInt(filter.page) || 1);
    const limit = Math.min(100, parseInt(filter.limit) || 25);
    const [docs, total] = await Promise.all([
      DDDWorkflowTask.find(q)
        .sort({ dueAt: 1, priority: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('instanceId', 'code status')
        .lean(),
      DDDWorkflowTask.countDocuments(q),
    ]);
    return { data: docs, total, page, pages: Math.ceil(total / limit) };
  }

  async claimTask(taskId, userId) {
    return DDDWorkflowTask.findByIdAndUpdate(
      oid(taskId),
      {
        $set: { assigneeId: oid(userId), status: 'in_progress' },
      },
      { new: true }
    ).lean();
  }

  /* ── SLA Check ── */
  async checkSLABreaches(tenant = 'default') {
    const now = new Date();
    const breached = await DDDWorkflowInstance.find({
      status: 'active',
      dueAt: { $lt: now },
      slaBreached: false,
      tenant,
    }).lean();

    for (const inst of breached) {
      await DDDWorkflowInstance.findByIdAndUpdate(inst._id, { $set: { slaBreached: true } });
    }

    const overdueTasks = await DDDWorkflowTask.find({
      status: { $in: ['pending', 'in_progress'] },
      dueAt: { $lt: now },
      tenant,
    }).lean();

    return { breachedInstances: breached.length, overdueTasks: overdueTasks.length };
  }

  /* ── Stats ── */
  async getStats(tenant = 'default') {
    const [defCount, activeInstances, completedInstances, pendingTasks, slaBreaches] =
      await Promise.all([
        DDDWorkflowDefinition.countDocuments({ isActive: true, tenant }),
        DDDWorkflowInstance.countDocuments({ status: 'active', tenant }),
        DDDWorkflowInstance.countDocuments({ status: 'completed', tenant }),
        DDDWorkflowTask.countDocuments({ status: 'pending', tenant }),
        DDDWorkflowInstance.countDocuments({ slaBreached: true, status: 'active', tenant }),
      ]);
    return {
      definitions: defCount,
      activeInstances,
      completedInstances,
      pendingTasks,
      slaBreaches,
      builtinWorkflows: BUILTIN_WORKFLOWS.length,
    };
  }
}

const workflowEngineService = new WorkflowEngineService();

/* ══════════════════════════════════════════════════════════════
   4) ROUTER
   ══════════════════════════════════════════════════════════════ */

function createWorkflowEngineRouter() {
  const r = Router();

  /* Definitions */
  r.get(
    '/workflow-engine/definitions',
    safe(async (req, res) => {
      res.json({ success: true, ...(await workflowEngineService.listDefinitions(req.query)) });
    })
  );
  r.get(
    '/workflow-engine/definitions/:id',
    safe(async (req, res) => {
      const doc = await workflowEngineService.getDefinition(req.params.id);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );
  r.post(
    '/workflow-engine/definitions',
    safe(async (req, res) => {
      const doc = await workflowEngineService.createDefinition(req.body);
      res.status(201).json({ success: true, data: doc });
    })
  );
  r.put(
    '/workflow-engine/definitions/:id',
    safe(async (req, res) => {
      const doc = await workflowEngineService.updateDefinition(req.params.id, req.body);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );
  r.post(
    '/workflow-engine/definitions/:id/publish',
    safe(async (req, res) => {
      const doc = await workflowEngineService.publishDefinition(req.params.id);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );

  /* Instances */
  r.get(
    '/workflow-engine/instances',
    safe(async (req, res) => {
      res.json({ success: true, ...(await workflowEngineService.listInstances(req.query)) });
    })
  );
  r.get(
    '/workflow-engine/instances/:id',
    safe(async (req, res) => {
      const doc = await workflowEngineService.getInstance(req.params.id);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );
  r.post(
    '/workflow-engine/instances',
    safe(async (req, res) => {
      const { definitionId, ...context } = req.body;
      const doc = await workflowEngineService.startWorkflow(definitionId, context);
      res.status(201).json({ success: true, data: doc });
    })
  );
  r.post(
    '/workflow-engine/instances/:id/advance',
    safe(async (req, res) => {
      const { outcome, completedBy, formData } = req.body;
      const result = await workflowEngineService.advanceWorkflow(
        req.params.id,
        outcome,
        completedBy,
        formData
      );
      res.json({ success: true, data: result });
    })
  );
  r.post(
    '/workflow-engine/instances/:id/cancel',
    safe(async (req, res) => {
      const doc = await workflowEngineService.cancelWorkflow(
        req.params.id,
        req.body.reason,
        req.body.cancelledBy
      );
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );

  /* Tasks */
  r.get(
    '/workflow-engine/tasks',
    safe(async (req, res) => {
      res.json({ success: true, ...(await workflowEngineService.listTasks(req.query)) });
    })
  );
  r.post(
    '/workflow-engine/tasks/:id/claim',
    safe(async (req, res) => {
      const doc = await workflowEngineService.claimTask(req.params.id, req.body.userId);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );

  /* SLA */
  r.post(
    '/workflow-engine/sla/check',
    safe(async (req, res) => {
      const data = await workflowEngineService.checkSLABreaches(req.query.tenant);
      res.json({ success: true, data });
    })
  );

  /* Stats */
  r.get(
    '/workflow-engine/stats',
    safe(async (req, res) => {
      const data = await workflowEngineService.getStats(req.query.tenant);
      res.json({ success: true, data });
    })
  );

  /* Meta */
  r.get('/workflow-engine/meta', (_req, res) => {
    res.json({
      success: true,
      workflowTypes: WORKFLOW_TYPES,
      workflowStatuses: WORKFLOW_STATUSES,
      triggerTypes: TRIGGER_TYPES,
      actionTypes: ACTION_TYPES,
      slaPriorities: SLA_PRIORITIES,
      builtinWorkflows: BUILTIN_WORKFLOWS,
    });
  });

  return r;
}

/* ══════════════════════════════════════════════════════════════
   5) EXPORTS
   ══════════════════════════════════════════════════════════════ */

module.exports = {
  DDDWorkflowDefinition,
  DDDWorkflowInstance,
  DDDWorkflowTask,
  WorkflowEngineService,
  workflowEngineService,
  createWorkflowEngineRouter,
  WORKFLOW_TYPES,
  WORKFLOW_STATUSES,
  TRIGGER_TYPES,
  ACTION_TYPES,
  SLA_PRIORITIES,
  BUILTIN_WORKFLOWS,
};

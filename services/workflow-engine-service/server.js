/**
 * Workflow Engine Service — Al-Awael ERP
 * Port: 3350
 *
 * BPMN-style workflow definitions, multi-level approval chains,
 * delegation & escalation, SLA tracking, form builder integration,
 * conditional branching, parallel approvals, notifications.
 */

'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { Queue, Worker } = require('bullmq');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379/0', {
  maxRetriesPerRequest: null,
  retryStrategy: t => Math.min(t * 200, 5000),
});
const pub = redis.duplicate();

const workflowQueue = new Queue('workflow-engine', { connection: redis });

/* ───────── Mongoose schemas ───────── */

// Workflow Definition — the template / blueprint
const workflowDefSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String },
    code: { type: String, unique: true },
    description: String,
    category: {
      type: String,
      enum: ['hr', 'finance', 'academic', 'operations', 'it', 'general', 'procurement', 'student', 'parent', 'maintenance'],
      required: true,
    },
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    // Steps define the workflow pipeline
    steps: [
      {
        stepOrder: { type: Number, required: true },
        name: { type: String, required: true },
        nameAr: String,
        type: {
          type: String,
          enum: ['approval', 'review', 'task', 'notification', 'condition', 'parallel', 'auto-action', 'form-fill'],
          required: true,
        },
        // Who handles this step
        assigneeType: { type: String, enum: ['role', 'user', 'department-head', 'manager', 'dynamic', 'group'], default: 'role' },
        assigneeValue: String, // roleId / userId / expression
        // Approval settings
        approvalType: { type: String, enum: ['any', 'all', 'majority', 'sequential'], default: 'any' },
        minApprovals: { type: Number, default: 1 },
        // SLA
        slaHours: { type: Number }, // max hours to complete this step
        escalateTo: String, // userId/role to escalate to on SLA breach
        escalationLevels: [
          {
            hoursAfterSLA: Number,
            assignee: String,
            action: { type: String, enum: ['notify', 'reassign', 'auto-approve', 'auto-reject'] },
          },
        ],
        // Conditions (for condition steps)
        conditions: [
          {
            field: String,
            operator: { type: String, enum: ['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'contains', 'in'] },
            value: mongoose.Schema.Types.Mixed,
            nextStep: Number, // stepOrder to jump to
          },
        ],
        // Form fields for form-fill steps
        formFields: [
          {
            fieldName: String,
            fieldLabel: String,
            fieldLabelAr: String,
            fieldType: { type: String, enum: ['text', 'number', 'date', 'select', 'textarea', 'file', 'checkbox'] },
            required: Boolean,
            options: [String],
          },
        ],
        // Auto-action settings (e.g., auto-notify, auto-assign)
        autoAction: {
          type: { type: String, enum: ['api-call', 'send-notification', 'update-record', 'create-task'] },
          config: mongoose.Schema.Types.Mixed,
        },
        allowDelegation: { type: Boolean, default: true },
        instructions: String,
        instructionsAr: String,
      },
    ],
    // Triggers
    triggers: [
      {
        event: String, // e.g., "leave-request-created"
        source: String, // service name
      },
    ],
    metadata: mongoose.Schema.Types.Mixed,
    createdBy: String,
    updatedBy: String,
  },
  { timestamps: true },
);

workflowDefSchema.pre('save', function (next) {
  if (!this.code) this.code = `WF-${this.category.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  next();
});

const WorkflowDef = mongoose.model('WorkflowDef', workflowDefSchema);

// Workflow Instance — a running workflow
const workflowInstanceSchema = new mongoose.Schema(
  {
    instanceId: { type: String, unique: true, default: () => uuidv4() },
    definitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowDef', required: true },
    definitionCode: String,
    title: String,
    titleAr: String,
    status: { type: String, enum: ['active', 'completed', 'rejected', 'cancelled', 'suspended', 'expired'], default: 'active' },
    currentStepOrder: { type: Number, default: 1 },
    initiator: { type: String, required: true }, // userId who started it
    entityType: String, // e.g., "leave-request", "purchase-order"
    entityId: String, // the record this workflow is about
    data: { type: mongoose.Schema.Types.Mixed, default: {} }, // submitted form data
    stepHistory: [
      {
        stepOrder: Number,
        stepName: String,
        action: {
          type: String,
          enum: ['approved', 'rejected', 'completed', 'skipped', 'escalated', 'delegated', 'returned', 'auto-completed'],
        },
        actionBy: String,
        actionByName: String,
        delegatedFrom: String,
        comment: String,
        commentAr: String,
        attachments: [String],
        formData: mongoose.Schema.Types.Mixed,
        actionAt: { type: Date, default: Date.now },
        slaDeadline: Date,
        slaBreached: { type: Boolean, default: false },
        duration: Number, // minutes taken
      },
    ],
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
    dueDate: Date,
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    tags: [String],
  },
  { timestamps: true },
);

const WorkflowInstance = mongoose.model('WorkflowInstance', workflowInstanceSchema);

// Task — individual assignee's pending task
const taskSchema = new mongoose.Schema(
  {
    taskId: { type: String, unique: true, default: () => uuidv4() },
    instanceId: { type: String, required: true, index: true },
    definitionId: String,
    stepOrder: { type: Number, required: true },
    stepName: String,
    stepNameAr: String,
    stepType: String,
    assignee: { type: String, required: true, index: true }, // userId
    assigneeType: String,
    status: { type: String, enum: ['pending', 'in-progress', 'completed', 'delegated', 'expired', 'cancelled'], default: 'pending' },
    dueDate: Date,
    slaDeadline: Date,
    slaBreached: { type: Boolean, default: false },
    delegatedTo: String,
    delegatedAt: Date,
    completedAt: Date,
    action: String,
    comment: String,
    formData: mongoose.Schema.Types.Mixed,
    entityType: String,
    entityId: String,
    priority: String,
    instanceTitle: String,
  },
  { timestamps: true },
);

const Task = mongoose.model('WorkflowTask', taskSchema);

// Delegation Rule
const delegationSchema = new mongoose.Schema(
  {
    fromUser: { type: String, required: true },
    toUser: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    categories: [String], // empty = all categories
    reason: String,
    isActive: { type: Boolean, default: true },
    createdBy: String,
  },
  { timestamps: true },
);

const Delegation = mongoose.model('Delegation', delegationSchema);

/* ───────── Core engine logic ───────── */

async function startWorkflow(definitionId, initiator, entityType, entityId, data, opts = {}) {
  const def = await WorkflowDef.findById(definitionId);
  if (!def || !def.isActive) throw new Error('Workflow definition not found or inactive');

  const instance = await WorkflowInstance.create({
    definitionId: def._id,
    definitionCode: def.code,
    title: opts.title || def.name,
    titleAr: opts.titleAr || def.nameAr,
    initiator,
    entityType,
    entityId,
    data,
    currentStepOrder: 1,
    priority: opts.priority || 'normal',
    tags: opts.tags || [],
  });

  await advanceToStep(instance, def, 1);

  await pub.publish(
    'workflow:started',
    JSON.stringify({
      instanceId: instance.instanceId,
      definitionCode: def.code,
      initiator,
      entityType,
      entityId,
    }),
  );

  return instance;
}

async function advanceToStep(instance, def, stepOrder) {
  const step = def.steps.find(s => s.stepOrder === stepOrder);
  if (!step) {
    // No more steps — workflow complete
    instance.status = 'completed';
    instance.completedAt = new Date();
    instance.currentStepOrder = stepOrder;
    await instance.save();

    await pub.publish(
      'workflow:completed',
      JSON.stringify({
        instanceId: instance.instanceId,
        entityType: instance.entityType,
        entityId: instance.entityId,
        outcome: 'completed',
      }),
    );
    return;
  }

  instance.currentStepOrder = stepOrder;
  await instance.save();

  // Handle condition steps
  if (step.type === 'condition') {
    const nextStep = evaluateConditions(step.conditions, instance.data);
    return advanceToStep(instance, def, nextStep || stepOrder + 1);
  }

  // Handle auto-action steps
  if (step.type === 'auto-action') {
    instance.stepHistory.push({
      stepOrder,
      stepName: step.name,
      action: 'auto-completed',
      actionBy: 'system',
      actionAt: new Date(),
    });
    await instance.save();
    return advanceToStep(instance, def, stepOrder + 1);
  }

  // Handle notification steps
  if (step.type === 'notification') {
    await pub.publish(
      'workflow:notification',
      JSON.stringify({
        instanceId: instance.instanceId,
        step: step.name,
        data: instance.data,
      }),
    );
    instance.stepHistory.push({
      stepOrder,
      stepName: step.name,
      action: 'auto-completed',
      actionBy: 'system',
      actionAt: new Date(),
    });
    await instance.save();
    return advanceToStep(instance, def, stepOrder + 1);
  }

  // Create task(s) for approval / review / task / form-fill steps
  let assignees = await resolveAssignees(step, instance);

  // Check delegation
  const now = new Date();
  for (let i = 0; i < assignees.length; i++) {
    const deleg = await Delegation.findOne({
      fromUser: assignees[i],
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
      $or: [{ categories: { $size: 0 } }, { categories: def.category }],
    });
    if (deleg) {
      assignees[i] = deleg.toUser;
    }
  }

  const slaDeadline = step.slaHours ? new Date(Date.now() + step.slaHours * 3600000) : null;

  for (const assignee of assignees) {
    await Task.create({
      instanceId: instance.instanceId,
      definitionId: def._id.toString(),
      stepOrder,
      stepName: step.name,
      stepNameAr: step.nameAr,
      stepType: step.type,
      assignee,
      assigneeType: step.assigneeType,
      slaDeadline,
      dueDate: slaDeadline,
      entityType: instance.entityType,
      entityId: instance.entityId,
      priority: instance.priority,
      instanceTitle: instance.title,
    });

    await pub.publish(
      'workflow:task-assigned',
      JSON.stringify({
        instanceId: instance.instanceId,
        assignee,
        stepName: step.name,
        entityType: instance.entityType,
        entityId: instance.entityId,
        slaDeadline,
      }),
    );
  }
}

function evaluateConditions(conditions, data) {
  for (const cond of conditions || []) {
    const value = data[cond.field];
    let match = false;
    switch (cond.operator) {
      case 'eq':
        match = value == cond.value;
        break;
      case 'ne':
        match = value != cond.value;
        break;
      case 'gt':
        match = value > cond.value;
        break;
      case 'lt':
        match = value < cond.value;
        break;
      case 'gte':
        match = value >= cond.value;
        break;
      case 'lte':
        match = value <= cond.value;
        break;
      case 'contains':
        match = String(value).includes(cond.value);
        break;
      case 'in':
        match = Array.isArray(cond.value) ? cond.value.includes(value) : false;
        break;
    }
    if (match) return cond.nextStep;
  }
  return null;
}

async function resolveAssignees(step, instance) {
  // Simplified: in production, look up from identity/hr services
  if (step.assigneeType === 'user') return [step.assigneeValue];
  if (step.assigneeType === 'role') return [step.assigneeValue]; // placeholder — resolve role → users
  if (step.assigneeType === 'department-head') return [step.assigneeValue || 'dept-head'];
  if (step.assigneeType === 'manager') return [instance.data?.managerId || step.assigneeValue || 'manager'];
  if (step.assigneeType === 'dynamic') {
    const field = step.assigneeValue; // e.g., "data.approverId"
    const val = field.split('.').reduce((o, k) => o?.[k], instance);
    return val ? [val] : [step.assigneeValue];
  }
  if (step.assigneeType === 'group') return (step.assigneeValue || '').split(',').map(s => s.trim());
  return ['unassigned'];
}

async function processTaskAction(taskId, action, userId, comment, formData) {
  const task = await Task.findOne({ taskId });
  if (!task || task.status !== 'pending') throw new Error('Task not found or already completed');

  task.status = 'completed';
  task.action = action;
  task.comment = comment;
  task.formData = formData;
  task.completedAt = new Date();
  await task.save();

  const instance = await WorkflowInstance.findOne({ instanceId: task.instanceId });
  if (!instance) throw new Error('Workflow instance not found');

  const def = await WorkflowDef.findById(instance.definitionId);
  const step = def.steps.find(s => s.stepOrder === task.stepOrder);

  // Record in history
  const started = task.createdAt;
  const duration = Math.round((Date.now() - started.getTime()) / 60000);
  instance.stepHistory.push({
    stepOrder: task.stepOrder,
    stepName: step.name,
    action,
    actionBy: userId,
    comment,
    formData,
    actionAt: new Date(),
    slaDeadline: task.slaDeadline,
    slaBreached: task.slaDeadline ? new Date() > task.slaDeadline : false,
    duration,
  });
  await instance.save();

  if (action === 'rejected') {
    instance.status = 'rejected';
    instance.completedAt = new Date();
    await instance.save();
    // Cancel remaining tasks
    await Task.updateMany({ instanceId: instance.instanceId, status: 'pending' }, { $set: { status: 'cancelled' } });
    await pub.publish(
      'workflow:rejected',
      JSON.stringify({
        instanceId: instance.instanceId,
        entityType: instance.entityType,
        entityId: instance.entityId,
        rejectedBy: userId,
        comment,
      }),
    );
    return instance;
  }

  if (action === 'returned') {
    // Return to previous step
    const prevStep = task.stepOrder - 1;
    if (prevStep >= 1) {
      await Task.updateMany({ instanceId: instance.instanceId, status: 'pending' }, { $set: { status: 'cancelled' } });
      await advanceToStep(instance, def, prevStep);
    }
    return instance;
  }

  // Check if all required approvals for this step are done
  if (step.approvalType === 'all') {
    const pending = await Task.countDocuments({ instanceId: instance.instanceId, stepOrder: task.stepOrder, status: 'pending' });
    if (pending > 0) return instance; // Wait for rest
  } else if (step.approvalType === 'majority') {
    const total = await Task.countDocuments({ instanceId: instance.instanceId, stepOrder: task.stepOrder });
    const completed = await Task.countDocuments({
      instanceId: instance.instanceId,
      stepOrder: task.stepOrder,
      status: 'completed',
      action: 'approved',
    });
    if (completed <= total / 2) return instance;
    // Cancel remaining
    await Task.updateMany(
      { instanceId: instance.instanceId, stepOrder: task.stepOrder, status: 'pending' },
      { $set: { status: 'cancelled' } },
    );
  } else {
    // 'any' or 'sequential' — first approval moves forward, cancel remaining
    await Task.updateMany(
      { instanceId: instance.instanceId, stepOrder: task.stepOrder, status: 'pending' },
      { $set: { status: 'cancelled' } },
    );
  }

  // Advance to next step
  await advanceToStep(instance, def, task.stepOrder + 1);
  return instance;
}

/* ───────── BullMQ worker ───────── */

new Worker(
  'workflow-engine',
  async job => {
    if (job.name === 'check-sla') {
      const tasks = await Task.find({ status: 'pending', slaDeadline: { $lt: new Date() }, slaBreached: false });
      for (const task of tasks) {
        task.slaBreached = true;
        await task.save();

        const instance = await WorkflowInstance.findOne({ instanceId: task.instanceId });
        const def = instance ? await WorkflowDef.findById(instance.definitionId) : null;
        const step = def?.steps.find(s => s.stepOrder === task.stepOrder);

        if (step?.escalationLevels?.length) {
          const hoursPast = (Date.now() - task.slaDeadline.getTime()) / 3600000;
          for (const esc of step.escalationLevels.sort((a, b) => a.hoursAfterSLA - b.hoursAfterSLA)) {
            if (hoursPast >= esc.hoursAfterSLA) {
              if (esc.action === 'auto-approve') {
                await processTaskAction(task.taskId, 'approved', 'system-auto', 'Auto-approved due to SLA breach', null);
              } else {
                await pub.publish(
                  'workflow:escalation',
                  JSON.stringify({
                    instanceId: task.instanceId,
                    taskId: task.taskId,
                    assignee: esc.assignee,
                    action: esc.action,
                    hoursPast: Math.round(hoursPast * 10) / 10,
                  }),
                );
              }
              break;
            }
          }
        } else if (step?.escalateTo) {
          await pub.publish(
            'workflow:escalation',
            JSON.stringify({
              instanceId: task.instanceId,
              taskId: task.taskId,
              assignee: step.escalateTo,
              action: 'notify',
            }),
          );
        }
      }
      console.log(`[WorkflowEngine] SLA check: ${tasks.length} breached tasks`);
    }
  },
  { connection: redis },
);

/* ───────── Routes ───────── */
const r = express.Router();

// ── Workflow Definitions ──
r.get('/definitions', async (req, res) => {
  try {
    const { category, active } = req.query;
    const q = {};
    if (category) q.category = category;
    if (active !== undefined) q.isActive = active === 'true';
    const defs = await WorkflowDef.find(q).sort({ category: 1, name: 1 });
    res.json({ success: true, data: defs });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.get('/definitions/:id', async (req, res) => {
  try {
    const d = await WorkflowDef.findById(req.params.id);
    if (!d) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: d });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/definitions', async (req, res) => {
  try {
    const d = await WorkflowDef.create(req.body);
    res.status(201).json({ success: true, data: d });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.put('/definitions/:id', async (req, res) => {
  try {
    const def = await WorkflowDef.findById(req.params.id);
    if (!def) return res.status(404).json({ success: false, error: 'Not found' });
    // Version bump on step changes
    if (req.body.steps && JSON.stringify(req.body.steps) !== JSON.stringify(def.steps)) {
      req.body.version = (def.version || 1) + 1;
    }
    Object.assign(def, req.body);
    await def.save();
    res.json({ success: true, data: def });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// ── Workflow Instances ──
r.post('/instances/start', async (req, res) => {
  try {
    const { definitionId, entityType, entityId, data, title, titleAr, priority, tags } = req.body;
    const initiator = req.body.initiator || req.headers['x-user-id'] || 'unknown';
    const instance = await startWorkflow(definitionId, initiator, entityType, entityId, data, { title, titleAr, priority, tags });
    res.status(201).json({ success: true, data: instance });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.get('/instances', async (req, res) => {
  try {
    const { status, initiator, entityType, entityId, page = 1, limit = 50 } = req.query;
    const q = {};
    if (status) q.status = status;
    if (initiator) q.initiator = initiator;
    if (entityType) q.entityType = entityType;
    if (entityId) q.entityId = entityId;
    const total = await WorkflowInstance.countDocuments(q);
    const instances = await WorkflowInstance.find(q)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ success: true, data: instances, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.get('/instances/:id', async (req, res) => {
  try {
    const inst = await WorkflowInstance.findOne({ $or: [{ _id: req.params.id }, { instanceId: req.params.id }] });
    if (!inst) return res.status(404).json({ success: false, error: 'Not found' });
    const tasks = await Task.find({ instanceId: inst.instanceId }).sort({ stepOrder: 1 });
    res.json({ success: true, data: { instance: inst, tasks } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/instances/:id/cancel', async (req, res) => {
  try {
    const inst = await WorkflowInstance.findOne({ instanceId: req.params.id });
    if (!inst) return res.status(404).json({ success: false, error: 'Not found' });
    inst.status = 'cancelled';
    inst.completedAt = new Date();
    await inst.save();
    await Task.updateMany({ instanceId: inst.instanceId, status: 'pending' }, { $set: { status: 'cancelled' } });
    res.json({ success: true, data: inst });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Tasks ──
r.get('/tasks', async (req, res) => {
  try {
    const { assignee, status, priority, entityType } = req.query;
    const q = {};
    if (assignee) q.assignee = assignee;
    if (status) q.status = status;
    else q.status = 'pending';
    if (priority) q.priority = priority;
    if (entityType) q.entityType = entityType;
    const tasks = await Task.find(q).sort({ priority: -1, createdAt: 1 });
    res.json({ success: true, data: tasks });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.get('/tasks/my/:userId', async (req, res) => {
  try {
    const pending = await Task.find({ assignee: req.params.userId, status: 'pending' }).sort({ priority: -1, createdAt: 1 });
    const completed = await Task.find({ assignee: req.params.userId, status: 'completed' }).sort({ completedAt: -1 }).limit(20);
    res.json({ success: true, data: { pending, completed, pendingCount: pending.length } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/tasks/:taskId/action', async (req, res) => {
  try {
    const { action, comment, formData } = req.body;
    const userId = req.body.userId || req.headers['x-user-id'];
    if (!['approved', 'rejected', 'completed', 'returned'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Invalid action' });
    }
    const instance = await processTaskAction(req.params.taskId, action, userId, comment, formData);
    res.json({ success: true, data: instance });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.post('/tasks/:taskId/delegate', async (req, res) => {
  try {
    const { delegateTo, comment } = req.body;
    const task = await Task.findOne({ taskId: req.params.taskId, status: 'pending' });
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });

    const original = task.assignee;
    task.delegatedTo = delegateTo;
    task.delegatedAt = new Date();
    task.status = 'delegated';
    await task.save();

    // Create new task for delegate
    const newTask = await Task.create({
      instanceId: task.instanceId,
      definitionId: task.definitionId,
      stepOrder: task.stepOrder,
      stepName: task.stepName,
      stepNameAr: task.stepNameAr,
      stepType: task.stepType,
      assignee: delegateTo,
      assigneeType: 'user',
      slaDeadline: task.slaDeadline,
      dueDate: task.dueDate,
      entityType: task.entityType,
      entityId: task.entityId,
      priority: task.priority,
      instanceTitle: task.instanceTitle,
    });

    await pub.publish(
      'workflow:task-delegated',
      JSON.stringify({
        instanceId: task.instanceId,
        from: original,
        to: delegateTo,
        taskId: newTask.taskId,
        comment,
      }),
    );

    res.json({ success: true, data: newTask });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// ── Delegations ──
r.get('/delegations', async (req, res) => {
  try {
    const { fromUser, active } = req.query;
    const q = {};
    if (fromUser) q.fromUser = fromUser;
    if (active !== undefined) q.isActive = active === 'true';
    const d = await Delegation.find(q).sort({ startDate: -1 });
    res.json({ success: true, data: d });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/delegations', async (req, res) => {
  try {
    const d = await Delegation.create(req.body);
    res.status(201).json({ success: true, data: d });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.delete('/delegations/:id', async (req, res) => {
  try {
    await Delegation.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Delegation deactivated' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Stats ──
r.get('/stats', async (req, res) => {
  try {
    const [activeInstances, pendingTasks, completedToday, avgDuration, byCategory] = await Promise.all([
      WorkflowInstance.countDocuments({ status: 'active' }),
      Task.countDocuments({ status: 'pending' }),
      WorkflowInstance.countDocuments({ status: 'completed', completedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
      WorkflowInstance.aggregate([
        { $match: { status: 'completed', completedAt: { $exists: true } } },
        { $project: { duration: { $subtract: ['$completedAt', '$startedAt'] } } },
        { $group: { _id: null, avg: { $avg: '$duration' } } },
      ]),
      WorkflowInstance.aggregate([
        { $lookup: { from: 'workflowdefs', localField: 'definitionId', foreignField: '_id', as: 'def' } },
        { $unwind: '$def' },
        { $group: { _id: '$def.category', total: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } } } },
      ]),
    ]);

    const slaBreach = await Task.countDocuments({ slaBreached: true, createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } });

    res.json({
      success: true,
      data: {
        activeInstances,
        pendingTasks,
        completedToday,
        avgDurationMinutes: avgDuration[0] ? Math.round(avgDuration[0].avg / 60000) : 0,
        slaBreachesLast30d: slaBreach,
        byCategory: byCategory.reduce((o, c) => {
          o[c._id] = { total: c.total, active: c.active };
          return o;
        }, {}),
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Seed default workflows ──
r.post('/seed-defaults', async (req, res) => {
  try {
    const defaults = [
      {
        name: 'Leave Request Approval',
        nameAr: 'الموافقة على طلب الإجازة',
        category: 'hr',
        steps: [
          { stepOrder: 1, name: 'Manager Approval', nameAr: 'موافقة المدير', type: 'approval', assigneeType: 'manager', slaHours: 48 },
          {
            stepOrder: 2,
            name: 'HR Review',
            nameAr: 'مراجعة الموارد البشرية',
            type: 'review',
            assigneeType: 'role',
            assigneeValue: 'hr-manager',
            slaHours: 24,
          },
          { stepOrder: 3, name: 'Notification', nameAr: 'إشعار', type: 'notification' },
        ],
      },
      {
        name: 'Purchase Request',
        nameAr: 'طلب شراء',
        category: 'procurement',
        steps: [
          { stepOrder: 1, name: 'Department Head', nameAr: 'رئيس القسم', type: 'approval', assigneeType: 'department-head', slaHours: 24 },
          {
            stepOrder: 2,
            name: 'Budget Check',
            nameAr: 'فحص الميزانية',
            type: 'condition',
            conditions: [{ field: 'amount', operator: 'gt', value: 10000, nextStep: 3 }],
          },
          {
            stepOrder: 3,
            name: 'Finance Manager',
            nameAr: 'مدير المالية',
            type: 'approval',
            assigneeType: 'role',
            assigneeValue: 'finance-manager',
            slaHours: 48,
          },
          {
            stepOrder: 4,
            name: 'General Manager',
            nameAr: 'المدير العام',
            type: 'approval',
            assigneeType: 'role',
            assigneeValue: 'general-manager',
            slaHours: 72,
          },
        ],
      },
      {
        name: 'Student Enrollment',
        nameAr: 'تسجيل طالب',
        category: 'student',
        steps: [
          {
            stepOrder: 1,
            name: 'Document Review',
            nameAr: 'مراجعة الوثائق',
            type: 'review',
            assigneeType: 'role',
            assigneeValue: 'admissions',
            slaHours: 48,
          },
          {
            stepOrder: 2,
            name: 'Assessment',
            nameAr: 'التقييم',
            type: 'task',
            assigneeType: 'role',
            assigneeValue: 'assessor',
            slaHours: 72,
          },
          {
            stepOrder: 3,
            name: 'Director Approval',
            nameAr: 'موافقة المدير',
            type: 'approval',
            assigneeType: 'role',
            assigneeValue: 'director',
            slaHours: 24,
          },
          {
            stepOrder: 4,
            name: 'Fee Setup',
            nameAr: 'إعداد الرسوم',
            type: 'auto-action',
            autoAction: { type: 'api-call', config: { service: 'fee-billing-service', endpoint: '/api/invoices' } },
          },
        ],
      },
    ];

    const created = [];
    for (const d of defaults) {
      const exists = await WorkflowDef.findOne({ name: d.name });
      if (!exists) created.push(await WorkflowDef.create(d));
    }
    res.json({ success: true, data: created, message: `Seeded ${created.length} workflow definitions` });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.use('/api', r);

// Health
app.get('/health', async (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  const redisOk = redis.status === 'ready';
  const ok = mongoOk && redisOk;
  res.status(ok ? 200 : 503).json({ status: ok ? 'healthy' : 'degraded', mongo: mongoOk, redis: redisOk, uptime: process.uptime() });
});

/* ───────── Cron: SLA check every 15 min ───────── */
cron.schedule('*/15 * * * *', async () => {
  await workflowQueue.add('check-sla', {});
});

// Expire delegations daily
cron.schedule('0 0 * * *', async () => {
  await Delegation.updateMany({ endDate: { $lt: new Date() }, isActive: true }, { $set: { isActive: false } });
});

/* ───────── Start ───────── */
const PORT = process.env.PORT || 3350;
const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://mongodb:27017/alawael_workflow';

mongoose
  .connect(MONGO)
  .then(() => {
    console.log('[WorkflowEngine] MongoDB connected');
    app.listen(PORT, '0.0.0.0', () => console.log(`[WorkflowEngine] listening on ${PORT}`));
  })
  .catch(err => {
    console.error('[WorkflowEngine] Mongo error', err);
    process.exit(1);
  });

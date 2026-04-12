'use strict';
/**
 * ═══════════════════════════════════════════════════════════════
 *  DDD Workflow Engine — Phase 15 (1/4)
 *  State machines, triggers, automatic transitions, SLA tracking
 * ═══════════════════════════════════════════════════════════════
 */

const { WORKFLOW_TYPES, WORKFLOW_STATUSES, TRIGGER_TYPES, ACTION_TYPES, SLA_PRIORITIES, BUILTIN_WORKFLOWS } = require('../models/DddWorkflowEngine');

const BaseCrudService = require('./base/BaseCrudService');

class WorkflowEngineService extends BaseCrudService {
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

  async createDefinition(data) { return this._create(DDDWorkflowDefinition, data); }

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

module.exports = new WorkflowEngineService();

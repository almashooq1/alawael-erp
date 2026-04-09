/**
 * Workflow Orchestration Service — خدمة تنسيق سير العمل المتقدم
 * Phase 9 — تدفقات BPMN، تنسيق متعدد العمليات، أحداث وشروط
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

/* ─── Schemas ────────────────────────────────────────────── */
const workflowNodeSchema = new mongoose.Schema({
  nodeId: { type: String, required: true },
  type: {
    type: String,
    enum: [
      'start',
      'end',
      'task',
      'decision',
      'parallel_gateway',
      'merge_gateway',
      'timer',
      'signal',
      'subprocess',
      'service_task',
      'user_task',
      'script_task',
    ],
    required: true,
  },
  name: String,
  nameAr: String,
  position: { x: Number, y: Number },
  config: {
    assignee: String,
    assigneeType: { type: String, enum: ['user', 'role', 'department', 'group', 'auto'] },
    dueHours: Number,
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'] },
    form: String, // form template ID
    script: String, // for script tasks
    serviceUrl: String, // for service tasks
    subprocessId: String,
    timerDuration: String, // ISO 8601
    signalName: String,
    retryCount: { type: Number, default: 0 },
    retryDelay: { type: Number, default: 300 }, // seconds
  },
  conditions: [
    {
      field: String,
      operator: {
        type: String,
        enum: ['equals', 'not_equals', 'gt', 'lt', 'gte', 'lte', 'contains', 'in', 'not_in'],
      },
      value: mongoose.Schema.Types.Mixed,
      targetNodeId: String,
    },
  ],
  metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
});

const workflowEdgeSchema = new mongoose.Schema({
  edgeId: { type: String, required: true },
  sourceNodeId: { type: String, required: true },
  targetNodeId: { type: String, required: true },
  label: String,
  condition: String,
  priority: { type: Number, default: 0 },
});

const workflowDefinitionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String },
    description: String,
    version: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['draft', 'active', 'suspended', 'deprecated'],
      default: 'draft',
    },
    category: { type: String, default: 'عام' },
    nodes: [workflowNodeSchema],
    edges: [workflowEdgeSchema],
    variables: [
      {
        name: String,
        type: { type: String, enum: ['string', 'number', 'boolean', 'date', 'object', 'array'] },
        defaultValue: mongoose.Schema.Types.Mixed,
        required: Boolean,
      },
    ],
    triggers: [
      {
        type: {
          type: String,
          enum: ['manual', 'document_created', 'document_updated', 'schedule', 'signal', 'api'],
        },
        config: { type: Map, of: mongoose.Schema.Types.Mixed },
      },
    ],
    sla: {
      maxDurationHours: Number,
      warningHours: Number,
      escalationPolicy: String,
    },
    permissions: {
      canStart: [String],
      canMonitor: [String],
      canAbort: [String],
    },
    usageStats: {
      executions: { type: Number, default: 0 },
      completions: { type: Number, default: 0 },
      avgDuration: Number,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'workflow_definitions' }
);

const workflowInstanceSchema = new mongoose.Schema(
  {
    definitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkflowDefinition',
      required: true,
    },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed', 'suspended', 'cancelled', 'waiting'],
      default: 'running',
    },
    currentNodes: [{ nodeId: String, enteredAt: Date, status: String }],
    variables: { type: Map, of: mongoose.Schema.Types.Mixed },
    history: [
      {
        nodeId: String,
        nodeName: String,
        action: String,
        enteredAt: Date,
        exitedAt: Date,
        duration: Number,
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        data: { type: Map, of: mongoose.Schema.Types.Mixed },
        error: String,
      },
    ],
    result: { type: Map, of: mongoose.Schema.Types.Mixed },
    error: String,
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
    dueAt: Date,
    slaStatus: { type: String, enum: ['on_track', 'warning', 'breached'], default: 'on_track' },
    parentInstanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowInstance' },
    startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'workflow_instances' }
);

workflowDefinitionSchema.index({ status: 1, category: 1 });
workflowInstanceSchema.index({ definitionId: 1, status: 1 });
workflowInstanceSchema.index({ documentId: 1 });
workflowInstanceSchema.index({ startedBy: 1, status: 1 });

const WorkflowDefinition =
  mongoose.models.WorkflowDefinition ||
  mongoose.model('WorkflowDefinition', workflowDefinitionSchema);
const WorkflowInstance =
  mongoose.models.WorkflowInstance || mongoose.model('WorkflowInstance', workflowInstanceSchema);

/* ─── Service ────────────────────────────────────────────── */
class WorkflowOrchestrationService {
  /* ── Definitions ──────────────────── */
  async createDefinition(data, userId) {
    const def = new WorkflowDefinition({ ...data, createdBy: userId });
    if (!def.nodes?.length) {
      def.nodes = [
        {
          nodeId: 'start_1',
          type: 'start',
          name: 'بداية',
          nameAr: 'بداية',
          position: { x: 100, y: 200 },
        },
        {
          nodeId: 'end_1',
          type: 'end',
          name: 'نهاية',
          nameAr: 'نهاية',
          position: { x: 700, y: 200 },
        },
      ];
      def.edges = [{ edgeId: 'e_1', sourceNodeId: 'start_1', targetNodeId: 'end_1' }];
    }
    await def.save();
    return def;
  }

  async updateDefinition(defId, data, userId) {
    const def = await WorkflowDefinition.findById(defId);
    if (!def) throw new Error('التعريف غير موجود');
    Object.assign(def, data, { updatedBy: userId });
    def.version += 1;
    await def.save();
    return def;
  }

  async activateDefinition(defId, userId) {
    return this.updateDefinition(defId, { status: 'active' }, userId);
  }

  async getDefinitions(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.category) query.category = filters.category;
    return WorkflowDefinition.find(query).sort('-createdAt').lean();
  }

  async getDefinition(defId) {
    const d = await WorkflowDefinition.findById(defId).lean();
    if (!d) throw new Error('التعريف غير موجود');
    return d;
  }

  async cloneDefinition(defId, userId) {
    const src = await WorkflowDefinition.findById(defId).lean();
    if (!src) throw new Error('التعريف غير موجود');
    delete src._id;
    src.name += ' (نسخة)';
    src.nameAr = (src.nameAr || '') + ' (نسخة)';
    src.status = 'draft';
    src.version = 1;
    src.createdBy = userId;
    return new WorkflowDefinition(src).save();
  }

  async deleteDefinition(defId) {
    const active = await WorkflowInstance.countDocuments({
      definitionId: defId,
      status: { $in: ['running', 'waiting'] },
    });
    if (active > 0) throw new Error('يوجد تنفيذات نشطة');
    return WorkflowDefinition.findByIdAndDelete(defId);
  }

  async validateDefinition(defId) {
    const def = await WorkflowDefinition.findById(defId);
    if (!def) throw new Error('التعريف غير موجود');

    const issues = [];
    const startNodes = def.nodes.filter(n => n.type === 'start');
    const endNodes = def.nodes.filter(n => n.type === 'end');
    if (startNodes.length !== 1)
      issues.push({
        severity: 'error',
        message: `يجب أن يحتوي على نقطة بداية واحدة (وُجد ${startNodes.length})`,
      });
    if (endNodes.length < 1)
      issues.push({ severity: 'error', message: 'يجب أن يحتوي على نقطة نهاية واحدة على الأقل' });

    const nodeIds = new Set(def.nodes.map(n => n.nodeId));
    for (const e of def.edges) {
      if (!nodeIds.has(e.sourceNodeId))
        issues.push({
          severity: 'error',
          message: `حافة ${e.edgeId}: المصدر ${e.sourceNodeId} غير موجود`,
        });
      if (!nodeIds.has(e.targetNodeId))
        issues.push({
          severity: 'error',
          message: `حافة ${e.edgeId}: الهدف ${e.targetNodeId} غير موجود`,
        });
    }

    // orphan nodes
    for (const n of def.nodes) {
      if (n.type === 'start') continue;
      const hasIncoming = def.edges.some(e => e.targetNodeId === n.nodeId);
      if (!hasIncoming)
        issues.push({
          severity: 'warning',
          message: `العقدة ${n.nameAr || n.name}: لا يوجد اتصال وارد`,
        });
    }

    return { valid: !issues.some(i => i.severity === 'error'), issues };
  }

  /* ── Execution ────────────────────── */
  async startInstance(defId, params, userId) {
    const def = await WorkflowDefinition.findById(defId);
    if (!def || def.status !== 'active') throw new Error('التعريف غير نشط');

    const startNode = def.nodes.find(n => n.type === 'start');
    if (!startNode) throw new Error('لا توجد نقطة بداية');

    const variables = new Map();
    for (const v of def.variables || []) {
      variables.set(v.name, params?.variables?.[v.name] ?? v.defaultValue);
    }

    const instance = new WorkflowInstance({
      definitionId: defId,
      documentId: params?.documentId,
      startedBy: userId,
      currentNodes: [{ nodeId: startNode.nodeId, enteredAt: new Date(), status: 'active' }],
      variables,
      dueAt: def.sla?.maxDurationHours
        ? new Date(Date.now() + def.sla.maxDurationHours * 3600000)
        : null,
      history: [
        {
          nodeId: startNode.nodeId,
          nodeName: startNode.nameAr || startNode.name,
          action: 'entered',
          enteredAt: new Date(),
        },
      ],
    });
    await instance.save();

    def.usageStats.executions += 1;
    await def.save();

    // auto advance from start
    await this._advanceInstance(instance, def, startNode.nodeId, userId);
    return WorkflowInstance.findById(instance._id).lean();
  }

  async _advanceInstance(instance, def, fromNodeId, userId, data = {}) {
    const outEdges = def.edges
      .filter(e => e.sourceNodeId === fromNodeId)
      .sort((a, b) => b.priority - a.priority);
    if (!outEdges.length) return;

    // close current node
    instance.currentNodes = instance.currentNodes.filter(n => n.nodeId !== fromNodeId);
    const histEntry = instance.history.find(h => h.nodeId === fromNodeId && !h.exitedAt);
    if (histEntry) {
      histEntry.exitedAt = new Date();
      histEntry.duration = Date.now() - new Date(histEntry.enteredAt).getTime();
    }

    for (const edge of outEdges) {
      const targetNode = def.nodes.find(n => n.nodeId === edge.targetNodeId);
      if (!targetNode) continue;

      instance.currentNodes.push({
        nodeId: targetNode.nodeId,
        enteredAt: new Date(),
        status: 'active',
      });
      instance.history.push({
        nodeId: targetNode.nodeId,
        nodeName: targetNode.nameAr || targetNode.name,
        action: 'entered',
        enteredAt: new Date(),
        userId,
        data,
      });

      if (targetNode.type === 'end') {
        instance.status = 'completed';
        instance.completedAt = new Date();
        await WorkflowDefinition.findByIdAndUpdate(def._id, {
          $inc: { 'usageStats.completions': 1 },
        });
      }

      // only follow first edge for non-parallel gateways
      if (targetNode.type !== 'parallel_gateway') break;
    }
    await instance.save();
  }

  async completeTask(instanceId, nodeId, userId, data = {}) {
    const instance = await WorkflowInstance.findById(instanceId);
    if (!instance || instance.status !== 'running') throw new Error('التنفيذ غير نشط');

    const current = instance.currentNodes.find(n => n.nodeId === nodeId);
    if (!current) throw new Error('المهمة غير موجودة في التنفيذ الحالي');

    const def = await WorkflowDefinition.findById(instance.definitionId);
    if (data.variables) {
      for (const [k, v] of Object.entries(data.variables)) instance.variables.set(k, v);
    }

    await this._advanceInstance(instance, def, nodeId, userId, data);
    return WorkflowInstance.findById(instanceId).lean();
  }

  async suspendInstance(instanceId, userId, reason = '') {
    const inst = await WorkflowInstance.findById(instanceId);
    if (!inst) throw new Error('التنفيذ غير موجود');
    inst.status = 'suspended';
    inst.history.push({
      nodeId: 'system',
      action: 'suspended',
      enteredAt: new Date(),
      userId,
      data: new Map([['reason', reason]]),
    });
    await inst.save();
    return inst;
  }

  async resumeInstance(instanceId, userId) {
    const inst = await WorkflowInstance.findById(instanceId);
    if (!inst || inst.status !== 'suspended') throw new Error('التنفيذ غير معلق');
    inst.status = 'running';
    inst.history.push({ nodeId: 'system', action: 'resumed', enteredAt: new Date(), userId });
    await inst.save();
    return inst;
  }

  async cancelInstance(instanceId, userId, reason = '') {
    const inst = await WorkflowInstance.findById(instanceId);
    if (!inst) throw new Error('التنفيذ غير موجود');
    inst.status = 'cancelled';
    inst.completedAt = new Date();
    inst.history.push({
      nodeId: 'system',
      action: 'cancelled',
      enteredAt: new Date(),
      userId,
      data: new Map([['reason', reason]]),
    });
    await inst.save();
    return inst;
  }

  async retryNode(instanceId, nodeId, userId) {
    const inst = await WorkflowInstance.findById(instanceId);
    if (!inst) throw new Error('التنفيذ غير موجود');
    const node = inst.currentNodes.find(n => n.nodeId === nodeId);
    if (!node) throw new Error('العقدة غير موجودة');
    node.status = 'active';
    node.enteredAt = new Date();
    inst.history.push({ nodeId, action: 'retried', enteredAt: new Date(), userId });
    await inst.save();
    return inst;
  }

  /* ── Queries ──────────────────────── */
  async getInstances(filters = {}) {
    const query = {};
    if (filters.definitionId) query.definitionId = filters.definitionId;
    if (filters.status) query.status = filters.status;
    if (filters.startedBy) query.startedBy = filters.startedBy;
    if (filters.documentId) query.documentId = filters.documentId;
    return WorkflowInstance.find(query)
      .populate('definitionId', 'name nameAr')
      .populate('startedBy', 'name')
      .sort('-createdAt')
      .limit(filters.limit || 50)
      .lean();
  }

  async getInstance(instanceId) {
    return WorkflowInstance.findById(instanceId)
      .populate('definitionId')
      .populate('startedBy', 'name email')
      .lean();
  }

  async getMyTasks(userId) {
    const instances = await WorkflowInstance.find({ status: 'running' })
      .populate('definitionId')
      .lean();
    const tasks = [];
    for (const inst of instances) {
      for (const cn of inst.currentNodes) {
        const nodeDef = inst.definitionId?.nodes?.find(n => n.nodeId === cn.nodeId);
        if (
          nodeDef?.config?.assignee === String(userId) ||
          nodeDef?.config?.assigneeType === 'auto'
        ) {
          tasks.push({
            instanceId: inst._id,
            nodeId: cn.nodeId,
            nodeName: nodeDef.nameAr || nodeDef.name,
            workflowName: inst.definitionId?.nameAr,
            documentId: inst.documentId,
            enteredAt: cn.enteredAt,
            dueAt: inst.dueAt,
            priority: nodeDef.config?.priority,
          });
        }
      }
    }
    return tasks;
  }

  /* ── Stats ────────────────────────── */
  async getStats() {
    const [definitions, instances, running, completed] = await Promise.all([
      WorkflowDefinition.countDocuments(),
      WorkflowInstance.countDocuments(),
      WorkflowInstance.countDocuments({ status: 'running' }),
      WorkflowInstance.countDocuments({ status: 'completed' }),
    ]);

    const avgDuration = await WorkflowInstance.aggregate([
      { $match: { status: 'completed', completedAt: { $exists: true } } },
      { $project: { duration: { $subtract: ['$completedAt', '$startedAt'] } } },
      { $group: { _id: null, avg: { $avg: '$duration' } } },
    ]);

    const byStatus = await WorkflowInstance.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    return {
      totalDefinitions: definitions,
      totalInstances: instances,
      running,
      completed,
      avgDurationMinutes: avgDuration[0]?.avg ? Math.round(avgDuration[0].avg / 60000) : 0,
      byStatus,
    };
  }
}

module.exports = new WorkflowOrchestrationService();

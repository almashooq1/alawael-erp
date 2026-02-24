/**
 * Intelligent Workflow Engine - Professional & Comprehensive
 * محرك سير العمل الذكي - احترافي وشامل
 * 
 * Features:
 * - Workflow Definition & Management
 * - Task Automation & Routing
 * - Approval Workflows
 * - SLA Management
 * - Intelligent Assignment
 * - Process Analytics
 * - Integration Hooks
 * - Audit Trail
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ============================================
// SCHEMAS
// ============================================

// Workflow Definition Schema
const WorkflowDefinitionSchema = new Schema({
  name: { type: String, required: true },
  nameAr: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  description: { type: String },
  category: {
    type: String,
    enum: ['approval', 'request', 'incident', 'change', 'project', 'custom'],
    default: 'custom'
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'active', 'deprecated', 'archived'],
    default: 'draft'
  },
  
  // Version
  version: { type: Number, default: 1 },
  
  // Trigger Configuration
  trigger: {
    type: { type: String, enum: ['manual', 'automatic', 'scheduled', 'event'] },
    conditions: [{
      field: String,
      operator: { type: String, enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'in'] },
      value: Schema.Types.Mixed,
    }],
    schedule: {
      frequency: { type: String, enum: ['once', 'daily', 'weekly', 'monthly'] },
      startDate: Date,
      endDate: Date,
      cron: String, // For complex schedules
    },
  },
  
  // Workflow Steps
  steps: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    nameAr: { type: String, required: true },
    type: {
      type: String,
      enum: ['start', 'end', 'task', 'approval', 'notification', 'condition', 'parallel', 'subprocess', 'integration'],
      required: true
    },
    
    // Assignment Configuration
    assignment: {
      type: { type: String, enum: ['user', 'role', 'group', 'manager', 'previous_assignee', 'formula'] },
      assignee: String,
      roleId: Schema.Types.ObjectId,
      groupId: Schema.Types.ObjectId,
      formula: String, // Dynamic assignment formula
    },
    
    // SLA Configuration
    sla: {
      enabled: { type: Boolean, default: false },
      duration: { type: Number, default: 0 }, // in minutes
      escalateAfter: { type: Number, default: 0 },
      escalateTo: Schema.Types.ObjectId,
    },
    
    // Task Configuration
    taskConfig: {
      priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
      dueDate: {
        type: { type: String, enum: ['fixed', 'relative'] },
        value: Number, // days or specific date
      },
      requireAttachment: { type: Boolean, default: false },
      requireComment: { type: Boolean, default: false },
      actions: [{
        id: String,
        label: String,
        labelAr: String,
        type: { type: String, enum: ['approve', 'reject', 'return', 'delegate', 'custom'] },
        nextStep: String, // Step ID to go to
      }],
    },
    
    // Notification Configuration
    notifications: [{
      type: { type: String, enum: ['email', 'sms', 'push', 'in_app'] },
      template: String,
      recipients: [{ type: String, enum: ['assignee', 'requester', 'manager', 'custom'] }],
      customRecipients: [String],
    }],
    
    // Condition Configuration (for condition type)
    conditions: [{
      id: String,
      field: String,
      operator: String,
      value: Schema.Types.Mixed,
      nextStep: String,
    }],
    defaultNextStep: String,
    
    // Integration Configuration
    integration: {
      type: { type: String, enum: ['api', 'webhook', 'database', 'email', 'sms'] },
      endpoint: String,
      method: String,
      headers: Schema.Types.Mixed,
      body: Schema.Types.Mixed,
      retryCount: { type: Number, default: 3 },
      retryDelay: { type: Number, default: 5000 },
    },
    
    // Transitions
    nextSteps: [String], // Array of next step IDs
    
    // Position for visual editor
    position: { x: Number, y: Number },
  }],
  
  // Variables
  variables: [{
    name: String,
    type: { type: String, enum: ['string', 'number', 'boolean', 'date', 'array', 'object'] },
    defaultValue: Schema.Types.Mixed,
    required: { type: Boolean, default: false },
  }],
  
  // Permissions
  permissions: {
    canStart: [{ type: String }], // Roles that can start
    canView: [{ type: String }], // Roles that can view
    canAdmin: [{ type: String }], // Roles that can admin
  },
  
  // Settings
  settings: {
    allowReassignment: { type: Boolean, default: true },
    allowDelegation: { type: Boolean, default: true },
    allowCancellation: { type: Boolean, default: true },
    allowRestart: { type: Boolean, default: false },
    autoAssign: { type: Boolean, default: true },
    notifyOnComplete: { type: Boolean, default: true },
    notifyOnError: { type: Boolean, default: true },
  },
  
  // Audit
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  publishedAt: { type: Date },
  publishedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Workflow Instance Schema (Running Workflow)
const WorkflowInstanceSchema = new Schema({
  definition: { type: Schema.Types.ObjectId, ref: 'WorkflowDefinition', required: true },
  definitionVersion: { type: Number, required: true },
  
  // Instance Info
  title: { type: String, required: true },
  description: { type: String },
  businessKey: { type: String }, // Reference to business entity (e.g., request ID)
  
  // Status
  status: {
    type: String,
    enum: ['running', 'completed', 'cancelled', 'error', 'suspended'],
    default: 'running'
  },
  
  // Requester
  requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Current State
  currentStep: { type: String },
  currentAssignee: { type: Schema.Types.ObjectId, ref: 'User' },
  
  // Variables (Instance Data)
  variables: { type: Map, of: Schema.Types.Mixed },
  
  // Timeline
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  dueDate: { type: Date },
  
  // SLA
  sla: {
    duration: { type: Number }, // Total SLA in minutes
    deadline: { type: Date },
    violated: { type: Boolean, default: false },
    violatedAt: { type: Date },
  },
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Tags
  tags: [String],
  
  // Parent Instance (for sub-workflows)
  parentInstance: { type: Schema.Types.ObjectId, ref: 'WorkflowInstance' },
  
}, { timestamps: true });

// Task Instance Schema
const TaskInstanceSchema = new Schema({
  workflowInstance: { type: Schema.Types.ObjectId, ref: 'WorkflowInstance', required: true },
  stepId: { type: String, required: true },
  
  // Task Info
  name: { type: String, required: true },
  nameAr: { type: String, required: true },
  description: { type: String },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in_progress', 'completed', 'cancelled', 'skipped', 'error'],
    default: 'pending'
  },
  
  // Assignment
  assignee: { type: Schema.Types.ObjectId, ref: 'User' },
  assigneeRole: { type: Schema.Types.ObjectId, ref: 'Role' },
  assigneeGroup: { type: Schema.Types.ObjectId, ref: 'Group' },
  delegatedFrom: { type: Schema.Types.ObjectId, ref: 'User' },
  
  // Actions
  action: {
    type: { type: String },
    comment: { type: String },
    attachments: [{
      name: String,
      url: String,
      uploadedAt: { type: Date, default: Date.now },
    }],
    performedAt: { type: Date },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  
  // SLA
  sla: {
    duration: { type: Number },
    deadline: { type: Date },
    violated: { type: Boolean, default: false },
    violatedAt: { type: Date },
    escalated: { type: Boolean, default: false },
    escalatedAt: { type: Date },
    escalatedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  
  // Timeline
  createdAt: { type: Date, default: Date.now },
  assignedAt: { type: Date },
  startedAt: { type: Date },
  completedAt: { type: Date },
  
  // Retry (for integration tasks)
  retries: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  lastError: { type: String },
  
}, { timestamps: true });

// Workflow Audit Log Schema
const WorkflowAuditLogSchema = new Schema({
  workflowInstance: { type: Schema.Types.ObjectId, ref: 'WorkflowInstance' },
  taskInstance: { type: Schema.Types.ObjectId, ref: 'TaskInstance' },
  
  action: {
    type: String,
    enum: ['start', 'complete', 'cancel', 'assign', 'reassign', 'delegate', 'escalate', 'error', 'skip', 'restart'],
    required: true
  },
  
  fromStep: { type: String },
  toStep: { type: String },
  fromAssignee: { type: Schema.Types.ObjectId, ref: 'User' },
  toAssignee: { type: Schema.Types.ObjectId, ref: 'User' },
  
  comment: { type: String },
  data: { type: Map, of: Schema.Types.Mixed },
  
  performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  performedAt: { type: Date, default: Date.now },
  
  ipAddress: { type: String },
  userAgent: { type: String },
});

// ============================================
// MODELS
// ============================================

const WorkflowDefinition = mongoose.model('WorkflowDefinition', WorkflowDefinitionSchema);
const WorkflowInstance = mongoose.model('WorkflowInstance', WorkflowInstanceSchema);
const TaskInstance = mongoose.model('TaskInstance', TaskInstanceSchema);
const WorkflowAuditLog = mongoose.model('WorkflowAuditLog', WorkflowAuditLogSchema);

// ============================================
// INTELLIGENT WORKFLOW ENGINE CLASS
// ============================================

class IntelligentWorkflowEngine {
  
  // ================================
  // WORKFLOW DEFINITION MANAGEMENT
  // ================================
  
  /**
   * Create workflow definition
   */
  async createWorkflow(definitionData) {
    const workflow = new WorkflowDefinition(definitionData);
    await workflow.save();
    return workflow;
  }
  
  /**
   * Publish workflow definition
   */
  async publishWorkflow(workflowId, userId) {
    const workflow = await WorkflowDefinition.findById(workflowId);
    if (!workflow) throw new Error('سير العمل غير موجود');
    
    workflow.status = 'active';
    workflow.publishedAt = new Date();
    workflow.publishedBy = userId;
    
    await workflow.save();
    return workflow;
  }
  
  /**
   * Get active workflow definitions
   */
  async getActiveWorkflows(category = null) {
    const query = { status: 'active' };
    if (category) query.category = category;
    return WorkflowDefinition.find(query).sort({ createdAt: -1 });
  }
  
  // ================================
  // WORKFLOW EXECUTION
  // ================================
  
  /**
   * Start workflow instance
   */
  async startWorkflow(workflowCode, requesterId, variables = {}, title = null) {
    const definition = await WorkflowDefinition.findOne({ code: workflowCode, status: 'active' });
    if (!definition) throw new Error('سير العمل غير موجود أو غير مفعل');
    
    // Find start step
    const startStep = definition.steps.find(s => s.type === 'start');
    if (!startStep) throw new Error('خطأ في تكوين سير العمل - لا يوجد نقطة بداية');
    
    // Create workflow instance
    const instance = new WorkflowInstance({
      definition: definition._id,
      definitionVersion: definition.version,
      title: title || `${definition.nameAr} - ${new Date().toLocaleDateString('ar-SA')}`,
      requester: requesterId,
      currentStep: startStep.id,
      variables: new Map(Object.entries(variables)),
      status: 'running',
    });
    
    await instance.save();
    
    // Create audit log
    await this.createAuditLog({
      workflowInstance: instance._id,
      action: 'start',
      fromStep: null,
      toStep: startStep.id,
      performedBy: requesterId,
    });
    
    // Process next steps
    await this.processStep(instance, startStep, definition);
    
    return instance;
  }
  
  /**
   * Process workflow step
   */
  async processStep(instance, step, definition) {
    switch (step.type) {
      case 'start':
        await this.moveToNextStep(instance, step, definition);
        break;
        
      case 'task':
      case 'approval':
        await this.createTask(instance, step, definition);
        break;
        
      case 'notification':
        await this.sendNotifications(instance, step);
        await this.moveToNextStep(instance, step, definition);
        break;
        
      case 'condition':
        const nextStepId = this.evaluateCondition(instance, step);
        await this.goToStep(instance, nextStepId, definition);
        break;
        
      case 'integration':
        await this.executeIntegration(instance, step, definition);
        break;
        
      case 'parallel':
        await this.executeParallel(instance, step, definition);
        break;
        
      case 'end':
        await this.completeWorkflow(instance);
        break;
    }
  }
  
  /**
   * Create task instance
   */
  async createTask(instance, step, definition) {
    // Determine assignee
    let assignee = await this.resolveAssignee(instance, step, definition);
    
    const task = new TaskInstance({
      workflowInstance: instance._id,
      stepId: step.id,
      name: step.name,
      nameAr: step.nameAr,
      assignee: assignee,
      status: assignee ? 'assigned' : 'pending',
      assignedAt: assignee ? new Date() : null,
      sla: {
        duration: step.sla?.duration || 0,
        deadline: step.sla?.duration ? new Date(Date.now() + step.sla.duration * 60000) : null,
      },
    });
    
    await task.save();
    
    // Update instance
    instance.currentAssignee = assignee;
    await instance.save();
    
    // Send notification
    if (assignee) {
      await this.notifyAssignee(task, step);
    }
    
    return task;
  }
  
  /**
   * Resolve task assignee
   */
  async resolveAssignee(instance, step, definition) {
    const assignment = step.assignment;
    
    switch (assignment.type) {
      case 'user':
        return assignment.assignee;
        
      case 'role':
        // Find user with role (implement based on your user/role system)
        return this.findUserByRole(assignment.roleId);
        
      case 'group':
        return this.findUserFromGroup(assignment.groupId);
        
      case 'manager':
        return this.getUserManager(instance.requester);
        
      case 'previous_assignee':
        // Get previous task assignee
        const previousTask = await TaskInstance.findOne({
          workflowInstance: instance._id,
          status: 'completed',
        }).sort({ completedAt: -1 });
        return previousTask?.action?.performedBy;
        
      case 'formula':
        return this.evaluateFormula(instance, assignment.formula);
        
      default:
        return null;
    }
  }
  
  /**
   * Complete task
   */
  async completeTask(taskId, action, userId, comment = '', attachments = []) {
    const task = await TaskInstance.findById(taskId).populate('workflowInstance');
    if (!task) throw new Error('المهمة غير موجودة');
    
    if (task.status !== 'assigned' && task.status !== 'in_progress') {
      throw new Error('لا يمكن إتمام هذه المهمة في حالتها الحالية');
    }
    
    const instance = task.workflowInstance;
    const definition = await WorkflowDefinition.findById(instance.definition);
    const step = definition.steps.find(s => s.id === task.stepId);
    
    // Update task
    task.status = 'completed';
    task.action = {
      type: action,
      comment,
      attachments,
      performedAt: new Date(),
      performedBy: userId,
    };
    task.completedAt = new Date();
    
    await task.save();
    
    // Create audit log
    await this.createAuditLog({
      workflowInstance: instance._id,
      taskInstance: task._id,
      action: 'complete',
      fromStep: step.id,
      performedBy: userId,
      comment,
    });
    
    // Update instance variables
    instance.variables.set('lastAction', action);
    instance.variables.set('lastActionBy', userId.toString());
    instance.variables.set('lastActionAt', new Date().toISOString());
    await instance.save();
    
    // Find next step based on action
    const actionConfig = step.taskConfig?.actions?.find(a => a.id === action);
    const nextStepId = actionConfig?.nextStep || this.findNextStep(instance, step, definition);
    
    // Move to next step
    if (nextStepId) {
      const nextStep = definition.steps.find(s => s.id === nextStepId);
      await this.processStep(instance, nextStep, definition);
    }
    
    return task;
  }
  
  /**
   * Reassign task
   */
  async reassignTask(taskId, newAssigneeId, userId, reason = '') {
    const task = await TaskInstance.findById(taskId);
    if (!task) throw new Error('المهمة غير موجودة');
    
    const oldAssignee = task.assignee;
    
    task.assignee = newAssigneeId;
    task.delegatedFrom = oldAssignee;
    task.assignedAt = new Date();
    
    await task.save();
    
    // Create audit log
    await this.createAuditLog({
      workflowInstance: task.workflowInstance,
      taskInstance: task._id,
      action: 'reassign',
      fromAssignee: oldAssignee,
      toAssignee: newAssigneeId,
      performedBy: userId,
      comment: reason,
    });
    
    return task;
  }
  
  /**
   * Complete workflow instance
   */
  async completeWorkflow(instance) {
    instance.status = 'completed';
    instance.completedAt = new Date();
    
    // Calculate SLA
    const duration = (instance.completedAt - instance.startedAt) / 60000; // minutes
    instance.sla.duration = duration;
    instance.sla.violated = instance.sla.deadline && instance.completedAt > instance.sla.deadline;
    
    await instance.save();
    
    // Create audit log
    await this.createAuditLog({
      workflowInstance: instance._id,
      action: 'complete',
      performedBy: instance.requester,
    });
    
    // Send completion notification
    await this.sendCompletionNotification(instance);
    
    return instance;
  }
  
  /**
   * Cancel workflow instance
   */
  async cancelWorkflow(instanceId, userId, reason = '') {
    const instance = await WorkflowInstance.findById(instanceId);
    if (!instance) throw new Error('سير العمل غير موجود');
    
    if (instance.status !== 'running') {
      throw new Error('لا يمكن إلغاء سير العمل في حالته الحالية');
    }
    
    instance.status = 'cancelled';
    instance.completedAt = new Date();
    
    await instance.save();
    
    // Cancel pending tasks
    await TaskInstance.updateMany(
      { workflowInstance: instanceId, status: { $in: ['pending', 'assigned', 'in_progress'] } },
      { status: 'cancelled' }
    );
    
    // Create audit log
    await this.createAuditLog({
      workflowInstance: instance._id,
      action: 'cancel',
      performedBy: userId,
      comment: reason,
    });
    
    return instance;
  }
  
  // ================================
  // TASK QUERIES
  // ================================
  
  /**
   * Get user tasks
   */
  async getUserTasks(userId, status = null) {
    const query = {
      assignee: userId,
      status: { $in: ['assigned', 'in_progress'] }
    };
    
    if (status) query.status = status;
    
    return TaskInstance.find(query)
      .populate('workflowInstance')
      .sort({ createdAt: -1 });
  }
  
  /**
   * Get pending approvals count
   */
  async getPendingApprovalsCount(userId) {
    return TaskInstance.countDocuments({
      assignee: userId,
      status: { $in: ['assigned', 'in_progress'] },
    });
  }
  
  /**
   * Get overdue tasks
   */
  async getOverdueTasks() {
    return TaskInstance.find({
      status: { $in: ['assigned', 'in_progress'] },
      'sla.deadline': { $lt: new Date() },
      'sla.violated': false,
    }).populate('workflowInstance');
  }
  
  // ================================
  // SLA MANAGEMENT
  // ================================
  
  /**
   * Check SLA violations
   */
  async checkSLAViolations() {
    const now = new Date();
    
    // Check task SLAs
    const overdueTasks = await TaskInstance.find({
      status: { $in: ['assigned', 'in_progress'] },
      'sla.deadline': { $lt: now },
      'sla.violated': false,
    });
    
    for (const task of overdueTasks) {
      task.sla.violated = true;
      task.sla.violatedAt = now;
      await task.save();
      
      // Escalate if configured
      await this.escalateTask(task);
    }
    
    // Check workflow SLAs
    const overdueWorkflows = await WorkflowInstance.find({
      status: 'running',
      'sla.deadline': { $lt: now },
      'sla.violated': false,
    });
    
    for (const instance of overdueWorkflows) {
      instance.sla.violated = true;
      instance.sla.violatedAt = now;
      await instance.save();
    }
    
    return { overdueTasks: overdueTasks.length, overdueWorkflows: overdueWorkflows.length };
  }
  
  /**
   * Escalate overdue task
   */
  async escalateTask(task) {
    const instance = await WorkflowInstance.findById(task.workflowInstance);
    const definition = await WorkflowDefinition.findById(instance.definition);
    const step = definition.steps.find(s => s.id === task.stepId);
    
    if (step?.sla?.escalateTo) {
      const oldAssignee = task.assignee;
      task.assignee = step.sla.escalateTo;
      task.sla.escalated = true;
      task.sla.escalatedAt = new Date();
      task.sla.escalatedTo = step.sla.escalateTo;
      
      await task.save();
      
      await this.createAuditLog({
        workflowInstance: instance._id,
        taskInstance: task._id,
        action: 'escalate',
        fromAssignee: oldAssignee,
        toAssignee: step.sla.escalateTo,
      });
      
      // Notify escalated assignee
      await this.sendEscalationNotification(task);
    }
  }
  
  // ================================
  // ANALYTICS
  // ================================
  
  /**
   * Get workflow statistics
   */
  async getWorkflowStatistics(workflowId = null, startDate = null, endDate = null) {
    const matchStage = {};
    
    if (workflowId) matchStage.definition = mongoose.Types.ObjectId(workflowId);
    if (startDate || endDate) {
      matchStage.startedAt = {};
      if (startDate) matchStage.startedAt.$gte = new Date(startDate);
      if (endDate) matchStage.startedAt.$lte = new Date(endDate);
    }
    
    const stats = await WorkflowInstance.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          running: { $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          avgDuration: { $avg: '$sla.duration' },
          slaViolations: { $sum: { $cond: ['$sla.violated', 1, 0] } },
        },
      },
    ]);
    
    return stats[0] || { total: 0, completed: 0, running: 0, cancelled: 0, avgDuration: 0, slaViolations: 0 };
  }
  
  /**
   * Get task statistics
   */
  async getTaskStatistics(userId = null, startDate = null, endDate = null) {
    const matchStage = {};
    
    if (userId) matchStage.assignee = mongoose.Types.ObjectId(userId);
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }
    
    const stats = await TaskInstance.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $in: ['$status', ['pending', 'assigned']] }, 1, 0] } },
          overdue: { $sum: { $cond: ['$sla.violated', 1, 0] } },
          escalated: { $sum: { $cond: ['$sla.escalated', 1, 0] } },
        },
      },
    ]);
    
    return stats[0] || { total: 0, completed: 0, pending: 0, overdue: 0, escalated: 0 };
  }
  
  // ================================
  // HELPER METHODS
  // ================================
  
  /**
   * Create audit log entry
   */
  async createAuditLog(logData) {
    const log = new WorkflowAuditLog(logData);
    await log.save();
    return log;
  }
  
  /**
   * Move to next step
   */
  async moveToNextStep(instance, currentStep, definition) {
    const nextStepId = this.findNextStep(instance, currentStep, definition);
    if (nextStepId) {
      await this.goToStep(instance, nextStepId, definition);
    }
  }
  
  /**
   * Find next step
   */
  findNextStep(instance, currentStep, definition) {
    if (currentStep.nextSteps && currentStep.nextSteps.length > 0) {
      return currentStep.nextSteps[0];
    }
    
    // Find next sequential step
    const currentIndex = definition.steps.findIndex(s => s.id === currentStep.id);
    if (currentIndex < definition.steps.length - 1) {
      return definition.steps[currentIndex + 1].id;
    }
    
    return null;
  }
  
  /**
   * Go to specific step
   */
  async goToStep(instance, stepId, definition) {
    instance.currentStep = stepId;
    await instance.save();
    
    const step = definition.steps.find(s => s.id === stepId);
    if (step) {
      await this.processStep(instance, step, definition);
    }
  }
  
  /**
   * Evaluate condition
   */
  evaluateCondition(instance, step) {
    const variables = Object.fromEntries(instance.variables);
    
    for (const condition of step.conditions || []) {
      const value = variables[condition.field];
      let result = false;
      
      switch (condition.operator) {
        case 'eq': result = value === condition.value; break;
        case 'ne': result = value !== condition.value; break;
        case 'gt': result = value > condition.value; break;
        case 'gte': result = value >= condition.value; break;
        case 'lt': result = value < condition.value; break;
        case 'lte': result = value <= condition.value; break;
        case 'contains': result = String(value).includes(condition.value); break;
        case 'in': result = condition.value.includes(value); break;
      }
      
      if (result) return condition.nextStep;
    }
    
    return step.defaultNextStep;
  }
  
  /**
   * Execute integration
   */
  async executeIntegration(instance, step, definition) {
    try {
      const config = step.integration;
      
      if (config.type === 'api' || config.type === 'webhook') {
        // Replace variables in body
        const body = JSON.stringify(config.body || {}).replace(/\{\{(\w+)\}\}/g, (match, key) => {
          return instance.variables.get(key) || match;
        });
        
        // Execute HTTP request (implement with your HTTP client)
        // const response = await fetch(config.endpoint, {
        //   method: config.method,
        //   headers: config.headers,
        //   body: body,
        // });
      }
      
      await this.moveToNextStep(instance, step, definition);
    } catch (error) {
      // Log error and retry or fail
      const task = await TaskInstance.findOne({
        workflowInstance: instance._id,
        stepId: step.id,
      });
      
      if (task) {
        task.retries += 1;
        task.lastError = error.message;
        await task.save();
        
        if (task.retries < task.maxRetries) {
          // Retry after delay
          setTimeout(() => this.executeIntegration(instance, step, definition), step.integration.retryDelay);
        }
      }
    }
  }
  
  /**
   * Execute parallel steps
   */
  async executeParallel(instance, step, definition) {
    for (const nextStepId of step.nextSteps || []) {
      const nextStep = definition.steps.find(s => s.id === nextStepId);
      if (nextStep) {
        // Execute each branch (implement with Promise.all for true parallelism)
        await this.processStep(instance, nextStep, definition);
      }
    }
  }
  
  // Placeholder methods - implement based on your system
  async findUserByRole(roleId) { return null; }
  async findUserFromGroup(groupId) { return null; }
  async getUserManager(userId) { return null; }
  async evaluateFormula(instance, formula) { return null; }
  async notifyAssignee(task, step) { return true; }
  async sendNotifications(instance, step) { return true; }
  async sendCompletionNotification(instance) { return true; }
  async sendEscalationNotification(task) { return true; }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  IntelligentWorkflowEngine,
  WorkflowDefinition,
  WorkflowInstance,
  TaskInstance,
  WorkflowAuditLog,
};